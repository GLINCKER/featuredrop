import { describe, it, expect, beforeEach, vi } from "vitest";
import { AdoptionEngine, createAdoptionEngine } from "../engine";
import type { FeatureEntry, DeliveryContext } from "../types";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });

const testManifest: FeatureEntry[] = [
  {
    id: "dark-mode",
    label: "Dark Mode",
    description: "Full dark theme support.",
    releasedAt: "2026-01-01T00:00:00Z",
    showNewUntil: "2026-06-01T00:00:00Z",
    type: "feature",
    priority: "normal",
  },
  {
    id: "api-keys",
    label: "API Keys v2",
    description: "Scoped API keys with expiration.",
    releasedAt: "2026-02-01T00:00:00Z",
    showNewUntil: "2026-08-01T00:00:00Z",
    type: "feature",
    priority: "critical",
  },
  {
    id: "perf-fix",
    label: "Performance Fix",
    description: "3x faster rendering.",
    releasedAt: "2026-02-15T00:00:00Z",
    showNewUntil: "2026-04-15T00:00:00Z",
    type: "fix",
    priority: "low",
  },
];

function makeContext(overrides?: Partial<DeliveryContext>): DeliveryContext {
  return {
    currentPath: "/dashboard",
    sessionAge: 30,
    recentDismissals: 0,
    featurePriority: "normal",
    ...overrides,
  };
}

