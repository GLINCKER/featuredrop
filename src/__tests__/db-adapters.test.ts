import { describe, it, expect, vi } from "vitest";
import { PostgresAdapter } from "../adapters/postgres";
import { RedisAdapter, type RedisLikeClient, type RedisLikePipeline } from "../adapters/redis";
import { HybridAdapter } from "../adapters/hybrid";
import { MemoryAdapter } from "../adapters/memory";
import { MySQLAdapter } from "../adapters/mysql";
import { MongoAdapter, type MongoLikeCollection } from "../adapters/mongo";
import { SQLiteAdapter } from "../adapters/sqlite";
import {
  SupabaseAdapter,
  type SupabaseClientLike,
  type SupabaseRealtimeChannelLike,
} from "../adapters/supabase";
import type { DismissalState, ServerStorageAdapter } from "../types";

describe("PostgresAdapter", () => {
  it("syncs watermark + dismissed ids from query result", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{
          watermark: "2026-02-01T00:00:00Z",
          dismissed_ids: ["a", "b"],
          last_seen: "2026-02-02T00:00:00Z",
        }],
      });

    const adapter = new PostgresAdapter({
      userId: "u1",
      query,
    });

    await adapter.sync();
    expect(adapter.getWatermark()).toBe("2026-02-01T00:00:00Z");
    expect(adapter.getDismissedIds().has("a")).toBe(true);
    expect(adapter.getDismissedIds().has("b")).toBe(true);
  });

  it("dismissBatch de-dupes ids", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const adapter = new PostgresAdapter({
      userId: "u1",
      query,
    });
    await adapter.dismissBatch(["x", "x", "y"]);
    const call = query.mock.calls.at(-1);
    expect(call?.[1]?.[1]).toEqual(["x", "y"]);
  });
});

function createRedisMock(): RedisLikeClient {
  const kv = new Map<string, string>();
  const sets = new Map<string, Set<string>>();

  const pipelineOps: Array<() => void> = [];
  const pipeline: RedisLikePipeline = {
    set(key, value) {
      pipelineOps.push(() => {
        kv.set(key, value);
      });
      return this;
    },
    del(key) {
      pipelineOps.push(() => {
        kv.delete(key);
        sets.delete(key);
      });
      return this;
    },
    sadd(key, ...members) {
      pipelineOps.push(() => {
        const s = sets.get(key) ?? new Set<string>();
        for (const member of members) s.add(member);
        sets.set(key, s);
      });
      return this;
    },
    async exec() {
      for (const op of pipelineOps.splice(0)) op();
      return [];
    },
  };

  return {
    async get(key) {
      return kv.get(key) ?? null;
    },
    async set(key, value) {
      kv.set(key, value);
      return "OK";
    },
    async del(key) {
      kv.delete(key);
      sets.delete(key);
      return 1;
    },
    async smembers(key) {
      return Array.from(sets.get(key) ?? new Set<string>());
    },
    async sadd(key, ...members) {
      const s = sets.get(key) ?? new Set<string>();
      for (const member of members) s.add(member);
      sets.set(key, s);
      return members.length;
    },
    async ping() {
      return "PONG";
    },
    multi() {
      return pipeline;
    },
  };
}

describe("RedisAdapter", () => {
  it("writes dismiss and syncs back from redis", async () => {
    const adapter = new RedisAdapter({
      userId: "u1",
      client: createRedisMock(),
    });
    adapter.dismiss("feat-1");
    await adapter.sync();
    expect(adapter.getDismissedIds().has("feat-1")).toBe(true);
  });

  it("dismissAll sets watermark and clears dismissed set", async () => {
    const adapter = new RedisAdapter({
      userId: "u1",
      client: createRedisMock(),
    });
    adapter.dismiss("feat-1");
    const now = new Date("2026-02-25T00:00:00Z");
    await adapter.dismissAll(now);
    expect(adapter.getWatermark()).toBe(now.toISOString());
    await adapter.sync();
    expect(adapter.getDismissedIds().size).toBe(0);
  });
});

