import { describe, it, expect } from "vitest";
import { isNew, getNewFeatures, getNewFeatureCount, hasNewFeature } from "../core";
import { createFlagBridge } from "../flags";
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

  it("returns false when appVersion is below introduced version", () => {
    const feature = makeFeature({
      version: { introduced: "2.5.0", showNewUntil: "2.6.0" },
    });
    expect(isNew(feature, null, new Set(), NOW, undefined, undefined, "2.4.9")).toBe(false);
  });

  it("returns true when appVersion satisfies introduced and showNewUntil", () => {
    const feature = makeFeature({
      version: { introduced: "2.5.0", showNewUntil: "2.6.0" },
    });
    expect(isNew(feature, null, new Set(), NOW, undefined, undefined, "2.5.1")).toBe(true);
  });

  it("returns false when appVersion reaches showNewUntil boundary", () => {
    const feature = makeFeature({
      version: { introduced: "2.5.0", showNewUntil: "2.6.0" },
    });
    expect(isNew(feature, null, new Set(), NOW, undefined, undefined, "2.6.0")).toBe(false);
  });

  it("returns false when version range does not match", () => {
    const feature = makeFeature({
      version: { showIn: ">=3.0.0 <4.0.0" },
    });
    expect(isNew(feature, null, new Set(), NOW, undefined, undefined, "2.9.9")).toBe(false);
  });

  it("returns false when version constraints exist but appVersion missing", () => {
    const feature = makeFeature({
      version: { introduced: "2.5.0" },
    });
    expect(isNew(feature, null, new Set(), NOW)).toBe(false);
  });

  it("returns false when seen dependency is not satisfied", () => {
    const feature = makeFeature({
      dependsOn: { seen: ["base-feature"] },
    });
    expect(isNew(feature, null, new Set(), NOW)).toBe(false);
  });

  it("returns true when seen dependency is satisfied", () => {
    const feature = makeFeature({
      dependsOn: { seen: ["base-feature"] },
    });
    expect(
      isNew(
        feature,
        null,
        new Set(),
        NOW,
        undefined,
        undefined,
        undefined,
        { seenIds: new Set(["base-feature"]) },
      ),
    ).toBe(true);
  });

  it("returns false when clicked dependency is not satisfied", () => {
    const feature = makeFeature({
      dependsOn: { clicked: ["base-feature"] },
    });
    expect(isNew(feature, null, new Set(), NOW)).toBe(false);
  });

  it("returns true when dismissed dependency is satisfied", () => {
    const feature = makeFeature({
      dependsOn: { dismissed: ["base-feature"] },
    });
    expect(isNew(feature, null, new Set(["base-feature"]), NOW)).toBe(true);
  });

  it("returns false when a contextual trigger exists but context is missing", () => {
    const feature = makeFeature({
      trigger: { type: "page", match: "/reports/*" },
    });
    expect(isNew(feature, null, new Set(), NOW)).toBe(false);
  });

  it("returns true when page trigger matches current path", () => {
    const feature = makeFeature({
      trigger: { type: "page", match: "/reports/*" },
    });
    expect(
      isNew(
        feature,
        null,
        new Set(),
        NOW,
        undefined,
        undefined,
        undefined,
        undefined,
        { path: "/reports/summary" },
      ),
    ).toBe(true);
  });

  it("returns false when usage trigger threshold is not met", () => {
    const feature = makeFeature({
      trigger: { type: "usage", event: "mouse-heavy-session", minActions: 3 },
    });
    expect(
      isNew(
        feature,
        null,
        new Set(),
        NOW,
        undefined,
        undefined,
        undefined,
        undefined,
        { usage: { "mouse-heavy-session": 2 } },
      ),
    ).toBe(false);
  });

  it("returns false when feature has flagKey and no flag bridge is provided", () => {
    const feature = makeFeature({
      flagKey: "ai-journal-enabled",
    });
    expect(isNew(feature, null, new Set(), NOW)).toBe(false);
  });

  it("returns true when feature flag resolves to enabled", () => {
    const feature = makeFeature({
      flagKey: "ai-journal-enabled",
    });
    const bridge = createFlagBridge({
      isEnabled: (key) => key === "ai-journal-enabled",
    });
    expect(
      isNew(feature, null, new Set(), NOW, undefined, undefined, undefined, undefined, undefined, bridge),
    ).toBe(true);
  });

  it("returns false when feature product does not match current scope", () => {
    const feature = makeFeature({ product: "askverdict" });
    expect(
      isNew(feature, null, new Set(), NOW, undefined, undefined, undefined, undefined, undefined, undefined, "other"),
    ).toBe(false);
  });

  it("returns true for wildcard product entries", () => {
    const feature = makeFeature({ product: "*" });
    expect(
      isNew(feature, null, new Set(), NOW, undefined, undefined, undefined, undefined, undefined, undefined, "askverdict"),
    ).toBe(true);
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

  it("respects dependency chains", () => {
    const manifest: FeatureManifest = [
      makeFeature({ id: "base", releasedAt: "2026-02-22T00:00:00Z" }),
      makeFeature({
        id: "dependent",
        releasedAt: "2026-02-23T00:00:00Z",
        dependsOn: { seen: ["base"] },
      }),
    ];
    const storage = makeStorage();

    const withoutDependencyState = getNewFeatures(manifest, storage, NOW);
    expect(withoutDependencyState.map((f) => f.id)).toEqual(["base"]);

    const withDependencyState = getNewFeatures(
      manifest,
      storage,
      NOW,
      undefined,
      undefined,
      undefined,
      { seenIds: new Set(["base"]) },
    );
    expect(withDependencyState.map((f) => f.id)).toEqual(["base", "dependent"]);
  });

  it("filters out disabled feature-flag entries", () => {
    const manifest: FeatureManifest = [
      makeFeature({ id: "always-on" }),
      makeFeature({ id: "flagged", flagKey: "flag-enabled" }),
    ];
    const storage = makeStorage();
    const bridge = createFlagBridge({
      isEnabled: (key) => key === "flag-enabled",
    });
    const result = getNewFeatures(
      manifest,
      storage,
      NOW,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      bridge,
    );
    expect(result.map((item) => item.id)).toEqual(["always-on", "flagged"]);

    const disabledResult = getNewFeatures(
      manifest,
      storage,
      NOW,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      createFlagBridge({ isEnabled: () => false }),
    );
    expect(disabledResult.map((item) => item.id)).toEqual(["always-on"]);
  });

  it("filters entries by product scope", () => {
    const manifest: FeatureManifest = [
      makeFeature({ id: "global", product: "*" }),
      makeFeature({ id: "askverdict-only", product: "askverdict" }),
      makeFeature({ id: "other-only", product: "other" }),
    ];
    const storage = makeStorage();
    const result = getNewFeatures(
      manifest,
      storage,
      NOW,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      "askverdict",
    );
    expect(result.map((item) => item.id)).toEqual(["global", "askverdict-only"]);
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
