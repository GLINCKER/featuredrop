import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { MemoryAdapter } from "../adapters/memory";
import { LocalStorageAdapter } from "../adapters/local-storage";
import { IndexedDBAdapter } from "../adapters/indexeddb";

// ── MemoryAdapter ────────────────────────────────────────────────────────────

describe("MemoryAdapter", () => {
  it("returns null watermark by default", () => {
    const adapter = new MemoryAdapter();
    expect(adapter.getWatermark()).toBeNull();
  });

  it("returns provided watermark", () => {
    const adapter = new MemoryAdapter({ watermark: "2026-02-20T00:00:00Z" });
    expect(adapter.getWatermark()).toBe("2026-02-20T00:00:00Z");
  });

  it("returns empty dismissed set initially", () => {
    const adapter = new MemoryAdapter();
    expect(adapter.getDismissedIds().size).toBe(0);
  });

  it("dismisses a feature", () => {
    const adapter = new MemoryAdapter();
    adapter.dismiss("feat-1");
    expect(adapter.getDismissedIds().has("feat-1")).toBe(true);
  });

  it("handles multiple dismissals", () => {
    const adapter = new MemoryAdapter();
    adapter.dismiss("feat-1");
    adapter.dismiss("feat-2");
    const ids = adapter.getDismissedIds();
    expect(ids.has("feat-1")).toBe(true);
    expect(ids.has("feat-2")).toBe(true);
    expect(ids.size).toBe(2);
  });

  it("dismissAll sets watermark and clears dismissed", async () => {
    const adapter = new MemoryAdapter();
    adapter.dismiss("feat-1");
    const now = new Date("2026-02-25T00:00:00Z");
    await adapter.dismissAll(now);
    expect(adapter.getWatermark()).toBe(now.toISOString());
    expect(adapter.getDismissedIds().size).toBe(0);
  });

  it("handles duplicate dismiss calls", () => {
    const adapter = new MemoryAdapter();
    adapter.dismiss("feat-1");
    adapter.dismiss("feat-1");
    expect(adapter.getDismissedIds().size).toBe(1);
  });
});

// ── LocalStorageAdapter (with mock localStorage) ─────────────────────────────

function createMockLocalStorage() {
  const store = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => store.set(key, value)),
    removeItem: vi.fn((key: string) => store.delete(key)),
    store,
  };
}

