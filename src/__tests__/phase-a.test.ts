import { describe, it, expect } from "vitest";
import { isNew, getNewFeaturesSorted } from "../core";
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

// ── publishAt (Scheduled Publishing) ────────────────────────────────────────

describe("isNew — publishAt (scheduled publishing)", () => {
  it("returns false when publishAt is in the future", () => {
    const feature = makeFeature({
      publishAt: "2026-03-01T00:00:00Z", // future
    });
    expect(isNew(feature, null, new Set(), NOW)).toBe(false);
  });

  it("returns true when publishAt is in the past", () => {
    const feature = makeFeature({
      publishAt: "2026-02-20T00:00:00Z", // past
    });
    expect(isNew(feature, null, new Set(), NOW)).toBe(true);
  });

  it("returns true when publishAt equals now", () => {
    const feature = makeFeature({
      publishAt: "2026-02-25T12:00:00Z", // exactly now
    });
    expect(isNew(feature, null, new Set(), NOW)).toBe(true);
  });

  it("returns false when publishAt is future even if everything else is valid", () => {
    const feature = makeFeature({
      publishAt: "2026-03-15T00:00:00Z",
      releasedAt: "2026-02-20T00:00:00Z",
      showNewUntil: "2026-04-20T00:00:00Z",
    });
    expect(isNew(feature, null, new Set(), NOW)).toBe(false);
  });

  it("works correctly without publishAt (existing behavior)", () => {
    const feature = makeFeature(); // no publishAt
    expect(isNew(feature, null, new Set(), NOW)).toBe(true);
  });

  it("publishAt check happens before watermark check", () => {
    const feature = makeFeature({
      publishAt: "2026-03-01T00:00:00Z", // future
      releasedAt: "2026-02-20T00:00:00Z",
    });
    // Even with no watermark, should return false because publishAt is future
    expect(isNew(feature, null, new Set(), NOW)).toBe(false);
  });
});

// ── getNewFeaturesSorted ────────────────────────────────────────────────────

describe("getNewFeaturesSorted", () => {
  it("sorts by priority — critical first, then normal, then low", () => {
    const manifest: FeatureManifest = [
      makeFeature({ id: "low", priority: "low", releasedAt: "2026-02-20T00:00:00Z" }),
      makeFeature({ id: "critical", priority: "critical", releasedAt: "2026-02-20T00:00:00Z" }),
      makeFeature({ id: "normal", priority: "normal", releasedAt: "2026-02-20T00:00:00Z" }),
    ];
    const storage = makeStorage();
    const result = getNewFeaturesSorted(manifest, storage, NOW);
    expect(result.map((f) => f.id)).toEqual(["critical", "normal", "low"]);
  });

  it("sorts by release date within same priority (newest first)", () => {
    const manifest: FeatureManifest = [
      makeFeature({ id: "older", releasedAt: "2026-02-18T00:00:00Z" }),
      makeFeature({ id: "newest", releasedAt: "2026-02-24T00:00:00Z" }),
      makeFeature({ id: "middle", releasedAt: "2026-02-21T00:00:00Z" }),
    ];
    const storage = makeStorage();
    const result = getNewFeaturesSorted(manifest, storage, NOW);
    expect(result.map((f) => f.id)).toEqual(["newest", "middle", "older"]);
  });

  it("defaults undefined priority to normal", () => {
    const manifest: FeatureManifest = [
      makeFeature({ id: "no-priority", releasedAt: "2026-02-20T00:00:00Z" }),
      makeFeature({ id: "critical", priority: "critical", releasedAt: "2026-02-20T00:00:00Z" }),
    ];
    const storage = makeStorage();
    const result = getNewFeaturesSorted(manifest, storage, NOW);
    expect(result.map((f) => f.id)).toEqual(["critical", "no-priority"]);
  });

  it("excludes expired features", () => {
    const manifest: FeatureManifest = [
      makeFeature({ id: "active", priority: "normal" }),
      makeFeature({ id: "expired", priority: "critical", showNewUntil: "2026-02-01T00:00:00Z" }),
    ];
    const storage = makeStorage();
    const result = getNewFeaturesSorted(manifest, storage, NOW);
    expect(result.map((f) => f.id)).toEqual(["active"]);
  });

  it("returns empty array for empty manifest", () => {
    const storage = makeStorage();
    expect(getNewFeaturesSorted([], storage, NOW)).toEqual([]);
  });

  it("combined priority + date sort", () => {
    const manifest: FeatureManifest = [
      makeFeature({ id: "low-old", priority: "low", releasedAt: "2026-02-18T00:00:00Z" }),
      makeFeature({ id: "critical-new", priority: "critical", releasedAt: "2026-02-24T00:00:00Z" }),
      makeFeature({ id: "normal-new", releasedAt: "2026-02-24T00:00:00Z" }),
      makeFeature({ id: "critical-old", priority: "critical", releasedAt: "2026-02-20T00:00:00Z" }),
      makeFeature({ id: "normal-old", releasedAt: "2026-02-20T00:00:00Z" }),
    ];
    const storage = makeStorage();
    const result = getNewFeaturesSorted(manifest, storage, NOW);
    expect(result.map((f) => f.id)).toEqual([
      "critical-new",
      "critical-old",
      "normal-new",
      "normal-old",
      "low-old",
    ]);
  });
});

// ── Enhanced Types ──────────────────────────────────────────────────────────

describe("Enhanced FeatureEntry types", () => {
  it("accepts all new optional fields", () => {
    const feature = makeFeature({
      type: "feature",
      priority: "critical",
      image: "https://example.com/screenshot.png",
      cta: { label: "Try it", url: "https://example.com/try" },
      publishAt: "2026-02-20T00:00:00Z",
    });
    expect(feature.type).toBe("feature");
    expect(feature.priority).toBe("critical");
    expect(feature.image).toBe("https://example.com/screenshot.png");
    expect(feature.cta?.label).toBe("Try it");
    expect(feature.cta?.url).toBe("https://example.com/try");
    expect(feature.publishAt).toBe("2026-02-20T00:00:00Z");
  });

  it("accepts all FeatureType values", () => {
    const types = ["feature", "improvement", "fix", "breaking"] as const;
    for (const type of types) {
      const feature = makeFeature({ type });
      expect(feature.type).toBe(type);
    }
  });

  it("accepts all FeaturePriority values", () => {
    const priorities = ["critical", "normal", "low"] as const;
    for (const priority of priorities) {
      const feature = makeFeature({ priority });
      expect(feature.priority).toBe(priority);
    }
  });
});
