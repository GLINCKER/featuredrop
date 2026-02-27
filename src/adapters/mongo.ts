import type { DismissalState, ServerStorageAdapter } from "../types";

interface MongoStateDoc {
  userId: string;
  watermark?: string | null;
  dismissedIds?: string[];
  lastSeen?: string;
}

interface MongoFindCursor<T> {
  toArray: () => Promise<T[]>;
}

export interface MongoLikeCollection {
  findOne: (filter: Record<string, unknown>) => Promise<MongoStateDoc | null>;
  updateOne: (
    filter: Record<string, unknown>,
    update: Record<string, unknown>,
    options?: Record<string, unknown>,
  ) => Promise<unknown>;
  deleteOne: (filter: Record<string, unknown>) => Promise<unknown>;
  find?: (filter: Record<string, unknown>) => MongoFindCursor<MongoStateDoc>;
}

export interface MongoAdapterOptions {
  userId: string;
  collection: MongoLikeCollection;
}

function normalizeDismissedIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) return [];
  return ids.filter((id): id is string => typeof id === "string");
}

function normalizeLastSeen(value: unknown): string {
  return typeof value === "string" && value ? value : new Date(0).toISOString();
}

export class MongoAdapter implements ServerStorageAdapter {
  readonly userId: string;

  private readonly collection: MongoLikeCollection;
  private watermark: string | null = null;
  private dismissedIds = new Set<string>();

  constructor(options: MongoAdapterOptions) {
    if (!options.userId) {
      throw new Error("MongoAdapter: userId is required");
    }
    this.userId = options.userId;
    this.collection = options.collection;
  }

  getWatermark(): string | null {
    return this.watermark;
  }

  getDismissedIds(): ReadonlySet<string> {
    return this.dismissedIds;
  }

  dismiss(id: string): void {
    this.dismissedIds.add(id);
    void this.collection.updateOne(
      { userId: this.userId },
      {
        $addToSet: { dismissedIds: id },
        $set: { lastSeen: new Date().toISOString() },
      },
      { upsert: true },
    );
  }

  async dismissAll(now: Date): Promise<void> {
    this.watermark = now.toISOString();
    this.dismissedIds.clear();
    await this.collection.updateOne(
      { userId: this.userId },
      {
        $set: {
          userId: this.userId,
          watermark: this.watermark,
          dismissedIds: [],
          lastSeen: this.watermark,
        },
      },
      { upsert: true },
    );
  }

  async sync(): Promise<void> {
    const doc = await this.collection.findOne({ userId: this.userId });
    this.watermark = doc?.watermark ?? null;
    this.dismissedIds = new Set(normalizeDismissedIds(doc?.dismissedIds));
  }

  async dismissBatch(ids: string[]): Promise<void> {
    const unique = Array.from(new Set(ids));
    if (unique.length === 0) return;
    this.dismissedIds = new Set([...this.dismissedIds, ...unique]);
    await this.collection.updateOne(
      { userId: this.userId },
      {
        $addToSet: { dismissedIds: { $each: unique } },
        $set: { lastSeen: new Date().toISOString() },
      },
      { upsert: true },
    );
  }

  async resetUser(userId: string): Promise<void> {
    await this.collection.deleteOne({ userId });
    if (userId === this.userId) {
      this.watermark = null;
      this.dismissedIds.clear();
    }
  }

  async getBulkState(userIds: string[]): Promise<Map<string, DismissalState>> {
    const out = new Map<string, DismissalState>();
    if (userIds.length === 0) return out;

    if (this.collection.find) {
      const rows = await this.collection.find({ userId: { $in: userIds } }).toArray();
      for (const row of rows) {
        out.set(row.userId, {
          watermark: row.watermark ?? null,
          dismissedIds: normalizeDismissedIds(row.dismissedIds),
          lastSeen: normalizeLastSeen(row.lastSeen),
          deviceCount: 1,
        });
      }
      return out;
    }

    await Promise.all(
      userIds.map(async (userId) => {
        const row = await this.collection.findOne({ userId });
        if (!row) return;
        out.set(userId, {
          watermark: row.watermark ?? null,
          dismissedIds: normalizeDismissedIds(row.dismissedIds),
          lastSeen: normalizeLastSeen(row.lastSeen),
          deviceCount: 1,
        });
      }),
    );
    return out;
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.collection.findOne({});
      return true;
    } catch {
      return false;
    }
  }

  async destroy(): Promise<void> {
    // No-op by default. Caller owns the Mongo client lifecycle.
  }
}
