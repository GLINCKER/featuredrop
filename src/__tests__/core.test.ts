import { describe, it, expect } from "vitest";
import { isNew, getNewFeatures, getNewFeatureCount, hasNewFeature } from "../core";
import type { FeatureEntry, FeatureManifest, StorageAdapter } from "../types";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeFeature(overrides: Partial<FeatureEntry> = {}): FeatureEntry {
  return {
    id: "test-feature",
    label: "Test Feature",
    releasedAt: "2026-02-20T00:00:00Z",
    showNewUntil: "2026-03-20T00:00:00Z",
    ...overrides,
  };
}

function makeStorage(overrides: Partial<StorageAdapter> = {}): StorageAdapter {
  return {
    getWatermark: () => null,
    getDismissedIds: () => new Set(),
    dismiss: () => {},
    dismissAll: async () => {},
    ...overrides,
  };
}

const NOW = new Date("2026-02-25T12:00:00Z");

// ── isNew ────────────────────────────────────────────────────────────────────

describe("isNew", () => {
  it("returns true when feature is within window and no watermark", () => {
    const feature = makeFeature();
    expect(isNew(feature, null, new Set(), NOW)).toBe(true);
  });

  it("returns false when past showNewUntil expiry", () => {
    const feature = makeFeature({ showNewUntil: "2026-02-24T00:00:00Z" });
    expect(isNew(feature, null, new Set(), NOW)).toBe(false);
  });

  it("returns false when feature was released before watermark", () => {
    const feature = makeFeature({ releasedAt: "2026-02-10T00:00:00Z" });
    const watermark = "2026-02-15T00:00:00Z";
    expect(isNew(feature, watermark, new Set(), NOW)).toBe(false);
  });

  it("returns true when feature was released after watermark", () => {
    const feature = makeFeature({ releasedAt: "2026-02-20T00:00:00Z" });
    const watermark = "2026-02-15T00:00:00Z";
    expect(isNew(feature, watermark, new Set(), NOW)).toBe(true);
  });

  it("returns false when feature is dismissed", () => {
    const feature = makeFeature({ id: "dismissed-one" });
    const dismissed = new Set(["dismissed-one"]);
    expect(isNew(feature, null, dismissed, NOW)).toBe(false);
  });

  it("returns false when watermark equals releasedAt (edge case)", () => {
    const feature = makeFeature({ releasedAt: "2026-02-20T00:00:00Z" });
    const watermark = "2026-02-20T00:00:00Z";
    expect(isNew(feature, watermark, new Set(), NOW)).toBe(false);
  });

  it("uses current time by default when now is not provided", () => {
    const feature = makeFeature({
      releasedAt: "2020-01-01T00:00:00Z",
      showNewUntil: "2020-02-01T00:00:00Z",
    });
    // Feature expired years ago, should be false
    expect(isNew(feature, null, new Set())).toBe(false);
  });

  it("returns true with all optional fields populated", () => {
    const feature = makeFeature({
      description: "A cool feature",
      sidebarKey: "/journal",
      category: "ai",
      url: "https://example.com",
      version: "1.0.0",
      meta: { priority: 1 },
    });
    expect(isNew(feature, null, new Set(), NOW)).toBe(true);
  });

  it("returns false when dismissed even if within window and after watermark", () => {
    const feature = makeFeature({ id: "feat-1" });
    const watermark = "2026-02-10T00:00:00Z";
    const dismissed = new Set(["feat-1"]);
    expect(isNew(feature, watermark, dismissed, NOW)).toBe(false);
  });
});

// ── getNewFeatures ───────────────────────────────────────────────────────────

