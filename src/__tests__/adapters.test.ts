import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { MemoryAdapter } from "../adapters/memory";
import { LocalStorageAdapter } from "../adapters/local-storage";

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
