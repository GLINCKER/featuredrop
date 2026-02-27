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

  constructor(options: RemoteAdapterOptions) {
    this.baseUrl = options.url.replace(/\/$/, "");
    this.headers = options.headers ?? {};
    this.fetchInterval = options.fetchInterval ?? 5 * 60 * 1000;
    this.userId = options.userId;
  }

  /** Fetch manifest with stale-while-revalidate */
  async fetchManifest(force = false): Promise<FeatureManifest> {
    const now = Date.now();
    if (!force && this.lastManifest && now - this.lastFetchTs < this.fetchInterval) {
      return this.lastManifest;
    }

    const fetchImpl = assertFetch();
    const res = await fetchImpl(this.baseUrl, {
      method: "GET",
      headers: this.headers,
    });
    if (!res.ok) throw new Error(`RemoteAdapter manifest fetch failed: ${res.status}`);
    const json = (await res.json()) as FeatureManifest;
    this.lastManifest = json;
    this.lastFetchTs = now;
    return json;
  }

  /** Fetch state (watermark + dismissed IDs) */
  async syncState(): Promise<void> {
    const fetchImpl = assertFetch();
    const url = this.userId ? `${this.baseUrl}/state?userId=${encodeURIComponent(this.userId)}` : `${this.baseUrl}/state`;
    const res = await fetchImpl(url, {
      method: "GET",
      headers: this.headers,
    });
    if (!res.ok) return;
    const json = (await res.json()) as RemoteStateResponse;
    if (json.watermark !== undefined) this.watermark = json.watermark;
    if (Array.isArray(json.dismissedIds)) this.dismissedIds = new Set(json.dismissedIds);
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

  private async flushDismiss(id: string): Promise<void> {
    const fetchImpl = assertFetch();
    await fetchImpl(`${this.baseUrl}/dismiss`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...this.headers },
      body: JSON.stringify({ featureId: id }),
    });
  }

  private async flushDismissAll(now: Date): Promise<void> {
    const fetchImpl = assertFetch();
    await fetchImpl(`${this.baseUrl}/dismiss-all`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...this.headers },
      body: JSON.stringify({ watermark: now.toISOString() }),
    });
  }
}
