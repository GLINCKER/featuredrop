import type { DismissalState, ServerStorageAdapter, StorageAdapter } from "../types";

export interface HybridAdapterOptions {
  local: StorageAdapter;
  remote: ServerStorageAdapter;
  /** If true, sync from remote before writes. Default false */
  syncBeforeWrite?: boolean;
}

/**
 * Hybrid adapter that combines local immediacy with remote persistence.
 */
export class HybridAdapter implements ServerStorageAdapter {
  readonly userId: string;

  private readonly local: StorageAdapter;
  private readonly remote: ServerStorageAdapter;
  private readonly syncBeforeWrite: boolean;

  constructor(options: HybridAdapterOptions) {
    this.local = options.local;
    this.remote = options.remote;
    this.userId = options.remote.userId;
    this.syncBeforeWrite = options.syncBeforeWrite ?? false;
  }

  getWatermark(): string | null {
    return this.local.getWatermark() ?? this.remote.getWatermark();
  }

  getDismissedIds(): ReadonlySet<string> {
    const merged = new Set<string>();
    for (const id of this.local.getDismissedIds()) merged.add(id);
    for (const id of this.remote.getDismissedIds()) merged.add(id);
    return merged;
  }

  dismiss(id: string): void {
    this.local.dismiss(id);
    this.remote.dismiss(id);
  }

  async dismissAll(now: Date): Promise<void> {
    await Promise.all([
      this.local.dismissAll(now),
      this.remote.dismissAll(now),
    ]);
  }

  async sync(): Promise<void> {
    await this.remote.sync();
  }

  async dismissBatch(ids: string[]): Promise<void> {
    if (this.syncBeforeWrite) {
      await this.remote.sync();
    }
    for (const id of ids) {
      this.local.dismiss(id);
    }
    await this.remote.dismissBatch(ids);
  }

  async resetUser(userId: string): Promise<void> {
    await this.remote.resetUser(userId);
    if (userId === this.userId) {
      await this.local.dismissAll(new Date(0));
    }
  }

  async getBulkState(userIds: string[]): Promise<Map<string, DismissalState>> {
    return this.remote.getBulkState(userIds);
  }

  async isHealthy(): Promise<boolean> {
    return this.remote.isHealthy();
  }

  async destroy(): Promise<void> {
    await this.remote.destroy();
  }
}