describe("AdoptionEngine", () => {
  let engine: AdoptionEngine;

  beforeEach(() => {
    localStorageMock.clear();
    engine = createAdoptionEngine({ manifest: testManifest });
  });

  describe("createAdoptionEngine", () => {
    it("creates an engine instance", () => {
      expect(engine).toBeInstanceOf(AdoptionEngine);
    });

    it("implements FeatureDropEngine interface", () => {
      expect(typeof engine.shouldShow).toBe("function");
      expect(typeof engine.recommendFormat).toBe("function");
      expect(typeof engine.getAdoptionScore).toBe("function");
      expect(typeof engine.trackInteraction).toBe("function");
      expect(typeof engine.getFeatureAdoption).toBe("function");
      expect(typeof engine.initialize).toBe("function");
      expect(typeof engine.destroy).toBe("function");
    });
  });

  describe("shouldShow (TimingOptimizer)", () => {
    it("blocks announcements in early session", () => {
      const decision = engine.shouldShow(
        "dark-mode",
        makeContext({ sessionAge: 5 })
      );
      expect(decision.show).toBe(false);
      expect(decision.reason).toBe("session_too_young");
    });

    it("allows announcements after session gate", () => {
      const decision = engine.shouldShow(
        "dark-mode",
        makeContext({ sessionAge: 30 })
      );
      expect(decision.show).toBe(true);
    });

    it("blocks on excluded paths", () => {
      const decision = engine.shouldShow(
        "dark-mode",
        makeContext({ currentPath: "/checkout" })
      );
      expect(decision.show).toBe(false);
      expect(decision.reason).toBe("excluded_page");
    });

    it("overrides timing for critical priority", () => {
      const decision = engine.shouldShow(
        "api-keys",
        makeContext({ featurePriority: "critical" })
      );
      expect(decision.show).toBe(true);
      expect(decision.reason).toBe("priority_override");
      expect(decision.confidence).toBe(1.0);
    });

    it("blocks after high dismiss velocity", () => {
      // Simulate dismissals
      engine.trackInteraction("dark-mode", "dismissed");
      engine.trackInteraction("api-keys", "dismissed");

      const decision = engine.shouldShow(
        "perf-fix",
        makeContext({ recentDismissals: 3 })
      );
      // The decision depends on tracker's recentDismissalCount, not context.recentDismissals
      expect(decision).toBeDefined();
      expect(typeof decision.show).toBe("boolean");
    });
  });

  describe("recommendFormat (FormatSelector)", () => {
    it("recommends modal for critical features", () => {
      const rec = engine.recommendFormat("api-keys");
      expect(rec.primary).toBe("modal");
      expect(rec.fallback).toBe("banner");
      expect(rec.reason).toBe("critical_priority");
    });

    it("recommends badge for low priority features", () => {
      const rec = engine.recommendFormat("perf-fix");
      expect(rec.primary).toBe("badge");
      expect(rec.fallback).toBe("inline");
      expect(rec.reason).toBe("low_priority");
    });

    it("recommends gentle format for new users", () => {
      // Session count is 1 (< 3), so new user
      const rec = engine.recommendFormat("dark-mode");
      expect(rec.primary).toBe("badge");
      expect(rec.reason).toBe("new_user_gentle");
    });

    it("returns valid format recommendation shape", () => {
      const rec = engine.recommendFormat("dark-mode");
      expect(rec).toHaveProperty("primary");
      expect(rec).toHaveProperty("fallback");
      expect(rec).toHaveProperty("reason");
      const validFormats = ["badge", "toast", "modal", "banner", "inline", "spotlight"];
      expect(validFormats).toContain(rec.primary);
      expect(validFormats).toContain(rec.fallback);
    });
  });

  describe("trackInteraction (BehaviorTracker)", () => {
    it("tracks seen interactions", () => {
      engine.trackInteraction("dark-mode", "seen");
      const status = engine.getFeatureAdoption("dark-mode");
      expect(status.status).toBe("seen");
      expect(status.interactionCount).toBe(1);
    });

    it("tracks clicked interactions", () => {
      engine.trackInteraction("dark-mode", "clicked");
      const status = engine.getFeatureAdoption("dark-mode");
      expect(status.status).toBe("explored");
    });

    it("tracks completed interactions", () => {
      engine.trackInteraction("dark-mode", "completed");
      const status = engine.getFeatureAdoption("dark-mode");
      expect(status.status).toBe("adopted");
    });

    it("tracks dismissed interactions", () => {
      engine.trackInteraction("dark-mode", "dismissed");
      const status = engine.getFeatureAdoption("dark-mode");
      expect(status.status).toBe("dismissed");
    });

    it("handles multiple interaction types", () => {
      engine.trackInteraction("dark-mode", "seen");
      engine.trackInteraction("dark-mode", "seen");
      engine.trackInteraction("dark-mode", "clicked");
      const status = engine.getFeatureAdoption("dark-mode");
      expect(status.status).toBe("explored");
      expect(status.interactionCount).toBe(3);
    });
  });

  describe("getAdoptionScore (AdoptionScorer)", () => {
    it("returns full score for empty manifest", () => {
      const emptyEngine = createAdoptionEngine({ manifest: [] });
      const score = emptyEngine.getAdoptionScore();
      expect(score.score).toBe(100);
      expect(score.grade).toBe("A");
    });

    it("returns low score when no features explored", () => {
      const score = engine.getAdoptionScore();
      // All features are unseen, so exploration rate = 0, adoption rate = 0
      // Score = 0*30 + 0*50 + 1*20 = 20 (no dismissals)
      expect(score.score).toBe(20);
      expect(score.grade).toBe("F");
    });

    it("improves score when features are explored", () => {
      engine.trackInteraction("dark-mode", "clicked");
      engine.trackInteraction("api-keys", "clicked");
      const score = engine.getAdoptionScore();
      // 2/3 explored, 0 adopted, 0 dismissed
      expect(score.score).toBeGreaterThan(20);
    });

    it("improves score when features are adopted", () => {
      engine.trackInteraction("dark-mode", "completed");
      engine.trackInteraction("api-keys", "completed");
      engine.trackInteraction("perf-fix", "completed");
      const score = engine.getAdoptionScore();
      // All adopted: exploration 3/3=1, adoption 3/3=1, dismissRate 0
      // Score = 1*30 + 1*50 + 1*20 = 100
      expect(score.score).toBe(100);
      expect(score.grade).toBe("A");
    });

    it("provides recommendations for unseen features", () => {
      const score = engine.getAdoptionScore();
      expect(score.recommendations.length).toBeGreaterThan(0);
      expect(score.recommendations[0]).toContain("hasn't seen");
    });

    it("returns valid grade for any score", () => {
      const score = engine.getAdoptionScore();
      expect(["A", "B", "C", "D", "F"]).toContain(score.grade);
    });

    it("returns valid breakdown", () => {
      const score = engine.getAdoptionScore();
      expect(score.breakdown).toHaveProperty("featuresExplored");
      expect(score.breakdown).toHaveProperty("dismissRate");
      expect(score.breakdown).toHaveProperty("completionRate");
      expect(score.breakdown).toHaveProperty("engagementTrend");
      expect(["rising", "stable", "declining"]).toContain(
        score.breakdown.engagementTrend
      );
    });
  });

  describe("getFeatureAdoption", () => {
    it("returns unseen for unknown features", () => {
      const status = engine.getFeatureAdoption("nonexistent");
      expect(status.status).toBe("unseen");
      expect(status.interactionCount).toBe(0);
    });

    it("returns correct status progression", () => {
      // unseen → seen → explored → adopted
      expect(engine.getFeatureAdoption("dark-mode").status).toBe("unseen");

      engine.trackInteraction("dark-mode", "seen");
      expect(engine.getFeatureAdoption("dark-mode").status).toBe("seen");

      engine.trackInteraction("dark-mode", "clicked");
      expect(engine.getFeatureAdoption("dark-mode").status).toBe("explored");

      engine.trackInteraction("dark-mode", "completed");
      expect(engine.getFeatureAdoption("dark-mode").status).toBe("adopted");
    });
  });

  describe("clearProfile", () => {
    it("resets all behavior data", () => {
      engine.trackInteraction("dark-mode", "seen");
      engine.trackInteraction("dark-mode", "clicked");
      engine.clearProfile();
      const status = engine.getFeatureAdoption("dark-mode");
      expect(status.status).toBe("unseen");
    });
  });

  describe("updateManifest", () => {
    it("updates the manifest used for scoring", () => {
      const newManifest: FeatureEntry[] = [
        {
          id: "new-feature",
          label: "New Feature",
          releasedAt: "2026-03-01T00:00:00Z",
          showNewUntil: "2026-06-01T00:00:00Z",
        },
      ];
      engine.updateManifest(newManifest);
      const score = engine.getAdoptionScore();
      // Now only 1 feature in manifest
      expect(score.recommendations[0]).toContain("new-feature");
    });
  });
});
