import type { DismissalState, ServerStorageAdapter } from "../types";

interface QueryResultRow {
  watermark?: string | null;
  dismissed_ids?: string[] | null;
  dismissedIds?: string[] | null;
  last_seen?: string | null;
  lastSeen?: string | null;
}

export interface PostgresQueryResult<T = QueryResultRow> {
  rows: T[];
  rowCount?: number | null;
}

export type PostgresQueryFn = <T = QueryResultRow>(
  sql: string,
  params?: unknown[],
) => Promise<PostgresQueryResult<T>>;

export interface PostgresAdapterOptions {
  userId: string;
  query: PostgresQueryFn;
  tableName?: string;
  autoMigrate?: boolean;
}

function normalizeDismissedIds(row: QueryResultRow | undefined): string[] {
  if (!row) return [];
  const ids = row.dismissed_ids ?? row.dismissedIds;
  if (!Array.isArray(ids)) return [];
  return ids.filter((id): id is string => typeof id === "string");
}

function normalizeWatermark(row: QueryResultRow | undefined): string | null {
  if (!row) return null;
  return row.watermark ?? null;
}

function normalizeLastSeen(row: QueryResultRow | undefined): string {
  if (!row) return new Date(0).toISOString();
  return row.last_seen ?? row.lastSeen ?? new Date(0).toISOString();
}

/**
 * Postgres-backed storage adapter.
 *
 * This adapter is dependency-free by design and accepts a user-provided
 * query function, allowing integration with pg, drizzle, prisma, etc.
 */
export class PostgresAdapter implements ServerStorageAdapter {
  readonly userId: string;

  private readonly query: PostgresQueryFn;
  private readonly tableName: string;
  private readonly autoMigrate: boolean;
  private watermark: string | null = null;
  private dismissedIds = new Set<string>();
  private initialized = false;

  constructor(options: PostgresAdapterOptions) {
    if (!options.userId) {
      throw new Error("PostgresAdapter: userId is required");
    }
    this.userId = options.userId;
    this.query = options.query;
    this.tableName = options.tableName ?? "featuredrop_state";
    this.autoMigrate = options.autoMigrate ?? true;
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
    await this.ensureReady();
    await this.query(
      `INSERT INTO ${this.tableName} (user_id, watermark, dismissed_ids, last_seen, created_at, updated_at)
       VALUES ($1, $2, '{}', NOW(), NOW(), NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET watermark = EXCLUDED.watermark, dismissed_ids = '{}', last_seen = NOW(), updated_at = NOW()`,
      [this.userId, this.watermark],
    );
  }

  async sync(): Promise<void> {
    await this.ensureReady();
    const result = await this.query<QueryResultRow>(
      `SELECT watermark, dismissed_ids, last_seen
       FROM ${this.tableName}
       WHERE user_id = $1`,
      [this.userId],
    );
    const row = result.rows[0];
    this.watermark = normalizeWatermark(row);
    this.dismissedIds = new Set(normalizeDismissedIds(row));
  }

  async dismissBatch(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await this.ensureReady();
    const uniqueIds = Array.from(new Set(ids));
    await this.query(
      `INSERT INTO ${this.tableName} (user_id, watermark, dismissed_ids, last_seen, created_at, updated_at)
       VALUES ($1, NULL, $2::text[], NOW(), NOW(), NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET
         dismissed_ids = (
           SELECT ARRAY(
             SELECT DISTINCT x FROM UNNEST(
               COALESCE(${this.tableName}.dismissed_ids, '{}') || EXCLUDED.dismissed_ids
             ) AS x
           )
         ),
         last_seen = NOW(),
         updated_at = NOW()`,
      [this.userId, uniqueIds],
    );
  }

  async resetUser(userId: string): Promise<void> {
    await this.ensureReady();
    await this.query(
      `DELETE FROM ${this.tableName} WHERE user_id = $1`,
      [userId],
    );
    if (userId === this.userId) {
      this.watermark = null;
      this.dismissedIds.clear();
    }
  }

  async getBulkState(userIds: string[]): Promise<Map<string, DismissalState>> {
    await this.ensureReady();
    if (userIds.length === 0) return new Map();

    const result = await this.query<QueryResultRow & { user_id: string }>(
      `SELECT user_id, watermark, dismissed_ids, last_seen
       FROM ${this.tableName}
       WHERE user_id = ANY($1::text[])`,
      [userIds],
    );

    const out = new Map<string, DismissalState>();
    for (const row of result.rows) {
      out.set(row.user_id, {
        watermark: normalizeWatermark(row),
        dismissedIds: normalizeDismissedIds(row),
        lastSeen: normalizeLastSeen(row),
        deviceCount: 1,
      });
    }
    return out;
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.query("SELECT 1");
      return true;
    } catch {
      return false;
    }
  }

  async destroy(): Promise<void> {
    // No-op by default. Caller owns the pool/connection lifecycle.
  }

  private async ensureReady(): Promise<void> {
    if (this.initialized) return;
    if (this.autoMigrate) {
      await this.query(
        `CREATE TABLE IF NOT EXISTS ${this.tableName} (
          user_id TEXT PRIMARY KEY,
          watermark TIMESTAMPTZ,
          dismissed_ids TEXT[] DEFAULT '{}',
          last_seen TIMESTAMPTZ DEFAULT NOW(),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )`,
      );
      await this.query(
        `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_last_seen ON ${this.tableName}(last_seen)`,
      );
    }
    this.initialized = true;
  }
}
