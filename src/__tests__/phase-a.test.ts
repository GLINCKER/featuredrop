import { describe, it, expect } from "vitest";
import {
  isNew,
  getNewFeatures,
  getNewFeaturesSorted,
  matchesAudience,
} from "../core";
import type {
  AudienceMatchFn,
  AudienceRule,
  FeatureEntry,
  FeatureManifest,
  StorageAdapter,
  UserContext,
} from "../types";

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

// ── B1: User Segmentation — matchesAudience ─────────────────────────────────

describe("matchesAudience", () => {
  it("returns true when plan matches", () => {
    const audience: AudienceRule = { plan: ["pro", "enterprise"] };
    const user: UserContext = { plan: "pro" };
    expect(matchesAudience(audience, user)).toBe(true);
  });

  it("returns false when plan does not match", () => {
    const audience: AudienceRule = { plan: ["pro", "enterprise"] };
    const user: UserContext = { plan: "free" };
    expect(matchesAudience(audience, user)).toBe(false);
  });

  it("returns true when role matches", () => {
    const audience: AudienceRule = { role: ["admin", "editor"] };
    const user: UserContext = { role: "admin" };
    expect(matchesAudience(audience, user)).toBe(true);
  });

  it("returns false when role does not match", () => {
    const audience: AudienceRule = { role: ["admin"] };
    const user: UserContext = { role: "viewer" };
    expect(matchesAudience(audience, user)).toBe(false);
  });

  it("returns true when region matches", () => {
    const audience: AudienceRule = { region: ["us", "eu"] };
    const user: UserContext = { region: "eu" };
    expect(matchesAudience(audience, user)).toBe(true);
  });

  it("returns false when region does not match", () => {
    const audience: AudienceRule = { region: ["us"] };
    const user: UserContext = { region: "apac" };
    expect(matchesAudience(audience, user)).toBe(false);
  });

  it("uses AND logic across fields — plan match + role mismatch → false", () => {
    const audience: AudienceRule = { plan: ["pro"], role: ["admin"] };
    const user: UserContext = { plan: "pro", role: "viewer" };
    expect(matchesAudience(audience, user)).toBe(false);
  });

  it("uses AND logic across fields — all fields match → true", () => {
    const audience: AudienceRule = {
      plan: ["pro"],
      role: ["admin"],
      region: ["us"],
    };
    const user: UserContext = { plan: "pro", role: "admin", region: "us" };
    expect(matchesAudience(audience, user)).toBe(true);
  });

  it("returns false when user has no plan but audience requires one", () => {
    const audience: AudienceRule = { plan: ["pro"] };
    const user: UserContext = { role: "admin" };
    expect(matchesAudience(audience, user)).toBe(false);
  });

  it("ignores fields not specified in audience rule", () => {
    const audience: AudienceRule = { plan: ["pro"] };
    const user: UserContext = { plan: "pro", role: "viewer", region: "apac" };
    expect(matchesAudience(audience, user)).toBe(true);
  });

  it("ignores empty arrays in audience rule", () => {
    const audience: AudienceRule = { plan: [], role: ["admin"] };
    const user: UserContext = { role: "admin" };
    expect(matchesAudience(audience, user)).toBe(true);
  });
});

// ── B1: User Segmentation — isNew with audience ────────────────────────────