function makeRemoteMock(userId = "u1"): ServerStorageAdapter {
  let watermark: string | null = null;
  const dismissed = new Set<string>();
  const bulkState = new Map<string, DismissalState>();
  bulkState.set(userId, {
    watermark: null,
    dismissedIds: [],
    lastSeen: new Date(0).toISOString(),
    deviceCount: 1,
  });

  const remote: ServerStorageAdapter = {
    userId,
    getWatermark: () => watermark,
    getDismissedIds: () => dismissed,
    dismiss: vi.fn((id: string) => {
      dismissed.add(id);
    }),
    dismissAll: vi.fn(async (now: Date) => {
      watermark = now.toISOString();
      dismissed.clear();
    }),
    sync: vi.fn(async () => {}),
    dismissBatch: vi.fn(async (ids: string[]) => {
      for (const id of ids) dismissed.add(id);
    }),
    resetUser: vi.fn(async () => {
      watermark = null;
      dismissed.clear();
    }),
    getBulkState: vi.fn(async () => bulkState),
    isHealthy: vi.fn(async () => true),
    destroy: vi.fn(async () => {}),
  };
  return remote;
}

describe("HybridAdapter", () => {
  it("combines local + remote dismissed ids", () => {
    const local = new MemoryAdapter();
    const remote = makeRemoteMock();
    local.dismiss("local-id");
    remote.dismiss("remote-id");
    const adapter = new HybridAdapter({ local, remote });
    const ids = adapter.getDismissedIds();
    expect(ids.has("local-id")).toBe(true);
    expect(ids.has("remote-id")).toBe(true);
  });

  it("writes dismiss locally and flushes remote in batch", async () => {
    const local = new MemoryAdapter();
    const remote = makeRemoteMock();
    const adapter = new HybridAdapter({
      local,
      remote,
      dismissBatchWindowMs: 0,
      syncOnOnline: false,
      syncOnVisibilityChange: false,
    });
    adapter.dismiss("feat-2");
    expect(local.getDismissedIds().has("feat-2")).toBe(true);
    expect(remote.getDismissedIds().has("feat-2")).toBe(false);
    await adapter.flushPendingDismisses();
    expect(remote.getDismissedIds().has("feat-2")).toBe(true);
    await adapter.destroy();
  });

  it("batches rapid dismiss calls into one remote dismissBatch request", async () => {
    const local = new MemoryAdapter();
    const remote = makeRemoteMock();
    const adapter = new HybridAdapter({
      local,
      remote,
      dismissBatchWindowMs: 0,
      syncOnOnline: false,
      syncOnVisibilityChange: false,
    });

    adapter.dismiss("a");
    adapter.dismiss("b");
    adapter.dismiss("a");
    await adapter.flushPendingDismisses();

    expect(remote.dismissBatch).toHaveBeenCalledTimes(1);
    expect(remote.dismissBatch).toHaveBeenCalledWith(["a", "b"]);
    await adapter.destroy();
  });

  it("retries pending dismisses when remote batch fails", async () => {
    const local = new MemoryAdapter();
    const remote = makeRemoteMock();
    const dismissed = remote.getDismissedIds() as Set<string>;
    let failedOnce = false;
    remote.dismissBatch = vi.fn(async (ids: string[]) => {
      if (!failedOnce) {
        failedOnce = true;
        throw new Error("offline");
      }
      for (const id of ids) dismissed.add(id);
    });
    const adapter = new HybridAdapter({
      local,
      remote,
      dismissBatchWindowMs: 0,
      syncOnOnline: false,
      syncOnVisibilityChange: false,
    });

    adapter.dismiss("retry-me");
    await adapter.flushPendingDismisses();
    expect(remote.getDismissedIds().has("retry-me")).toBe(false);

    await adapter.flushPendingDismisses();
    expect(remote.getDismissedIds().has("retry-me")).toBe(true);
    await adapter.destroy();
  });

  it("flushes queued dismisses during sync and coalesces concurrent sync calls", async () => {
    const local = new MemoryAdapter();
    const remote = makeRemoteMock();
    const syncStart: Array<() => void> = [];
    remote.sync = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          syncStart.push(resolve);
        }),
    );
    const adapter = new HybridAdapter({
      local,
      remote,
      dismissBatchWindowMs: 60_000,
      syncOnOnline: false,
      syncOnVisibilityChange: false,
    });

    adapter.dismiss("queued");
    const first = adapter.sync();
    const second = adapter.sync();
    expect(remote.sync).toHaveBeenCalledTimes(1);

    for (const resolve of syncStart) resolve();
    await Promise.all([first, second]);

    expect(remote.dismissBatch).toHaveBeenCalledTimes(1);
    expect(remote.getDismissedIds().has("queued")).toBe(true);
    await adapter.destroy();
  });

  it("coalesces concurrent flushPendingDismisses calls", async () => {
    const local = new MemoryAdapter();
    const remote = makeRemoteMock();
    const batchResolves: Array<() => void> = [];
    remote.dismissBatch = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          batchResolves.push(resolve);
        }),
    );
    const adapter = new HybridAdapter({
      local,
      remote,
      dismissBatchWindowMs: 60_000,
      syncOnOnline: false,
      syncOnVisibilityChange: false,
    });

    adapter.dismiss("a");
    const first = adapter.flushPendingDismisses();
    const second = adapter.flushPendingDismisses();
    expect(remote.dismissBatch).toHaveBeenCalledTimes(1);

    for (const resolve of batchResolves) resolve();
    await Promise.all([first, second]);
    await adapter.destroy();
  });

  it("sync flushes retry queue after a failed flush", async () => {
    const local = new MemoryAdapter();
    const remote = makeRemoteMock();
    const dismissed = remote.getDismissedIds() as Set<string>;
    let failedOnce = false;
    remote.dismissBatch = vi.fn(async (ids: string[]) => {
      if (!failedOnce) {
        failedOnce = true;
        throw new Error("network down");
      }
      for (const id of ids) dismissed.add(id);
    });
    const adapter = new HybridAdapter({
      local,
      remote,
      dismissBatchWindowMs: 60_000,
      syncOnOnline: false,
      syncOnVisibilityChange: false,
    });

    adapter.dismiss("recover-me");
    await adapter.flushPendingDismisses();
    expect(remote.getDismissedIds().has("recover-me")).toBe(false);

    await adapter.sync();
    expect(remote.getDismissedIds().has("recover-me")).toBe(true);
    await adapter.destroy();
  });
});

