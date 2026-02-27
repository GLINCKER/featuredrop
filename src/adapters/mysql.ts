import type { DismissalState, ServerStorageAdapter } from "../types";

interface MySQLRow {
  user_id?: string;
  watermark?: string | null;
  dismissed_ids?: string[] | string | null;
  dismissedIds?: string[] | string | null;
  last_seen?: string | null;
  lastSeen?: string | null;
}

export interface MySQLQueryResult<T = MySQLRow> {
  rows: T[];
}

export type MySQLQueryFn = <T = MySQLRow>(
  sql: string,
  params?: unknown[],
) => Promise<MySQLQueryResult<T>>;

export interface MySQLAdapterOptions {
  userId: string;
  query: MySQLQueryFn;
  tableName?: string;
  autoMigrate?: boolean;
}

function parseDismissedIds(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === "string");
      }
    } catch {
      return [];
    }
  }
  return [];
}

function normalizeDismissedIds(row: MySQLRow | undefined): string[] {
  if (!row) return [];
  return parseDismissedIds(row.dismissed_ids ?? row.dismissedIds);
}

function normalizeWatermark(row: MySQLRow | undefined): string | null {
  if (!row) return null;
  return row.watermark ?? null;
}

function normalizeLastSeen(row: MySQLRow | undefined): string {
  if (!row) return new Date(0).toISOString();
  return row.last_seen ?? row.lastSeen ?? new Date(0).toISOString();
}

export class MySQLAdapter implements ServerStorageAdapter {
  readonly userId: string;

  private readonly query: MySQLQueryFn;
  private readonly tableName: string;
  private readonly autoMigrate: boolean;
  private watermark: string | null = null;
  private dismissedIds = new Set<string>();
  private initialized = false;

  constructor(options: MySQLAdapterOptions) {
    if (!options.userId) {
      throw new Error("MySQLAdapter: userId is required");
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
       VALUES (?, ?, ?, NOW(3), NOW(3), NOW(3))
       ON DUPLICATE KEY UPDATE watermark = VALUES(watermark), dismissed_ids = VALUES(dismissed_ids), last_seen = NOW(3), updated_at = NOW(3)`,
      [this.userId, this.watermark, JSON.stringify([])],
    );
  }

  async sync(): Promise<void> {
    await this.ensureReady();
    const result = await this.query<MySQLRow>(
      `SELECT watermark, dismissed_ids, last_seen FROM ${this.tableName} WHERE user_id = ? LIMIT 1`,
      [this.userId],
    );
    const row = result.rows[0];
    this.watermark = normalizeWatermark(row);
    this.dismissedIds = new Set(normalizeDismissedIds(row));
  }

  async dismissBatch(ids: string[]): Promise<void> {
    const uniqueIds = Array.from(new Set(ids));
    if (uniqueIds.length === 0) return;
    await this.ensureReady();

    const merged = new Set<string>([
      ...Array.from(this.dismissedIds),
      ...uniqueIds,
    ]);
    const mergedArray = Array.from(merged);
    this.dismissedIds = merged;

    await this.query(
      `INSERT INTO ${this.tableName} (user_id, watermark, dismissed_ids, last_seen, created_at, updated_at)
       VALUES (?, ?, ?, NOW(3), NOW(3), NOW(3))
       ON DUPLICATE KEY UPDATE dismissed_ids = VALUES(dismissed_ids), last_seen = NOW(3), updated_at = NOW(3)`,
      [this.userId, this.watermark, JSON.stringify(mergedArray)],
    );
  }

  async resetUser(userId: string): Promise<void> {
    await this.ensureReady();
    await this.query(`DELETE FROM ${this.tableName} WHERE user_id = ?`, [userId]);
    if (userId === this.userId) {
      this.watermark = null;
      this.dismissedIds.clear();
    }
  }

  async getBulkState(userIds: string[]): Promise<Map<string, DismissalState>> {
    await this.ensureReady();
    if (userIds.length === 0) return new Map();
    const placeholders = userIds.map(() => "?").join(", ");
    const result = await this.query<MySQLRow & { user_id: string }>(
      `SELECT user_id, watermark, dismissed_ids, last_seen
       FROM ${this.tableName}
       WHERE user_id IN (${placeholders})`,
      userIds,
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
    // No-op by default. Caller owns the client/pool lifecycle.
  }

  private async ensureReady(): Promise<void> {
    if (this.initialized) return;
    if (this.autoMigrate) {
      await this.query(
        `CREATE TABLE IF NOT EXISTS ${this.tableName} (
          user_id VARCHAR(255) PRIMARY KEY,
          watermark DATETIME(3) NULL,
          dismissed_ids JSON NOT NULL,
          last_seen DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
        )`,
      );
      await this.query(
        `CREATE INDEX idx_${this.tableName}_last_seen ON ${this.tableName}(last_seen)`,
      );
    }
    this.initialized = true;
  }
}
