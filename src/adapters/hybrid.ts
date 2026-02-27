import type { DismissalState, ServerStorageAdapter, StorageAdapter } from "../types";

export interface HybridAdapterOptions {
  local: StorageAdapter;
  remote: ServerStorageAdapter;
  /** If true, sync from remote before writes. Default false */
  syncBeforeWrite?: boolean;
  /** Batch window for queued dismiss writes. Default: 500ms */
  dismissBatchWindowMs?: number;
  /** Optional periodic sync interval in ms. Default: disabled (0) */
  syncIntervalMs?: number;
  /** Sync on browser visibility return. Default: true */
  syncOnVisibilityChange?: boolean;
  /** Sync on browser online event. Default: true */
  syncOnOnline?: boolean;
}

/**
 * Hybrid adapter that combines local immediacy with remote persistence.
 */
export class HybridAdapter implements ServerStorageAdapter {
  readonly userId: string;

  private readonly local: StorageAdapter;
  private readonly remote: ServerStorageAdapter;
  private readonly syncBeforeWrite: boolean;
  private readonly dismissBatchWindowMs: number;
  private readonly syncIntervalMs: number;
  private readonly syncOnVisibilityChange: boolean;
  private readonly syncOnOnline: boolean;
  private pendingDismissIds = new Set<string>();
  private dismissTimer: ReturnType<typeof setTimeout> | null = null;
  private syncTimer: ReturnType<typeof setInterval> | null = null;
  private flushInFlight: Promise<void> | null = null;
  private syncInFlight: Promise<void> | null = null;
  private readonly boundVisibilityHandler: (() => void) | null;
  private readonly boundOnlineHandler: (() => void) | null;

  constructor(options: HybridAdapterOptions) {
    this.local = options.local;
    this.remote = options.remote;
    this.userId = options.remote.userId;
    this.syncBeforeWrite = options.syncBeforeWrite ?? false;
    this.dismissBatchWindowMs = options.dismissBatchWindowMs ?? 500;
    this.syncIntervalMs = options.syncIntervalMs ?? 0;
    this.syncOnVisibilityChange = options.syncOnVisibilityChange ?? true;
    this.syncOnOnline = options.syncOnOnline ?? true;

    if (typeof window !== "undefined" && this.syncOnOnline) {
      this.boundOnlineHandler = () => {
        void this.sync();
      };
      window.addEventListener("online", this.boundOnlineHandler);
    } else {
      this.boundOnlineHandler = null;
    }

    if (typeof document !== "undefined" && this.syncOnVisibilityChange) {
      this.boundVisibilityHandler = () => {
        if (document.visibilityState === "visible") {
          void this.sync();
        }
      };
      document.addEventListener("visibilitychange", this.boundVisibilityHandler);
    } else {
      this.boundVisibilityHandler = null;
    }

    if (this.syncIntervalMs > 0) {
      this.syncTimer = setInterval(() => {
        void this.sync();
      }, this.syncIntervalMs);
    }
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
    this.pendingDismissIds.add(id);
    this.scheduleDismissFlush();
  }

  async dismissAll(now: Date): Promise<void> {
    await this.flushPendingDismisses();
    this.pendingDismissIds.clear();
    await Promise.all([
      this.local.dismissAll(now),
      this.remote.dismissAll(now),
    ]);
  }

  async sync(): Promise<void> {
    if (this.syncInFlight) return this.syncInFlight;
    const syncTask = (async () => {
      await this.remote.sync();
      // Drain any queued dismisses after connectivity/state reconciliation.
      await this.flushPendingDismissesInternal(true);
    })();
    const inFlight = syncTask.finally(() => {
      if (this.syncInFlight === inFlight) this.syncInFlight = null;
    });
    this.syncInFlight = inFlight;
    return inFlight;
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
    if (this.dismissTimer) {
      clearTimeout(this.dismissTimer);
      this.dismissTimer = null;
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
    await this.flushPendingDismisses();
    await this.remote.destroy();
  }

  /** Manually flush queued dismiss operations to the remote adapter. */
  async flushPendingDismisses(): Promise<void> {
    if (this.flushInFlight) return this.flushInFlight;
    const flushTask = this.flushPendingDismissesInternal(false);
    const inFlight = flushTask.finally(() => {
      if (this.flushInFlight === inFlight) this.flushInFlight = null;
    });
    this.flushInFlight = inFlight;
    return inFlight;
  }

  private async flushPendingDismissesInternal(skipSyncBeforeWrite: boolean): Promise<void> {
    // Keep draining until no queued ids remain. This handles new dismisses added while flushing.
    while (this.pendingDismissIds.size > 0) {
      const ids = Array.from(this.pendingDismissIds);
      this.pendingDismissIds.clear();
      try {
        if (this.syncBeforeWrite && !skipSyncBeforeWrite) {
          await this.remote.sync();
        }
        await this.remote.dismissBatch(ids);
      } catch {
        // Put failed ids back into queue for retry.
        for (const id of ids) this.pendingDismissIds.add(id);
        return;
      }
    }
  }

  private scheduleDismissFlush(): void {
    if (this.dismissTimer) return;
    this.dismissTimer = setTimeout(() => {
      this.dismissTimer = null;
      void this.flushPendingDismisses();
    }, this.dismissBatchWindowMs);
  }
}
