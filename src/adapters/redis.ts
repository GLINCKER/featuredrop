import type { DismissalState, ServerStorageAdapter } from "../types";

export interface RedisLikePipeline {
  set(key: string, value: string): RedisLikePipeline;
  del(key: string): RedisLikePipeline;
  sadd(key: string, ...members: string[]): RedisLikePipeline;
  exec(): Promise<unknown>;
}

export interface RedisLikeClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<unknown>;
  del(key: string): Promise<unknown>;
  smembers(key: string): Promise<string[]>;
  sadd(key: string, ...members: string[]): Promise<unknown>;
  ping(): Promise<string>;
  multi(): RedisLikePipeline;
  quit?(): Promise<unknown>;
  disconnect?(): void;
}

export interface RedisAdapterOptions {
  userId: string;
  client: RedisLikeClient;
  keyPrefix?: string;
}

/**
 * Redis-backed storage adapter.
 * Uses simple key + set structures to keep operations predictable.
 */
export class RedisAdapter implements ServerStorageAdapter {
  readonly userId: string;

  private readonly client: RedisLikeClient;
  private readonly keyPrefix: string;
  private watermark: string | null = null;
  private dismissedIds = new Set<string>();

  constructor(options: RedisAdapterOptions) {
    if (!options.userId) {
      throw new Error("RedisAdapter: userId is required");
    }
    this.userId = options.userId;
    this.client = options.client;
    this.keyPrefix = options.keyPrefix ?? "fd:";
  }

  getWatermark(): string | null {
    return this.watermark;
  }

  getDismissedIds(): ReadonlySet<string> {
    return this.dismissedIds;
  }

  dismiss(id: string): void {
    this.dismissedIds.add(id);
    void this.client.sadd(this.dismissedKey(this.userId), id);
    void this.client.set(this.lastSeenKey(this.userId), new Date().toISOString());
  }

  async dismissAll(now: Date): Promise<void> {
    this.watermark = now.toISOString();
    this.dismissedIds.clear();
    await this.client
      .multi()
      .set(this.watermarkKey(this.userId), this.watermark)
      .del(this.dismissedKey(this.userId))
      .set(this.lastSeenKey(this.userId), now.toISOString())
      .exec();
  }

  async sync(): Promise<void> {
    const [watermark, dismissedIds] = await Promise.all([
      this.client.get(this.watermarkKey(this.userId)),
      this.client.smembers(this.dismissedKey(this.userId)),
    ]);
    this.watermark = watermark;
    this.dismissedIds = new Set(dismissedIds);
  }

  async dismissBatch(ids: string[]): Promise<void> {
    const uniqueIds = Array.from(new Set(ids));
    if (uniqueIds.length === 0) return;
    this.dismissedIds = new Set([...this.dismissedIds, ...uniqueIds]);
    await this.client.sadd(this.dismissedKey(this.userId), ...uniqueIds);
    await this.client.set(this.lastSeenKey(this.userId), new Date().toISOString());
  }

  async resetUser(userId: string): Promise<void> {
    await this.client
      .multi()
      .del(this.watermarkKey(userId))
      .del(this.dismissedKey(userId))
      .del(this.lastSeenKey(userId))
      .exec();
    if (userId === this.userId) {
      this.watermark = null;
      this.dismissedIds.clear();
    }
  }

  async getBulkState(userIds: string[]): Promise<Map<string, DismissalState>> {
    const map = new Map<string, DismissalState>();
    await Promise.all(
      userIds.map(async (userId) => {
        const [watermark, dismissedIds, lastSeen] = await Promise.all([
          this.client.get(this.watermarkKey(userId)),
          this.client.smembers(this.dismissedKey(userId)),
          this.client.get(this.lastSeenKey(userId)),
        ]);
        map.set(userId, {
          watermark,
          dismissedIds,
          lastSeen: lastSeen ?? new Date(0).toISOString(),
          deviceCount: 1,
        });
      }),
    );
    return map;
  }

  async isHealthy(): Promise<boolean> {
    try {
      const response = await this.client.ping();
      return response.toUpperCase() === "PONG";
    } catch {
      return false;
    }
  }

  async destroy(): Promise<void> {
    if (this.client.quit) {
      await this.client.quit();
      return;
    }
    this.client.disconnect?.();
  }

  private watermarkKey(userId: string): string {
    return `${this.keyPrefix}${userId}:watermark`;
  }

  private dismissedKey(userId: string): string {
    return `${this.keyPrefix}${userId}:dismissed`;
  }

  private lastSeenKey(userId: string): string {
    return `${this.keyPrefix}${userId}:last_seen`;
  }
}