describe("LocalStorageAdapter", () => {
  let mockStorage: ReturnType<typeof createMockLocalStorage>;

  beforeEach(() => {
    mockStorage = createMockLocalStorage();
    vi.stubGlobal("localStorage", mockStorage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns provided watermark", () => {
    const adapter = new LocalStorageAdapter({
      watermark: "2026-02-20T00:00:00Z",
    });
    expect(adapter.getWatermark()).toBe("2026-02-20T00:00:00Z");
  });

  it("returns null watermark by default", () => {
    const adapter = new LocalStorageAdapter();
    expect(adapter.getWatermark()).toBeNull();
  });

  it("returns empty dismissed set initially", () => {
    const adapter = new LocalStorageAdapter();
    expect(adapter.getDismissedIds().size).toBe(0);
  });

  it("dismisses a feature to localStorage", () => {
    const adapter = new LocalStorageAdapter();
    adapter.dismiss("feat-1");
    expect(adapter.getDismissedIds().has("feat-1")).toBe(true);
    // Verify localStorage was written
    const raw = mockStorage.getItem("featuredrop:dismissed");
    expect(JSON.parse(raw!)).toEqual(["feat-1"]);
  });

  it("handles multiple dismissals", () => {
    const adapter = new LocalStorageAdapter();
    adapter.dismiss("feat-1");
    adapter.dismiss("feat-2");
    const ids = adapter.getDismissedIds();
    expect(ids.has("feat-1")).toBe(true);
    expect(ids.has("feat-2")).toBe(true);
  });

  it("does not duplicate dismissed IDs", () => {
    const adapter = new LocalStorageAdapter();
    adapter.dismiss("feat-1");
    adapter.dismiss("feat-1");
    const raw = mockStorage.getItem("featuredrop:dismissed");
    expect(JSON.parse(raw!)).toEqual(["feat-1"]);
  });

  it("uses custom prefix", () => {
    const adapter = new LocalStorageAdapter({ prefix: "myapp" });
    adapter.dismiss("feat-1");
    expect(mockStorage.getItem("myapp:dismissed")).toBeTruthy();
    expect(mockStorage.getItem("featuredrop:dismissed")).toBeNull();
  });

  it("dismissAll clears localStorage and calls callback", async () => {
    const onDismissAll = vi.fn().mockResolvedValue(undefined);
    const adapter = new LocalStorageAdapter({ onDismissAll });
    adapter.dismiss("feat-1");
    const now = new Date("2026-02-25T00:00:00Z");
    await adapter.dismissAll(now);
    expect(mockStorage.removeItem).toHaveBeenCalledWith("featuredrop:dismissed");
    expect(onDismissAll).toHaveBeenCalledWith(now);
  });

  it("dismissAll works without callback", async () => {
    const adapter = new LocalStorageAdapter();
    adapter.dismiss("feat-1");
    await adapter.dismissAll(new Date());
    expect(mockStorage.removeItem).toHaveBeenCalledWith("featuredrop:dismissed");
  });

  it("handles corrupt localStorage data gracefully", () => {
    mockStorage.store.set("featuredrop:dismissed", "not-json{{{");
    const adapter = new LocalStorageAdapter();
    expect(adapter.getDismissedIds().size).toBe(0);
  });

  it("handles non-array localStorage data gracefully", () => {
    mockStorage.store.set("featuredrop:dismissed", '"a string"');
    const adapter = new LocalStorageAdapter();
    expect(adapter.getDismissedIds().size).toBe(0);
  });
});

// ── LocalStorageAdapter SSR Fallback ─────────────────────────────────────────

describe("LocalStorageAdapter SSR fallback", () => {
  it("returns empty dismissed set when window is undefined", () => {
    const originalWindow = globalThis.window;
    // @ts-expect-error -- simulating SSR
    delete globalThis.window;
    try {
      const adapter = new LocalStorageAdapter();
      expect(adapter.getDismissedIds().size).toBe(0);
    } finally {
      globalThis.window = originalWindow;
    }
  });

  it("dismiss is a no-op when window is undefined", () => {
    const originalWindow = globalThis.window;
    // @ts-expect-error -- simulating SSR
    delete globalThis.window;
    try {
      const adapter = new LocalStorageAdapter();
      // Should not throw
      adapter.dismiss("feat-1");
    } finally {
      globalThis.window = originalWindow;
    }
  });
});

// ── IndexedDBAdapter (localStorage fallback behavior) ────────────────────────

describe("IndexedDBAdapter", () => {
  let mockStorage: ReturnType<typeof createMockLocalStorage>;
  const adaptersToDestroy: IndexedDBAdapter[] = [];

  beforeEach(() => {
    mockStorage = createMockLocalStorage();
    vi.stubGlobal("localStorage", mockStorage);
    vi.stubGlobal("indexedDB", undefined);
  });

  afterEach(() => {
    while (adaptersToDestroy.length > 0) {
      adaptersToDestroy.pop()?.destroy();
    }
    vi.unstubAllGlobals();
  });

  it("hydrates from localStorage snapshot when available", () => {
    mockStorage.store.set("featuredrop:dismissed", JSON.stringify(["a", "b"]));
    mockStorage.store.set("featuredrop:watermark", "2026-02-20T00:00:00Z");
    const adapter = new IndexedDBAdapter();
    adaptersToDestroy.push(adapter);
    expect(adapter.getWatermark()).toBe("2026-02-20T00:00:00Z");
    expect(adapter.getDismissedIds().has("a")).toBe(true);
  });

  it("dismiss persists ids to localStorage", () => {
    const adapter = new IndexedDBAdapter();
    adaptersToDestroy.push(adapter);
    adapter.dismiss("indexed-1");
    expect(adapter.getDismissedIds().has("indexed-1")).toBe(true);
    expect(mockStorage.getItem("featuredrop:dismissed")).toContain("indexed-1");
  });

  it("dismissAll clears ids and stores latest watermark", async () => {
    const onDismissAll = vi.fn().mockResolvedValue(undefined);
    const adapter = new IndexedDBAdapter({ onDismissAll });
    adaptersToDestroy.push(adapter);
    adapter.dismiss("indexed-1");
    const now = new Date("2026-03-01T00:00:00Z");
    await adapter.dismissAll(now);
    expect(adapter.getDismissedIds().size).toBe(0);
    expect(adapter.getWatermark()).toBe("2026-03-01T00:00:00.000Z");
    expect(onDismissAll).toHaveBeenCalledWith(now);
  });

  it("flushes queued dismiss operations in batch", async () => {
    const onFlushDismissBatch = vi.fn().mockResolvedValue(undefined);
    const adapter = new IndexedDBAdapter({
      onFlushDismissBatch,
      flushDebounceMs: 0,
    });
    adaptersToDestroy.push(adapter);

    adapter.dismiss("a");
    adapter.dismiss("b");
    await adapter.flushQueue();

    expect(onFlushDismissBatch).toHaveBeenCalledTimes(1);
    expect(onFlushDismissBatch).toHaveBeenCalledWith(["a", "b"]);
    expect(mockStorage.getItem("featuredrop:queue")).toBeNull();
  });

  it("keeps queued operations when remote flush fails", async () => {
    const onFlushDismissBatch = vi.fn().mockRejectedValue(new Error("offline"));
    const adapter = new IndexedDBAdapter({
      onFlushDismissBatch,
      flushDebounceMs: 0,
    });
    adaptersToDestroy.push(adapter);

    adapter.dismiss("a");
    await adapter.flushQueue();
    expect(onFlushDismissBatch).toHaveBeenCalledTimes(1);
    expect(mockStorage.getItem("featuredrop:queue")).toContain("\"a\"");
  });

  it("syncFromRemote merges dismissed IDs and keeps latest watermark", async () => {
    const adapter = new IndexedDBAdapter({
      watermark: "2026-03-01T00:00:00Z",
      onSyncState: vi.fn().mockResolvedValue({
        watermark: "2026-03-05T00:00:00Z",
        dismissedIds: ["remote-1"],
      }),
      autoSyncOnOnline: false,
    });
    adaptersToDestroy.push(adapter);

    adapter.dismiss("local-1");
    await adapter.syncFromRemote();

    const ids = adapter.getDismissedIds();
    expect(ids.has("local-1")).toBe(true);
    expect(ids.has("remote-1")).toBe(true);
    expect(adapter.getWatermark()).toBe("2026-03-05T00:00:00Z");
  });

  it("dismissAll queue supersedes earlier dismiss operations", async () => {
    const onFlushDismissAll = vi.fn().mockResolvedValue(undefined);
    const onFlushDismissBatch = vi.fn().mockResolvedValue(undefined);
    const adapter = new IndexedDBAdapter({
      onFlushDismissAll,
      onFlushDismissBatch,
      flushDebounceMs: 0,
      autoSyncOnOnline: false,
    });
    adaptersToDestroy.push(adapter);

    adapter.dismiss("before");
    await adapter.dismissAll(new Date("2026-03-10T00:00:00Z"));
    adapter.dismiss("after");
    await adapter.flushQueue();

    expect(onFlushDismissAll).toHaveBeenCalledTimes(1);
    expect(onFlushDismissBatch).toHaveBeenCalledTimes(1);
    expect(onFlushDismissBatch).toHaveBeenCalledWith(["after"]);
  });
});
