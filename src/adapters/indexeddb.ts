import type { StorageAdapter } from "../types";

export interface IndexedDBAdapterOptions {
  prefix?: string;
  watermark?: string | null;
  dbName?: string;
  storeName?: string;
  onDismissAll?: (now: Date) => Promise<void>;
  /** Optional remote state fetch for offline-first sync reconciliation. */
  onSyncState?: () => Promise<{ watermark?: string | null; dismissedIds?: string[] }>;
  /** Optional remote flush for queued single-dismiss operations. */
  onFlushDismissBatch?: (ids: string[]) => Promise<void>;
  /** Optional remote flush for queued dismiss-all operations. */
  onFlushDismissAll?: (watermark: string) => Promise<void>;
  /** Delay before queued operations are flushed. Default: 500ms. */
  flushDebounceMs?: number;
  /** Attach online/visibility listeners to trigger sync+flush. Default: true in browser. */
  autoSyncOnOnline?: boolean;
}

interface PersistedState {
  watermark: string | null;
  dismissed: string[];
  queue?: PersistedQueueOperation[];
}

type PersistedQueueOperation =
  | { type: "dismiss"; id: string }
  | { type: "dismissAll"; watermark: string };

interface SyncStatePayload {
  watermark?: string | null;
  dismissedIds?: string[];
}

const DISMISSED_SUFFIX = ":dismissed";
const WATERMARK_SUFFIX = ":watermark";
const QUEUE_SUFFIX = ":queue";

function canUseLocalStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readLocalStorageState(prefix: string): PersistedState {
  if (!canUseLocalStorage()) {
    return { watermark: null, dismissed: [], queue: [] };
  }
  try {
    const dismissedRaw = localStorage.getItem(`${prefix}${DISMISSED_SUFFIX}`);
    const watermarkRaw = localStorage.getItem(`${prefix}${WATERMARK_SUFFIX}`);
    const queueRaw = localStorage.getItem(`${prefix}${QUEUE_SUFFIX}`);
    const dismissedParsed = dismissedRaw ? JSON.parse(dismissedRaw) as unknown : [];
    const queueParsed = queueRaw ? JSON.parse(queueRaw) as unknown : [];
    return {
      watermark: typeof watermarkRaw === "string" ? watermarkRaw : null,
      dismissed: Array.isArray(dismissedParsed)
        ? dismissedParsed.filter((value): value is string => typeof value === "string")
        : [],
      queue: normalizeQueue(queueParsed),
    };
  } catch {
    return { watermark: null, dismissed: [], queue: [] };
  }
}

function writeLocalStorageState(prefix: string, state: PersistedState): void {
  if (!canUseLocalStorage()) return;
  try {
    localStorage.setItem(`${prefix}${DISMISSED_SUFFIX}`, JSON.stringify(state.dismissed));
    if (state.watermark) {
      localStorage.setItem(`${prefix}${WATERMARK_SUFFIX}`, state.watermark);
    } else {
      localStorage.removeItem(`${prefix}${WATERMARK_SUFFIX}`);
    }
    if (state.queue && state.queue.length > 0) {
      localStorage.setItem(`${prefix}${QUEUE_SUFFIX}`, JSON.stringify(state.queue));
    } else {
      localStorage.removeItem(`${prefix}${QUEUE_SUFFIX}`);
    }
  } catch {
    // ignore storage write errors
  }
}

function getIndexedDBFactory(): IDBFactory | null {
  if (typeof globalThis === "undefined") return null;
  const candidate = globalThis.indexedDB as IDBFactory | undefined;
  return candidate ?? null;
}

function normalizeQueue(value: unknown): PersistedQueueOperation[] {
  if (!Array.isArray(value)) return [];
  const queue: PersistedQueueOperation[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const candidate = item as Record<string, unknown>;
    if (candidate.type === "dismiss" && typeof candidate.id === "string") {
      queue.push({ type: "dismiss", id: candidate.id });
      continue;
    }
    if (candidate.type === "dismissAll" && typeof candidate.watermark === "string") {
      queue.push({ type: "dismissAll", watermark: candidate.watermark });
      continue;
    }
  }
  return queue;
}

function normalizeDismissedIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string");
}

function parseIso(value: string | null | undefined): number {
  if (!value) return Number.NaN;
  return new Date(value).getTime();
}

