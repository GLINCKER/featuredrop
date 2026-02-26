import { describe, it, expect } from "vitest";
import { createManifest, getFeatureById, getNewFeaturesByCategory } from "../helpers";
import type { FeatureEntry, StorageAdapter } from "../types";

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

describe("createManifest", () => {
  it("returns a frozen array", () => {
    const manifest = createManifest([makeFeature()]);
    expect(Object.isFrozen(manifest)).toBe(true);
  });

  it("preserves all entries", () => {
    const entries = [
      makeFeature({ id: "a" }),
      makeFeature({ id: "b" }),
    ];
    const manifest = createManifest(entries);
    expect(manifest).toHaveLength(2);
    expect(manifest[0].id).toBe("a");
    expect(manifest[1].id).toBe("b");
  });

  it("creates a new array (does not mutate original)", () => {
    const entries = [makeFeature({ id: "a" })];
    const manifest = createManifest(entries);
    entries.push(makeFeature({ id: "b" }));
    expect(manifest).toHaveLength(1);
  });
});

describe("getFeatureById", () => {
  it("finds a feature by ID", () => {
    const manifest = createManifest([
      makeFeature({ id: "alpha", label: "Alpha" }),
      makeFeature({ id: "beta", label: "Beta" }),
    ]);
    const result = getFeatureById(manifest, "beta");
    expect(result?.label).toBe("Beta");
  });

  it("returns undefined when ID not found", () => {
    const manifest = createManifest([makeFeature({ id: "alpha" })]);
    expect(getFeatureById(manifest, "nonexistent")).toBeUndefined();
  });

  it("returns undefined for empty manifest", () => {
    expect(getFeatureById([], "any")).toBeUndefined();
  });
});

describe("getNewFeaturesByCategory", () => {
  it("filters new features by category", () => {
    const manifest = createManifest([
      makeFeature({ id: "a", category: "ai" }),
      makeFeature({ id: "b", category: "billing" }),
      makeFeature({ id: "c", category: "ai" }),
    ]);
    const storage = makeStorage();
    const result = getNewFeaturesByCategory(manifest, "ai", storage, NOW);
    expect(result.map((f) => f.id)).toEqual(["a", "c"]);
  });

  it("returns empty when no features match category", () => {
    const manifest = createManifest([
      makeFeature({ id: "a", category: "ai" }),
    ]);
    const storage = makeStorage();
    expect(getNewFeaturesByCategory(manifest, "billing", storage, NOW)).toEqual([]);
  });

  it("excludes expired features in the category", () => {
    const manifest = createManifest([
      makeFeature({ id: "a", category: "ai", showNewUntil: "2026-02-01T00:00:00Z" }),
      makeFeature({ id: "b", category: "ai" }),
    ]);
    const storage = makeStorage();
    const result = getNewFeaturesByCategory(manifest, "ai", storage, NOW);
    expect(result.map((f) => f.id)).toEqual(["b"]);
  });

  it("excludes dismissed features in the category", () => {
    const manifest = createManifest([
      makeFeature({ id: "a", category: "ai" }),
      makeFeature({ id: "b", category: "ai" }),
    ]);
    const storage = makeStorage({
      getDismissedIds: () => new Set(["a"]),
    });
    const result = getNewFeaturesByCategory(manifest, "ai", storage, NOW);
    expect(result.map((f) => f.id)).toEqual(["b"]);
  });
});