describe("isNew — audience targeting", () => {
  it("shows feature without audience to everyone", () => {
    const feature = makeFeature(); // no audience
    expect(isNew(feature, null, new Set(), NOW)).toBe(true);
  });

  it("shows feature with empty audience to everyone", () => {
    const feature = makeFeature({ audience: {} });
    expect(isNew(feature, null, new Set(), NOW)).toBe(true);
  });

  it("hides feature with audience when no userContext provided (safe default)", () => {
    const feature = makeFeature({ audience: { plan: ["pro"] } });
    expect(isNew(feature, null, new Set(), NOW)).toBe(false);
  });

  it("shows feature when user matches audience", () => {
    const feature = makeFeature({ audience: { plan: ["pro", "enterprise"] } });
    const user: UserContext = { plan: "pro" };
    expect(isNew(feature, null, new Set(), NOW, user)).toBe(true);
  });

  it("hides feature when user does not match audience", () => {
    const feature = makeFeature({ audience: { plan: ["enterprise"] } });
    const user: UserContext = { plan: "free" };
    expect(isNew(feature, null, new Set(), NOW, user)).toBe(false);
  });

  it("hides feature when plan matches but role does not", () => {
    const feature = makeFeature({
      audience: { plan: ["pro"], role: ["admin"] },
    });
    const user: UserContext = { plan: "pro", role: "viewer" };
    expect(isNew(feature, null, new Set(), NOW, user)).toBe(false);
  });

  it("uses custom matchAudience function when provided", () => {
    const feature = makeFeature({
      audience: { custom: { minAge: 30 } },
    });
    const user: UserContext = { traits: { age: 35 } };
    const customMatcher: AudienceMatchFn = (aud, ctx) => {
      const minAge = aud.custom?.minAge as number;
      const userAge = ctx.traits?.age as number;
      return userAge >= minAge;
    };
    expect(isNew(feature, null, new Set(), NOW, user, customMatcher)).toBe(true);
  });

  it("custom matchAudience returning false hides feature", () => {
    const feature = makeFeature({
      audience: { custom: { minAge: 30 } },
    });
    const user: UserContext = { traits: { age: 20 } };
    const customMatcher: AudienceMatchFn = (aud, ctx) => {
      const minAge = aud.custom?.minAge as number;
      const userAge = ctx.traits?.age as number;
      return userAge >= minAge;
    };
    expect(isNew(feature, null, new Set(), NOW, user, customMatcher)).toBe(
      false,
    );
  });

  it("audience check does not override dismiss check", () => {
    const feature = makeFeature({ audience: { plan: ["pro"] } });
    const user: UserContext = { plan: "pro" };
    const dismissed = new Set([feature.id]);
    expect(isNew(feature, null, dismissed, NOW, user)).toBe(false);
  });

  it("audience check does not override expiry check", () => {
    const feature = makeFeature({
      audience: { plan: ["pro"] },
      showNewUntil: "2026-01-01T00:00:00Z", // expired
    });
    const user: UserContext = { plan: "pro" };
    expect(isNew(feature, null, new Set(), NOW, user)).toBe(false);
  });
});

// ── B1: User Segmentation — getNewFeatures with audience ───────────────────

describe("getNewFeatures — audience filtering", () => {
  it("filters manifest by audience when userContext provided", () => {
    const manifest: FeatureManifest = [
      makeFeature({ id: "for-pro", audience: { plan: ["pro"] } }),
      makeFeature({ id: "for-all" }), // no audience
      makeFeature({ id: "for-enterprise", audience: { plan: ["enterprise"] } }),
    ];
    const storage = makeStorage();
    const user: UserContext = { plan: "pro" };
    const result = getNewFeatures(manifest, storage, NOW, user);
    expect(result.map((f) => f.id)).toEqual(["for-pro", "for-all"]);
  });

  it("hides all audience-targeted features when no userContext", () => {
    const manifest: FeatureManifest = [
      makeFeature({ id: "targeted", audience: { plan: ["pro"] } }),
      makeFeature({ id: "untargeted" }),
    ];
    const storage = makeStorage();
    const result = getNewFeatures(manifest, storage, NOW);
    expect(result.map((f) => f.id)).toEqual(["untargeted"]);
  });

  it("shows all features when none have audience rules", () => {
    const manifest: FeatureManifest = [
      makeFeature({ id: "a" }),
      makeFeature({ id: "b" }),
    ];
    const storage = makeStorage();
    const result = getNewFeatures(manifest, storage, NOW);
    expect(result).toHaveLength(2);
  });
});