function resolveLatestWatermark(a: string | null, b: string | null): string | null {
  if (!a) return b ?? null;
  if (!b) return a;
  const aTs = parseIso(a);
  const bTs = parseIso(b);
  if (!Number.isFinite(aTs)) return b;
  if (!Number.isFinite(bTs)) return a;
  return aTs >= bTs ? a : b;
}

export class IndexedDBAdapter implements StorageAdapter {
  private readonly prefix: string;
  private readonly dbName: string;
  private readonly storeName: string;
  private readonly onDismissAllCallback?: (now: Date) => Promise<void>;
  private readonly onSyncStateCallback?: () => Promise<SyncStatePayload>;
  private readonly onFlushDismissBatchCallback?: (ids: string[]) => Promise<void>;
  private readonly onFlushDismissAllCallback?: (watermark: string) => Promise<void>;
  private readonly flushDebounceMs: number;
  private readonly autoSyncOnOnline: boolean;
  private watermark: string | null;
  private dismissed: Set<string>;
  private queue: PersistedQueueOperation[];
  private readonly hydratePromise: Promise<void>;
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private flushing = false;
  private readonly boundOnlineHandler: (() => void) | null;
  private readonly boundVisibilityHandler: (() => void) | null;

  constructor(options: IndexedDBAdapterOptions = {}) {
    this.prefix = options.prefix ?? "featuredrop";
    this.dbName = options.dbName ?? "featuredrop";
    this.storeName = options.storeName ?? "state";
    this.onDismissAllCallback = options.onDismissAll;
    this.onSyncStateCallback = options.onSyncState;
    this.onFlushDismissBatchCallback = options.onFlushDismissBatch;
    this.onFlushDismissAllCallback = options.onFlushDismissAll;
    this.flushDebounceMs = options.flushDebounceMs ?? 500;
    this.autoSyncOnOnline = options.autoSyncOnOnline ?? true;

    const localState = readLocalStorageState(this.prefix);
    this.watermark = options.watermark ?? localState.watermark;
    this.dismissed = new Set(localState.dismissed);
    this.queue = localState.queue ?? [];
    this.hydratePromise = this.hydrateFromIndexedDB();

    const canAttachListeners = this.autoSyncOnOnline && typeof window !== "undefined";
    if (canAttachListeners) {
      this.boundOnlineHandler = () => {
        void this.syncFromRemote();
      };
      this.boundVisibilityHandler = () => {
        if (document.visibilityState === "visible") {
          void this.syncFromRemote();
        }
      };
      window.addEventListener("online", this.boundOnlineHandler);
      document.addEventListener("visibilitychange", this.boundVisibilityHandler);
    } else {
      this.boundOnlineHandler = null;
      this.boundVisibilityHandler = null;
    }
  }

  getWatermark(): string | null {
    return this.watermark;
  }

  getDismissedIds(): ReadonlySet<string> {
    return this.dismissed;
  }

  dismiss(id: string): void {
    if (!id || this.dismissed.has(id)) return;
    this.dismissed = new Set(this.dismissed).add(id);
    this.queue.push({ type: "dismiss", id });
    this.persist();
    this.scheduleFlush();
  }

  async dismissAll(now: Date): Promise<void> {
    this.watermark = now.toISOString();
    this.dismissed = new Set();
    this.queue = [{ type: "dismissAll", watermark: this.watermark }];
    this.persist();
    this.scheduleFlush();
    await this.onDismissAllCallback?.(now);
  }

  /** Flush queued dismiss operations to optional remote callbacks. */
  async flushQueue(): Promise<void> {
    if (this.flushing || this.queue.length === 0) return;
    if (!this.onFlushDismissBatchCallback && !this.onFlushDismissAllCallback) return;

    this.flushing = true;
    try {
      const operations = [...this.queue];
      const lastDismissAll = this.getLastDismissAll(operations);
      const dismissIds = this.collectDismissBatch(operations, !!lastDismissAll);
      const hasDismissAll = !!lastDismissAll;
      const needsDismissBatch = dismissIds.length > 0;

      // If caller only provided one remote callback, keep unsupported operations queued.
      if (hasDismissAll && !this.onFlushDismissAllCallback) return;
      if (needsDismissBatch && !this.onFlushDismissBatchCallback) return;

      if (lastDismissAll && this.onFlushDismissAllCallback) {
        await this.onFlushDismissAllCallback(lastDismissAll.watermark);
      }

      if (dismissIds.length > 0 && this.onFlushDismissBatchCallback) {
        await this.onFlushDismissBatchCallback(dismissIds);
      }

      // Clear all operations that were part of this flush snapshot.
      if (this.queue.length <= operations.length) {
        this.queue = [];
      } else {
        this.queue = this.queue.slice(operations.length);
      }
      this.persist();
    } catch {
      // Keep queue for retry after network recovery.
    } finally {
      this.flushing = false;
    }
  }