describe("getNewFeatures", () => {
  it("filters manifest to only new features", () => {
    const manifest: FeatureManifest = [
      makeFeature({ id: "new-one", releasedAt: "2026-02-22T00:00:00Z" }),
      makeFeature({ id: "expired", showNewUntil: "2026-02-24T00:00:00Z" }),
      makeFeature({ id: "new-two", releasedAt: "2026-02-23T00:00:00Z" }),
    ];
    const storage = makeStorage();
    const result = getNewFeatures(manifest, storage, NOW);
    expect(result.map((f) => f.id)).toEqual(["new-one", "new-two"]);
  });

  it("returns empty array when all features are expired", () => {
    const manifest: FeatureManifest = [
      makeFeature({ id: "a", showNewUntil: "2026-02-01T00:00:00Z" }),
      makeFeature({ id: "b", showNewUntil: "2026-02-10T00:00:00Z" }),
    ];
    const storage = makeStorage();
    expect(getNewFeatures(manifest, storage, NOW)).toEqual([]);
  });

  it("returns empty array when all features are dismissed", () => {
    const manifest: FeatureManifest = [
      makeFeature({ id: "a" }),
      makeFeature({ id: "b" }),
    ];
    const storage = makeStorage({
      getDismissedIds: () => new Set(["a", "b"]),
    });
    expect(getNewFeatures(manifest, storage, NOW)).toEqual([]);
  });

  it("returns empty array for empty manifest", () => {
    const storage = makeStorage();
    expect(getNewFeatures([], storage, NOW)).toEqual([]);
  });

  it("excludes features before watermark", () => {
    const manifest: FeatureManifest = [
      makeFeature({ id: "old", releasedAt: "2026-01-01T00:00:00Z" }),
      makeFeature({ id: "new", releasedAt: "2026-02-20T00:00:00Z" }),
    ];
    const storage = makeStorage({
      getWatermark: () => "2026-02-15T00:00:00Z",
    });
    const result = getNewFeatures(manifest, storage, NOW);
    expect(result.map((f) => f.id)).toEqual(["new"]);
  });
});

// ── getNewFeatureCount ───────────────────────────────────────────────────────

describe("getNewFeatureCount", () => {
  it("returns count of new features", () => {
    const manifest: FeatureManifest = [
      makeFeature({ id: "a" }),
      makeFeature({ id: "b" }),
      makeFeature({ id: "c", showNewUntil: "2026-02-01T00:00:00Z" }),
    ];
    const storage = makeStorage();
    expect(getNewFeatureCount(manifest, storage, NOW)).toBe(2);
  });

  it("returns 0 for empty manifest", () => {
    const storage = makeStorage();
    expect(getNewFeatureCount([], storage, NOW)).toBe(0);
  });

  it("returns 0 when all dismissed", () => {
    const manifest: FeatureManifest = [makeFeature({ id: "a" })];
    const storage = makeStorage({
      getDismissedIds: () => new Set(["a"]),
    });
    expect(getNewFeatureCount(manifest, storage, NOW)).toBe(0);
  });
});

// ── hasNewFeature ────────────────────────────────────────────────────────────

describe("hasNewFeature", () => {
  it("returns true when sidebarKey matches a new feature", () => {
    const manifest: FeatureManifest = [
      makeFeature({ id: "journal", sidebarKey: "/journal" }),
      makeFeature({ id: "other", sidebarKey: "/other" }),
    ];
    const storage = makeStorage();
    expect(hasNewFeature(manifest, "/journal", storage, NOW)).toBe(true);
  });

  it("returns false when sidebarKey has no new features", () => {
    const manifest: FeatureManifest = [
      makeFeature({
        id: "expired-feature",
        sidebarKey: "/journal",
        showNewUntil: "2026-02-01T00:00:00Z",
      }),
    ];
    const storage = makeStorage();
    expect(hasNewFeature(manifest, "/journal", storage, NOW)).toBe(false);
  });

  it("returns false when sidebarKey does not exist in manifest", () => {
    const manifest: FeatureManifest = [
      makeFeature({ id: "journal", sidebarKey: "/journal" }),
    ];
    const storage = makeStorage();
    expect(hasNewFeature(manifest, "/nonexistent", storage, NOW)).toBe(false);
  });

  it("returns false when matching feature is dismissed", () => {
    const manifest: FeatureManifest = [
      makeFeature({ id: "journal-feat", sidebarKey: "/journal" }),
    ];
    const storage = makeStorage({
      getDismissedIds: () => new Set(["journal-feat"]),
    });
    expect(hasNewFeature(manifest, "/journal", storage, NOW)).toBe(false);
  });

  it("returns true if at least one feature for key is new", () => {
    const manifest: FeatureManifest = [
      makeFeature({
        id: "old-journal",
        sidebarKey: "/journal",
        showNewUntil: "2026-02-01T00:00:00Z",
      }),
      makeFeature({ id: "new-journal", sidebarKey: "/journal" }),
    ];
    const storage = makeStorage();
    expect(hasNewFeature(manifest, "/journal", storage, NOW)).toBe(true);
  });
});
