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
  /** Request timeout in milliseconds (default: 10s). */
  requestTimeoutMs?: number;
  /** HTTP statuses that should be retried (default: 408,429,500,502,503,504). */
  retryOnStatuses?: number[];
  /** Debounce window for batching dismiss calls (default: 150ms). */
  dismissBatchWindowMs?: number;
  /** Max ids sent in a single dismiss-batch request (default: 100). */
  maxDismissBatchSize?: number;
  /** Disable `/dismiss-batch` endpoint usage and always send single dismiss requests. */
  disableDismissBatch?: boolean;
  /** Flush/sync pending state when browser regains connectivity (default: false). */
  syncOnOnline?: boolean;
  /** Flush/sync pending state when tab becomes visible again (default: false). */
  syncOnVisibilityChange?: boolean;
  /** Optional periodic state sync interval in ms (default: disabled). */
  syncIntervalMs?: number;
  /** Optional error hook for diagnostics/telemetry. */
  onError?: (error: unknown, context: { operation: string; attempt: number }) => void;
}

interface RemoteStateResponse {
  watermark?: string | null;
  dismissedIds?: string[];
}

class RemoteHttpError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "RemoteHttpError";
    this.status = status;
  }
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
  private readonly requestTimeoutMs: number;
  private readonly retryOnStatuses: Set<number>;
  private readonly dismissBatchWindowMs: number;
  private readonly maxDismissBatchSize: number;
  private readonly disableDismissBatch: boolean;
  private readonly syncOnOnline: boolean;
  private readonly syncOnVisibilityChange: boolean;
  private readonly syncIntervalMs: number;
  private readonly onError?: (error: unknown, context: { operation: string; attempt: number }) => void;
  private consecutiveFailures = 0;
  private circuitOpenUntil = 0;
  private manifestInFlight: Promise<FeatureManifest> | null = null;
  private stateSyncInFlight: Promise<void> | null = null;
  private dismissFlushInFlight: Promise<void> | null = null;
  private dismissFlushTimer: ReturnType<typeof setTimeout> | null = null;
  private syncTimer: ReturnType<typeof setInterval> | null = null;
  private pendingDismissIds = new Set<string>();
  private supportsDismissBatch = true;
  private readonly boundOnlineHandler: (() => void) | null = null;
  private readonly boundVisibilityHandler: (() => void) | null = null;

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
    this.requestTimeoutMs = options.requestTimeoutMs ?? 10_000;
    this.retryOnStatuses = new Set(options.retryOnStatuses ?? [408, 429, 500, 502, 503, 504]);
    this.dismissBatchWindowMs = options.dismissBatchWindowMs ?? 150;
    this.maxDismissBatchSize = Math.max(1, options.maxDismissBatchSize ?? 100);
    this.disableDismissBatch = options.disableDismissBatch ?? false;
    this.syncOnOnline = options.syncOnOnline ?? false;
    this.syncOnVisibilityChange = options.syncOnVisibilityChange ?? false;
    this.syncIntervalMs = Math.max(0, options.syncIntervalMs ?? 0);
    this.onError = options.onError;

    if (typeof window !== "undefined" && this.syncOnOnline) {
      this.boundOnlineHandler = () => {
        void this.runRecoverySync();
      };
      window.addEventListener("online", this.boundOnlineHandler);
    }

    if (typeof document !== "undefined" && this.syncOnVisibilityChange) {
      this.boundVisibilityHandler = () => {
        if (document.visibilityState === "visible") {
          void this.runRecoverySync();
        }
      };
      document.addEventListener("visibilitychange", this.boundVisibilityHandler);
    }

    if (this.syncIntervalMs > 0) {
      this.syncTimer = setInterval(() => {
        void this.syncState();
      }, this.syncIntervalMs);
    }
  }

  /** Fetch manifest with stale-while-revalidate */
  async fetchManifest(force = false): Promise<FeatureManifest> {
    const now = this.now();
    if (!force && this.lastManifest && now - this.lastFetchTs < this.fetchInterval) {
      return this.lastManifest;
    }
    if (this.manifestInFlight) return this.manifestInFlight;

    const task = (async () => {
      try {
        const json = await this.withRetry("fetchManifest", async () =>
          this.requestJson<FeatureManifest>("", {
            method: "GET",
            headers: this.headers,
          }),
        );
        this.lastManifest = json;
        this.lastFetchTs = now;
        return json;
      } catch {
        // Graceful fallback: stale cache if available, empty manifest otherwise.
        return this.lastManifest ?? [];
      }
    })();
    this.manifestInFlight = task.finally(() => {
      this.manifestInFlight = null;
    });
    return this.manifestInFlight;
  }

  /** Fetch state (watermark + dismissed IDs) */
  async syncState(): Promise<void> {
    if (this.stateSyncInFlight) return this.stateSyncInFlight;
    const task = (async () => {
      try {
        const query = this.userId ? `?userId=${encodeURIComponent(this.userId)}` : "";
        const json = await this.withRetry("syncState", async () =>
          this.requestJson<RemoteStateResponse>(`/state${query}`, {
            method: "GET",
            headers: this.headers,
          }),
        );

        if (json.watermark !== undefined) this.watermark = json.watermark;
        if (Array.isArray(json.dismissedIds)) this.dismissedIds = new Set(json.dismissedIds);
      } catch {
        // Best effort sync — failures should not crash host apps.
      }
    })();
    this.stateSyncInFlight = task.finally(() => {
      this.stateSyncInFlight = null;
    });
    return this.stateSyncInFlight;
  }

  getWatermark(): string | null {
    return this.watermark;
  }

  getDismissedIds(): ReadonlySet<string> {
    return this.dismissedIds;
  }

  dismiss(id: string): void {
    if (!id) return;
    this.dismissedIds.add(id);
    this.pendingDismissIds.add(id);
    this.scheduleDismissFlush();
  }

  async dismissAll(now: Date): Promise<void> {
    await this.flushPendingDismisses().catch(() => {
      // keep local state responsive even when flush fails
    });
    this.watermark = now.toISOString();
    this.dismissedIds.clear();
    await this.flushDismissAll(now).catch(() => {});
  }

  /** Cleanup timers/listeners and flush any queued dismiss operations. */
  async destroy(): Promise<void> {
    if (this.dismissFlushTimer) {
      clearTimeout(this.dismissFlushTimer);
      this.dismissFlushTimer = null;
    }
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
    if (this.boundOnlineHandler && typeof window !== "undefined") {
      window.removeEventListener("online", this.boundOnlineHandler);
    }
    if (this.boundVisibilityHandler && typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", this.boundVisibilityHandler);
    }
    await this.flushPendingDismisses().catch(() => {
      // suppress teardown errors and keep local state intact
    });
  }

  /** Returns current adapter health; false while circuit breaker is open. */
  async isHealthy(): Promise<boolean> {
    if (this.isCircuitOpen()) return false;
    try {
      await this.withRetry("isHealthy", async () =>
        this.requestVoid("", {
          method: "GET",
          headers: this.headers,
        }),
      );
      return true;
    } catch {
      return false;
    }
  }

  private async flushDismiss(id: string): Promise<void> {
    await this.withRetry("dismiss", async () =>
      this.requestVoid("/dismiss", {
        method: "POST",
        jsonBody: { featureId: id },
      }),
    );
  }

  private async flushDismissAll(now: Date): Promise<void> {
    await this.withRetry("dismissAll", async () =>
      this.requestVoid("/dismiss-all", {
        method: "POST",
        jsonBody: { watermark: now.toISOString() },
      }),
    );
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

  /** Force-flush queued dismiss IDs immediately. */
  async flushPendingDismisses(): Promise<void> {
    if (this.dismissFlushTimer) {
      clearTimeout(this.dismissFlushTimer);
      this.dismissFlushTimer = null;
    }
    if (this.dismissFlushInFlight) return this.dismissFlushInFlight;
    const task = this.flushPendingDismissesInternal();
    this.dismissFlushInFlight = task.finally(() => {
      this.dismissFlushInFlight = null;
    });
    return this.dismissFlushInFlight;
  }

  private async flushPendingDismissesInternal(): Promise<void> {
    if (this.pendingDismissIds.size === 0) return;
    const ids = Array.from(this.pendingDismissIds);
    this.pendingDismissIds.clear();
    try {
      await this.flushDismissBatch(ids);
    } catch {
      for (const id of ids) this.pendingDismissIds.add(id);
      throw new Error("RemoteAdapter dismiss flush failed");
    }
  }

  private async flushDismissBatch(ids: string[]): Promise<void> {
    for (let index = 0; index < ids.length; index += this.maxDismissBatchSize) {
      const chunk = ids.slice(index, index + this.maxDismissBatchSize);
      if (chunk.length === 1 || this.disableDismissBatch || !this.supportsDismissBatch) {
        await this.flushDismiss(chunk[0]);
        continue;
      }

      try {
        await this.withRetry("dismissBatch", async () =>
          this.requestVoid("/dismiss-batch", {
            method: "POST",
            jsonBody: { featureIds: chunk },
          }),
        );
      } catch (error: unknown) {
        const status = error instanceof RemoteHttpError ? error.status : undefined;
        // Auto-fallback when backend doesn't support batch endpoint.
        if (status === 404 || status === 405 || status === 501) {
          this.supportsDismissBatch = false;
          for (const id of chunk) {
            await this.flushDismiss(id);
          }
          continue;
        }
        throw error;
      }
    }
  }

  private scheduleDismissFlush(): void {
    if (this.dismissFlushTimer) return;
    this.dismissFlushTimer = setTimeout(() => {
      this.dismissFlushTimer = null;
      void this.flushPendingDismisses().catch(() => {
        // keep local-only behavior on network failure and try again later.
        this.scheduleDismissFlush();
      });
    }, this.dismissBatchWindowMs);
  }

  private async runRecoverySync(): Promise<void> {
    await this.flushPendingDismisses().catch(() => {
      // queue remains intact for next recovery attempt
    });
    await this.syncState();
  }

  private async requestJson<T>(
    path: string,
    init: {
      method: "GET" | "POST";
      headers?: Record<string, string>;
      jsonBody?: unknown;
    },
  ): Promise<T> {
    const response = await this.request(path, init);
    return (await response.json()) as T;
  }

  private async requestVoid(
    path: string,
    init: {
      method: "GET" | "POST";
      headers?: Record<string, string>;
      jsonBody?: unknown;
    },
  ): Promise<void> {
    await this.request(path, init);
  }

  private async request(
    path: string,
    init: {
      method: "GET" | "POST";
      headers?: Record<string, string>;
      jsonBody?: unknown;
    },
  ): Promise<Response> {
    const fetchImpl = assertFetch();
    const controller = new AbortController();
    const timeoutId =
      this.requestTimeoutMs > 0
        ? setTimeout(() => {
            controller.abort();
          }, this.requestTimeoutMs)
        : null;

    try {
      const res = await fetchImpl(`${this.baseUrl}${path}`, {
        method: init.method,
        headers: {
          ...(init.jsonBody ? { "Content-Type": "application/json" } : {}),
          ...this.headers,
          ...(init.headers ?? {}),
        },
        body: init.jsonBody === undefined ? undefined : JSON.stringify(init.jsonBody),
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new RemoteHttpError(
          `RemoteAdapter request failed (${res.status}) for ${path || "/"}`,
          res.status,
        );
      }
      return res;
    } catch (error: unknown) {
      const name =
        error instanceof DOMException
          ? error.name
          : error && typeof error === "object" && "name" in error
            ? String((error as { name?: unknown }).name)
            : "";
      if (name === "AbortError") {
        throw new Error(`RemoteAdapter request timed out after ${this.requestTimeoutMs}ms`);
      }
      throw error;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  private shouldRetry(error: unknown): boolean {
    if (error instanceof RemoteHttpError) {
      return this.retryOnStatuses.has(error.status);
    }
    const message = error instanceof Error ? error.message : "";
    if (message.includes("circuit breaker is open")) return false;
    return true;
  }

  private async withRetry<T>(operationName: string, operation: () => Promise<T>): Promise<T> {
    if (this.isCircuitOpen()) {
      throw new Error("RemoteAdapter circuit breaker is open");
    }

    let lastError: unknown = new Error("RemoteAdapter request failed");
    for (let attempt = 0; attempt <= this.retryAttempts; attempt++) {
      try {
        const result = await operation();
        this.markSuccess();
        return result;
      } catch (error: unknown) {
        lastError = error;
        this.onError?.(error, { operation: operationName, attempt });
        if (attempt >= this.retryAttempts || !this.shouldRetry(error)) break;
        const delayMs = this.retryBaseDelayMs * 2 ** attempt;
        await this.sleep(delayMs);
      }
    }

    this.markFailure();
    throw lastError instanceof Error ? lastError : new Error("RemoteAdapter request failed");
  }
}