describe("MySQLAdapter", () => {
  it("syncs watermark + dismissed ids from query result", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{
          watermark: "2026-02-01T00:00:00Z",
          dismissed_ids: JSON.stringify(["a", "b"]),
          last_seen: "2026-02-02T00:00:00Z",
        }],
      });

    const adapter = new MySQLAdapter({
      userId: "u1",
      query,
    });

    await adapter.sync();
    expect(adapter.getWatermark()).toBe("2026-02-01T00:00:00Z");
    expect(adapter.getDismissedIds().has("a")).toBe(true);
    expect(adapter.getDismissedIds().has("b")).toBe(true);
  });

  it("dismissBatch de-dupes ids", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const adapter = new MySQLAdapter({
      userId: "u1",
      query,
    });
    await adapter.dismissBatch(["x", "x", "y"]);
    const call = query.mock.calls.at(-1);
    expect(JSON.parse(String(call?.[1]?.[2]))).toEqual(["x", "y"]);
  });
});

function createMongoCollectionMock(): MongoLikeCollection {
  const records = new Map<string, { userId: string; watermark: string | null; dismissedIds: string[]; lastSeen: string }>();

  return {
    async findOne(filter) {
      const userId = String(filter.userId ?? "");
      if (!userId) return null;
      return records.get(userId) ?? null;
    },
    async updateOne(filter, update) {
      const userId = String(filter.userId ?? "");
      const existing = records.get(userId) ?? {
        userId,
        watermark: null,
        dismissedIds: [],
        lastSeen: new Date(0).toISOString(),
      };

      const set = (update.$set ?? {}) as Record<string, unknown>;
      if (set.watermark !== undefined) existing.watermark = (set.watermark as string | null) ?? null;
      if (set.lastSeen !== undefined) existing.lastSeen = String(set.lastSeen);
      if (Array.isArray(set.dismissedIds)) {
        existing.dismissedIds = set.dismissedIds.filter((id): id is string => typeof id === "string");
      }

      const addToSet = (update.$addToSet ?? {}) as Record<string, unknown>;
      const dismissedAdd = addToSet.dismissedIds;
      if (typeof dismissedAdd === "string") {
        if (!existing.dismissedIds.includes(dismissedAdd)) existing.dismissedIds.push(dismissedAdd);
      } else if (dismissedAdd && typeof dismissedAdd === "object") {
        const each = (dismissedAdd as { $each?: unknown[] }).$each;
        if (Array.isArray(each)) {
          for (const item of each) {
            if (typeof item === "string" && !existing.dismissedIds.includes(item)) {
              existing.dismissedIds.push(item);
            }
          }
        }
      }

      records.set(userId, existing);
      return { acknowledged: true };
    },
    async deleteOne(filter) {
      const userId = String(filter.userId ?? "");
      records.delete(userId);
      return { acknowledged: true };
    },
    find(filter) {
      const target = filter.userId as { $in?: string[] } | undefined;
      const ids = target?.$in ?? [];
      return {
        toArray: async () =>
          ids
            .map((id) => records.get(id))
            .filter((value): value is { userId: string; watermark: string | null; dismissedIds: string[]; lastSeen: string } => !!value),
      };
    },
  };
}

