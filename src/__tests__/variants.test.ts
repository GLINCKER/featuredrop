import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyFeatureVariant,
  applyFeatureVariants,
  getFeatureVariantName,
  getOrCreateVariantKey,
} from "../variants";
import type { FeatureEntry } from "../types";

const baseFeature: FeatureEntry = {
  id: "ai-journal",
  label: "AI Journal",
  description: "Base copy",
  releasedAt: "2026-02-20T00:00:00Z",
  showNewUntil: "2026-03-20T00:00:00Z",
  variants: {
    control: { description: "Control copy" },
    treatment: { description: "Treatment copy", cta: { label: "Try now", url: "/journal" } },
  },
  variantSplit: [0, 100],
};

describe("variants", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => {
        store.clear();
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("applies deterministic variant overrides", () => {
    const first = applyFeatureVariant(baseFeature, "user-123");
    const second = applyFeatureVariant(baseFeature, "user-123");
    expect(first.description).toBe("Treatment copy");
    expect(second.description).toBe("Treatment copy");
    expect(getFeatureVariantName(first)).toBe("treatment");
  });

  it("applies variants across the manifest", () => {
    const manifest = applyFeatureVariants([baseFeature], "user-456");
    expect(manifest).toHaveLength(1);
    expect(manifest[0].description).toBe("Treatment copy");
  });

  it("creates and reuses anonymous variant key when explicit key missing", () => {
    const first = getOrCreateVariantKey();
    const second = getOrCreateVariantKey();
    expect(first).toBeTruthy();
    expect(second).toBe(first);
  });
});
