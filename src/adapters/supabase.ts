import type { DismissalState, ServerStorageAdapter } from "../types";

interface SupabaseErrorLike {
  message?: string;
}

interface SupabaseMaybeSingleResult<T> {
  data: T | null;
  error: SupabaseErrorLike | null;
}

interface SupabaseMutationResult {
  error: SupabaseErrorLike | null;
}

interface SupabaseSelectQuery<T> {
  eq: (column: string, value: unknown) => SupabaseSelectQuery<T>;
  maybeSingle: () => Promise<SupabaseMaybeSingleResult<T>>;
}

interface SupabaseMutationQuery {
  eq: (column: string, value: unknown) => Promise<SupabaseMutationResult>;
}

interface SupabaseTableClient<T> {
  select: (columns: string) => SupabaseSelectQuery<T>;
  upsert: (value: Record<string, unknown>) => Promise<SupabaseMutationResult>;
  update: (value: Record<string, unknown>) => SupabaseMutationQuery;
  delete: () => SupabaseMutationQuery;
}

export interface SupabaseRealtimeChannelLike {
  on: (
    event: "postgres_changes",
    filter: Record<string, unknown>,
    callback: () => void,
  ) => SupabaseRealtimeChannelLike;
  subscribe: (callback?: (status: string) => void) => SupabaseRealtimeChannelLike;
}

export interface SupabaseClientLike {
  from: <T = SupabaseStateRow>(table: string) => SupabaseTableClient<T>;
  channel?: (name: string) => SupabaseRealtimeChannelLike;
  removeChannel?: (channel: SupabaseRealtimeChannelLike) => void | Promise<void>;
}

interface SupabaseStateRow {
  [key: string]: unknown;
  user_id: string;
  watermark?: string | null;
  dismissed_ids?: string[] | null;
  last_seen?: string | null;
}

export interface SupabaseAdapterOptions {
  userId: string;
  client: SupabaseClientLike;
  tableName?: string;
  realtime?: boolean;
}

function normalizeDismissedIds(row: SupabaseStateRow | null): string[] {
  if (!row || !Array.isArray(row.dismissed_ids)) return [];
  return row.dismissed_ids.filter((id): id is string => typeof id === "string");
}

function normalizeWatermark(row: SupabaseStateRow | null): string | null {
  if (!row) return null;
  return row.watermark ?? null;
}

function normalizeLastSeen(row: SupabaseStateRow | null): string {
  if (!row) return new Date(0).toISOString();
  return row.last_seen ?? new Date(0).toISOString();
}

function throwOnError(error: SupabaseErrorLike | null): void {
  if (!error) return;
  throw new Error(`SupabaseAdapter: ${error.message ?? "unknown error"}`);
}

export class SupabaseAdapter implements ServerStorageAdapter {
  readonly userId: string;

  private readonly client: SupabaseClientLike;
  private readonly tableName: string;
  private readonly realtime: boolean;
  private watermark: string | null = null;
  private dismissedIds = new Set<string>();
  private realtimeChannel: SupabaseRealtimeChannelLike | null = null;
  private syncing = false;

  constructor(options: SupabaseAdapterOptions) {
    if (!options.userId) {
      throw new Error("SupabaseAdapter: userId is required");
    }
    this.userId = options.userId;
    this.client = options.client;
    this.tableName = options.tableName ?? "featuredrop_state";
    this.realtime = options.realtime ?? false;

    if (this.realtime && this.client.channel) {
      this.setupRealtime();
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
    void this.dismissBatch([id]);
  }

  async dismissAll(now: Date): Promise<void> {
    this.watermark = now.toISOString();
    this.dismissedIds.clear();
    await this.upsertState({
      watermark: this.watermark,
      dismissed_ids: [],
      last_seen: this.watermark,
    });
  }

  async sync(): Promise<void> {
    if (this.syncing) return;
    this.syncing = true;
    try {
      const row = await this.fetchState(this.userId);
      this.watermark = normalizeWatermark(row);
      this.dismissedIds = new Set(normalizeDismissedIds(row));
    } finally {
      this.syncing = false;
    }
  }

  async dismissBatch(ids: string[]): Promise<void> {
    const uniqueIds = Array.from(new Set(ids));
    if (uniqueIds.length === 0) return;

    const merged = new Set<string>([
      ...Array.from(this.dismissedIds),
      ...uniqueIds,
    ]);
    this.dismissedIds = merged;

    await this.upsertState({
      watermark: this.watermark,
      dismissed_ids: Array.from(merged),
      last_seen: new Date().toISOString(),
    });
  }

  async resetUser(userId: string): Promise<void> {
    const result = await this.client
      .from(this.tableName)
      .delete()
      .eq("user_id", userId);
    throwOnError(result.error);
    if (userId === this.userId) {
      this.watermark = null;
      this.dismissedIds.clear();
    }
  }

  async getBulkState(userIds: string[]): Promise<Map<string, DismissalState>> {
    const out = new Map<string, DismissalState>();
    if (userIds.length === 0) return out;

    await Promise.all(
      userIds.map(async (userId) => {
        const row = await this.fetchState(userId);
        if (!row) return;
        out.set(userId, {
          watermark: normalizeWatermark(row),
          dismissedIds: normalizeDismissedIds(row),
          lastSeen: normalizeLastSeen(row),
          deviceCount: 1,
        });
      }),
    );
    return out;
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.client
        .from(this.tableName)
        .select("user_id")
        .eq("user_id", this.userId)
        .maybeSingle();
      return true;
    } catch {
      return false;
    }
  }

  async destroy(): Promise<void> {
    if (this.realtimeChannel && this.client.removeChannel) {
      await this.client.removeChannel(this.realtimeChannel);
    }
    this.realtimeChannel = null;
  }

  private async fetchState(userId: string): Promise<SupabaseStateRow | null> {
    const result = await this.client
      .from<SupabaseStateRow>(this.tableName)
      .select("user_id, watermark, dismissed_ids, last_seen")
      .eq("user_id", userId)
      .maybeSingle();
    throwOnError(result.error);
    return result.data;
  }

  private async upsertState(state: {
    watermark: string | null;
    dismissed_ids: string[];
    last_seen: string;
  }): Promise<void> {
    const payload: SupabaseStateRow = {
      user_id: this.userId,
      watermark: state.watermark,
      dismissed_ids: state.dismissed_ids,
      last_seen: state.last_seen,
    };
    const result = await this.client.from(this.tableName).upsert(payload as Record<string, unknown>);
    throwOnError(result.error);
  }

  private setupRealtime(): void {
    const channelFactory = this.client.channel;
    if (!channelFactory) return;
    this.realtimeChannel = channelFactory(`featuredrop:${this.tableName}:${this.userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: this.tableName,
          filter: `user_id=eq.${this.userId}`,
        },
        () => {
          void this.sync();
        },
      )
      .subscribe();
  }
}