describe("MongoAdapter", () => {
  it("syncs and persists dismissals", async () => {
    const adapter = new MongoAdapter({
      userId: "u1",
      collection: createMongoCollectionMock(),
    });
    adapter.dismiss("feat-1");
    await adapter.sync();
    expect(adapter.getDismissedIds().has("feat-1")).toBe(true);
  });

  it("dismissAll sets watermark and clears dismissed set", async () => {
    const adapter = new MongoAdapter({
      userId: "u1",
      collection: createMongoCollectionMock(),
    });
    adapter.dismiss("feat-1");
    const now = new Date("2026-02-25T00:00:00Z");
    await adapter.dismissAll(now);
    expect(adapter.getWatermark()).toBe(now.toISOString());
    await adapter.sync();
    expect(adapter.getDismissedIds().size).toBe(0);
  });
});

describe("SQLiteAdapter", () => {
  it("syncs watermark + dismissed ids from query result", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{
          watermark: "2026-02-01T00:00:00Z",
          dismissed_ids: JSON.stringify(["a", "b"]),
          last_seen: "2026-02-02T00:00:00Z",
        }],
      });

    const adapter = new SQLiteAdapter({
      userId: "u1",
      query,
    });

    await adapter.sync();
    expect(adapter.getWatermark()).toBe("2026-02-01T00:00:00Z");
    expect(adapter.getDismissedIds().has("a")).toBe(true);
    expect(adapter.getDismissedIds().has("b")).toBe(true);
  });

  it("dismissBatch de-dupes ids", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const adapter = new SQLiteAdapter({
      userId: "u1",
      query,
    });
    await adapter.dismissBatch(["x", "x", "y"]);
    const call = query.mock.calls.at(-1);
    expect(JSON.parse(String(call?.[1]?.[2]))).toEqual(["x", "y"]);
  });
});

function createSupabaseClientMock(): SupabaseClientLike {
  const rows = new Map<string, {
    user_id: string;
    watermark: string | null;
    dismissed_ids: string[];
    last_seen: string;
  }>();

  const makeChannel = (): SupabaseRealtimeChannelLike => {
    const channel: SupabaseRealtimeChannelLike = {
      on() {
        return channel;
      },
      subscribe() {
        return channel;
      },
    };
    return channel;
  };

  return {
    from(tableName) {
      void tableName;
      return {
        select() {
          let selectedUserId = "";
          const query = {
            eq(column: string, value: unknown) {
              if (column === "user_id") selectedUserId = String(value);
              return query;
            },
            async maybeSingle() {
              return {
                data: rows.get(selectedUserId) ?? null,
                error: null,
              };
            },
          };
          return query;
        },
        async upsert(value) {
          const userId = String(value.user_id ?? "");
          rows.set(userId, {
            user_id: userId,
            watermark: (value.watermark as string | null) ?? null,
            dismissed_ids: Array.isArray(value.dismissed_ids)
              ? value.dismissed_ids.filter((item): item is string => typeof item === "string")
              : [],
            last_seen: String(value.last_seen ?? new Date(0).toISOString()),
          });
          return { error: null };
        },
        update(value) {
          return {
            async eq(column: string, id: unknown) {
              if (column !== "user_id") return { error: null };
              const userId = String(id);
              const existing = rows.get(userId);
              if (!existing) return { error: null };
              rows.set(userId, {
                ...existing,
                ...value as Partial<typeof existing>,
              });
              return { error: null };
            },
          };
        },
        delete() {
          return {
            async eq(column: string, id: unknown) {
              if (column === "user_id") rows.delete(String(id));
              return { error: null };
            },
          };
        },
      };
    },
    channel() {
      return makeChannel();
    },
    async removeChannel() {
      return;
    },
  };
}

describe("SupabaseAdapter", () => {
  it("syncs and persists dismissals", async () => {
    const adapter = new SupabaseAdapter({
      userId: "u1",
      client: createSupabaseClientMock(),
    });

    adapter.dismiss("feat-1");
    await adapter.sync();
    expect(adapter.getDismissedIds().has("feat-1")).toBe(true);
  });

  it("dismissAll sets watermark and clears dismissed set", async () => {
    const adapter = new SupabaseAdapter({
      userId: "u1",
      client: createSupabaseClientMock(),
    });

    adapter.dismiss("feat-1");
    const now = new Date("2026-02-25T00:00:00Z");
    await adapter.dismissAll(now);
    expect(adapter.getWatermark()).toBe(now.toISOString());
    await adapter.sync();
    expect(adapter.getDismissedIds().size).toBe(0);
    await adapter.destroy();
  });
});
