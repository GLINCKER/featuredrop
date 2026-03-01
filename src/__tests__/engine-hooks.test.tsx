import { describe, it, expect, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { type ReactNode } from "react";
import { FeatureDropProvider } from "../react/provider";
import { useSmartFeature } from "../react/hooks/use-smart-feature";
import { useAdoptionScore } from "../react/hooks/use-adoption-score";
import { useBehaviorProfile } from "../react/hooks/use-behavior-profile";
import { createAdoptionEngine } from "../engine";
import type { FeatureEntry } from "../types";
import { MemoryAdapter } from "../adapters/memory";

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
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
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

function createWrapper(options?: {
  withEngine?: boolean;
  manifest?: FeatureEntry[];
}) {
  const manifest = options?.manifest ?? testManifest;
  const engine = options?.withEngine
    ? createAdoptionEngine({ manifest })
    : undefined;
  const storage = new MemoryAdapter();

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <FeatureDropProvider
        manifest={manifest}
        storage={storage}
        engine={engine}
      >
        {children}
      </FeatureDropProvider>
    );
  };
}

describe("useSmartFeature", () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it("returns show=true and badge format without engine", () => {
    const { result } = renderHook(() => useSmartFeature("dark-mode"), {
      wrapper: createWrapper({ withEngine: false }),
    });

    expect(result.current.show).toBe(true);
    expect(result.current.format).toBe("badge");
    expect(result.current.fallbackFormat).toBe("inline");
    expect(result.current.reason).toBe("no_engine");
    expect(result.current.confidence).toBe(1.0);
  });

  it("returns the feature entry", () => {
    const { result } = renderHook(() => useSmartFeature("dark-mode"), {
      wrapper: createWrapper({ withEngine: false }),
    });

    expect(result.current.feature).toBeDefined();
    expect(result.current.feature?.id).toBe("dark-mode");
    expect(result.current.feature?.label).toBe("Dark Mode");
  });

  it("returns show=false for unknown features without engine", () => {
    const { result } = renderHook(() => useSmartFeature("nonexistent"), {
      wrapper: createWrapper({ withEngine: false }),
    });

    expect(result.current.show).toBe(false);
    expect(result.current.feature).toBeUndefined();
  });

  it("returns valid result with engine enabled", () => {
    const { result } = renderHook(() => useSmartFeature("dark-mode"), {
      wrapper: createWrapper({ withEngine: true }),
    });

    // Engine should return a timing decision
    expect(typeof result.current.show).toBe("boolean");
    expect(typeof result.current.format).toBe("string");
    expect(typeof result.current.confidence).toBe("number");
    expect(result.current.confidence).toBeGreaterThanOrEqual(0);
    expect(result.current.confidence).toBeLessThanOrEqual(1);
  });

  it("provides a dismiss callback", () => {
    const { result } = renderHook(() => useSmartFeature("dark-mode"), {
      wrapper: createWrapper({ withEngine: true }),
    });

    expect(typeof result.current.dismiss).toBe("function");
  });

  it("returns valid format values", () => {
    const { result } = renderHook(() => useSmartFeature("dark-mode"), {
      wrapper: createWrapper({ withEngine: true }),
    });

    const validFormats = [
      "badge",
      "toast",
      "modal",
      "banner",
      "inline",
      "spotlight",
    ];
    expect(validFormats).toContain(result.current.format);
    expect(validFormats).toContain(result.current.fallbackFormat);
  });

  it("returns reason string", () => {
    const { result } = renderHook(() => useSmartFeature("dark-mode"), {
      wrapper: createWrapper({ withEngine: true }),
    });

    expect(typeof result.current.reason).toBe("string");
    expect(result.current.reason.length).toBeGreaterThan(0);
  });
});

describe("useAdoptionScore", () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it("returns perfect score without engine", () => {
    const { result } = renderHook(() => useAdoptionScore(), {
      wrapper: createWrapper({ withEngine: false }),
    });

    expect(result.current.score).toBe(100);
    expect(result.current.grade).toBe("A");
    expect(result.current.recommendations).toEqual([]);
  });

  it("returns valid score shape with engine", () => {
    const { result } = renderHook(() => useAdoptionScore(), {
      wrapper: createWrapper({ withEngine: true }),
    });

    expect(typeof result.current.score).toBe("number");
    expect(result.current.score).toBeGreaterThanOrEqual(0);
    expect(result.current.score).toBeLessThanOrEqual(100);
    expect(["A", "B", "C", "D", "F"]).toContain(result.current.grade);
  });

  it("returns breakdown with engine", () => {
    const { result } = renderHook(() => useAdoptionScore(), {
      wrapper: createWrapper({ withEngine: true }),
    });

    expect(result.current.breakdown).toHaveProperty("featuresExplored");
    expect(result.current.breakdown).toHaveProperty("dismissRate");
    expect(result.current.breakdown).toHaveProperty("completionRate");
    expect(result.current.breakdown).toHaveProperty("engagementTrend");
    expect(["rising", "stable", "declining"]).toContain(
      result.current.breakdown.engagementTrend,
    );
  });

  it("returns recommendations for unseen features", () => {
    const { result } = renderHook(() => useAdoptionScore(), {
      wrapper: createWrapper({ withEngine: true }),
    });

    expect(result.current.recommendations.length).toBeGreaterThan(0);
  });

  it("returns perfect score with empty manifest", () => {
    const { result } = renderHook(() => useAdoptionScore(), {
      wrapper: createWrapper({ withEngine: true, manifest: [] }),
    });

    expect(result.current.score).toBe(100);
    expect(result.current.grade).toBe("A");
  });
});

describe("useBehaviorProfile", () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it("returns defaults without engine", () => {
    const { result } = renderHook(() => useBehaviorProfile(), {
      wrapper: createWrapper({ withEngine: false }),
    });

    expect(result.current.hasEngine).toBe(false);
    expect(result.current.sessionCount).toBe(0);
    expect(result.current.dismissRate).toBe(0);
    expect(result.current.engagementRate).toBe(0);
    expect(result.current.preferredFormat).toBe("badge");
  });

  it("returns hasEngine=true with engine", () => {
    const { result } = renderHook(() => useBehaviorProfile(), {
      wrapper: createWrapper({ withEngine: true }),
    });

    expect(result.current.hasEngine).toBe(true);
  });

  it("returns valid rate values", () => {
    const { result } = renderHook(() => useBehaviorProfile(), {
      wrapper: createWrapper({ withEngine: true }),
    });

    expect(result.current.dismissRate).toBeGreaterThanOrEqual(0);
    expect(result.current.dismissRate).toBeLessThanOrEqual(1);
    expect(result.current.engagementRate).toBeGreaterThanOrEqual(0);
    expect(result.current.engagementRate).toBeLessThanOrEqual(1);
  });
});