  /** Merge local state with optional remote source, then flush queued writes. */
  async syncFromRemote(): Promise<void> {
    await this.hydratePromise.catch(() => undefined);
    if (this.onSyncStateCallback) {
      try {
        const remote = await this.onSyncStateCallback();
        const mergedDismissed = new Set<string>(this.dismissed);
        for (const id of normalizeDismissedIds(remote.dismissedIds)) {
          mergedDismissed.add(id);
        }
        this.dismissed = mergedDismissed;
        this.watermark = resolveLatestWatermark(this.watermark, remote.watermark ?? null);
        this.persist();
      } catch {
        // Keep local state if remote sync fails.
      }
    }
    await this.flushQueue();
  }

  /** Cleanup optional browser listeners. */
  destroy(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.boundOnlineHandler && typeof window !== "undefined") {
      window.removeEventListener("online", this.boundOnlineHandler);
    }
    if (this.boundVisibilityHandler && typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", this.boundVisibilityHandler);
    }
  }

  private persist(): void {
    const snapshot = {
      watermark: this.watermark,
      dismissed: Array.from(this.dismissed),
      queue: this.queue,
    };
    writeLocalStorageState(this.prefix, snapshot);
    void this.writeIndexedDBState(snapshot);
  }

  private async hydrateFromIndexedDB(): Promise<void> {
    const state = await this.readIndexedDBState();
    if (!state) return;
    this.watermark = state.watermark;
    this.dismissed = new Set(state.dismissed);
    this.queue = state.queue ?? [];
    writeLocalStorageState(this.prefix, state);
  }

  private async readIndexedDBState(): Promise<PersistedState | null> {
    const db = await this.openDb();
    if (!db) return null;

    return new Promise((resolve) => {
      const tx = db.transaction(this.storeName, "readonly");
      const store = tx.objectStore(this.storeName);
      const request = store.get(this.prefix);
      request.onsuccess = () => {
        const value = request.result as PersistedState | undefined;
        if (!value) {
          resolve(null);
          return;
        }
        resolve({
          watermark: typeof value.watermark === "string" ? value.watermark : null,
          dismissed: normalizeDismissedIds(value.dismissed),
          queue: normalizeQueue(value.queue),
        });
      };
      request.onerror = () => resolve(null);
    });
  }

  private async writeIndexedDBState(state: PersistedState): Promise<void> {
    await this.hydratePromise.catch(() => undefined);
    const db = await this.openDb();
    if (!db) return;

    await new Promise<void>((resolve) => {
      const tx = db.transaction(this.storeName, "readwrite");
      const store = tx.objectStore(this.storeName);
      store.put(state, this.prefix);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    });
  }

  private async openDb(): Promise<IDBDatabase | null> {
    const factory = getIndexedDBFactory();
    if (!factory) return null;

    return new Promise((resolve) => {
      const request = factory.open(this.dbName, 1);
      request.onerror = () => resolve(null);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
      request.onsuccess = () => resolve(request.result);
    });
  }

  private scheduleFlush(): void {
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      void this.flushQueue();
    }, this.flushDebounceMs);
  }

  private getLastDismissAll(operations: PersistedQueueOperation[]): { watermark: string } | null {
    for (let index = operations.length - 1; index >= 0; index--) {
      const operation = operations[index];
      if (operation.type === "dismissAll") {
        return { watermark: operation.watermark };
      }
    }
    return null;
  }

  private collectDismissBatch(
    operations: PersistedQueueOperation[],
    skipBeforeDismissAll: boolean,
  ): string[] {
    const startIndex = skipBeforeDismissAll
      ? operations.reduce(
          (lastIndex, operation, index) =>
            operation.type === "dismissAll" ? index : lastIndex,
          -1,
        )
      : -1;
    const batch = new Set<string>();
    for (let index = startIndex + 1; index < operations.length; index++) {
      const operation = operations[index];
      if (operation.type === "dismiss") {
        batch.add(operation.id);
      }
    }
    return Array.from(batch);
  }
}
