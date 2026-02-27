import type { FeatureManifest, StorageAdapter } from "../types";

export interface RemoteAdapterOptions {
  /** Base URL for the feature API (e.g. https://api.example.com/api/features) */
  url: string;
  /** Optional headers applied to all requests */
  headers?: Record<string, string>;
  /** Polling interval in ms for stale-while-revalidate (default: 5 minutes) */
  fetchInterval?: number;
  /** Data format, currently supports 'rest' (default) */
  format?: "rest";
  /** Optional user identifier to pass to state endpoint */
  userId?: string;
  /** Number of retries after the initial request (default: 3) */
  retryAttempts?: number;
  /** Base backoff delay used between retries (default: 250ms) */
  retryBaseDelayMs?: number;
  /** Consecutive failed operations before opening the circuit (default: 5) */
  circuitBreakerThreshold?: number;
  /** Cooldown period while the circuit is open (default: 60s) */
  circuitBreakerCooldownMs?: number;
  /** Optional sleep function override for test environments */
  sleep?: (delayMs: number) => Promise<void>;
  /** Optional timestamp function override for test environments */
  now?: () => number;
}

interface RemoteStateResponse {
  watermark?: string | null;
  dismissedIds?: string[];
}

function assertFetch(): typeof fetch {
  if (typeof fetch === "undefined") {
    throw new Error("RemoteAdapter requires global fetch (Node 18+ or polyfill)");
  }
  return fetch;
}

export class RemoteAdapter implements StorageAdapter {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;
  private readonly fetchInterval: number;
  private readonly userId?: string;
  private dismissedIds: Set<string> = new Set();
  private watermark: string | null = null;
  private lastManifest: FeatureManifest | null = null;
  private lastFetchTs = 0;
  private readonly retryAttempts: number;
  private readonly retryBaseDelayMs: number;
  private readonly circuitBreakerThreshold: number;
  private readonly circuitBreakerCooldownMs: number;
  private readonly sleep: (delayMs: number) => Promise<void>;
  private readonly now: () => number;
  private consecutiveFailures = 0;
  private circuitOpenUntil = 0;

  constructor(options: RemoteAdapterOptions) {
    this.baseUrl = options.url.replace(/\/$/, "");
    this.headers = options.headers ?? {};
    this.fetchInterval = options.fetchInterval ?? 5 * 60 * 1000;
    this.userId = options.userId;
    this.retryAttempts = options.retryAttempts ?? 3;
    this.retryBaseDelayMs = options.retryBaseDelayMs ?? 250;
    this.circuitBreakerThreshold = options.circuitBreakerThreshold ?? 5;
    this.circuitBreakerCooldownMs = options.circuitBreakerCooldownMs ?? 60_000;
    this.sleep = options.sleep ?? ((delayMs: number) => new Promise((resolve) => setTimeout(resolve, delayMs)));
    this.now = options.now ?? (() => Date.now());
  }

  /** Fetch manifest with stale-while-revalidate */
  async fetchManifest(force = false): Promise<FeatureManifest> {
    const now = this.now();
    if (!force && this.lastManifest && now - this.lastFetchTs < this.fetchInterval) {
      return this.lastManifest;
    }

    try {
      const json = await this.withRetry(async () => {
        const fetchImpl = assertFetch();
        const res = await fetchImpl(this.baseUrl, {
          method: "GET",
          headers: this.headers,
        });
        if (!res.ok) throw new Error(`RemoteAdapter manifest fetch failed: ${res.status}`);
        return (await res.json()) as FeatureManifest;
      });
      this.lastManifest = json;
      this.lastFetchTs = now;
      return json;
    } catch {
      // Graceful fallback: stale cache if available, empty manifest otherwise.
      return this.lastManifest ?? [];
    }
  }

  /** Fetch state (watermark + dismissed IDs) */
  async syncState(): Promise<void> {
    try {
      const json = await this.withRetry(async () => {
        const fetchImpl = assertFetch();
        const url = this.userId
          ? `${this.baseUrl}/state?userId=${encodeURIComponent(this.userId)}`
          : `${this.baseUrl}/state`;
        const res = await fetchImpl(url, {
          method: "GET",
          headers: this.headers,
        });
        if (!res.ok) throw new Error(`RemoteAdapter state sync failed: ${res.status}`);
        return (await res.json()) as RemoteStateResponse;
      });

      if (json.watermark !== undefined) this.watermark = json.watermark;
      if (Array.isArray(json.dismissedIds)) this.dismissedIds = new Set(json.dismissedIds);
    } catch {
      // Best effort sync — failures should not crash host apps.
    }
  }

  getWatermark(): string | null {
    return this.watermark;
  }

  getDismissedIds(): ReadonlySet<string> {
    return this.dismissedIds;
  }

  dismiss(id: string): void {
    this.dismissedIds.add(id);
    this.flushDismiss(id).catch(() => {
      /* silent fail */
    });
  }

  async dismissAll(now: Date): Promise<void> {
    this.watermark = now.toISOString();
    this.dismissedIds.clear();
    await this.flushDismissAll(now).catch(() => {});
  }

  /** Returns current adapter health; false while circuit breaker is open. */
  async isHealthy(): Promise<boolean> {
    if (this.isCircuitOpen()) return false;
    try {
      await this.withRetry(async () => {
        const fetchImpl = assertFetch();
        const res = await fetchImpl(this.baseUrl, {
          method: "GET",
          headers: this.headers,
        });
        if (!res.ok) throw new Error(`RemoteAdapter health check failed: ${res.status}`);
      });
      return true;
    } catch {
      return false;
    }
  }

  private async flushDismiss(id: string): Promise<void> {
    await this.withRetry(async () => {
      const fetchImpl = assertFetch();
      const res = await fetchImpl(`${this.baseUrl}/dismiss`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...this.headers },
        body: JSON.stringify({ featureId: id }),
      });
      if (!res.ok) throw new Error(`RemoteAdapter dismiss failed: ${res.status}`);
    });
  }

  private async flushDismissAll(now: Date): Promise<void> {
    await this.withRetry(async () => {
      const fetchImpl = assertFetch();
      const res = await fetchImpl(`${this.baseUrl}/dismiss-all`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...this.headers },
        body: JSON.stringify({ watermark: now.toISOString() }),
      });
      if (!res.ok) throw new Error(`RemoteAdapter dismiss-all failed: ${res.status}`);
    });
  }

  private isCircuitOpen(): boolean {
    return this.now() < this.circuitOpenUntil;
  }

  private markFailure(): void {
    this.consecutiveFailures += 1;
    if (this.consecutiveFailures >= this.circuitBreakerThreshold) {
      this.circuitOpenUntil = this.now() + this.circuitBreakerCooldownMs;
    }
  }

  private markSuccess(): void {
    this.consecutiveFailures = 0;
    this.circuitOpenUntil = 0;
  }

  private async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    if (this.isCircuitOpen()) {
      throw new Error("RemoteAdapter circuit breaker is open");
    }

    let lastError: unknown = new Error("RemoteAdapter request failed");
    for (let attempt = 0; attempt <= this.retryAttempts; attempt++) {
      try {
        const result = await operation();
        this.markSuccess();
        return result;
      } catch (error) {
        lastError = error;
        if (attempt >= this.retryAttempts) break;
        const delayMs = this.retryBaseDelayMs * 2 ** attempt;
        await this.sleep(delayMs);
      }
    }

    this.markFailure();
    throw lastError instanceof Error ? lastError : new Error("RemoteAdapter request failed");
  }
}
