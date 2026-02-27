import { describe, expect, it } from "vitest";
import type { FeatureManifest } from "../types";
import {
  hasDependencyCycle,
  resolveDependencyOrder,
  sortFeaturesByDependencies,
} from "../dependencies";

function createFeature(id: string, dependsOn?: { seen?: string[] }): FeatureManifest[number] {
  return {
    id,
    label: id,
    releasedAt: "2026-02-20T00:00:00Z",
    showNewUntil: "2026-03-20T00:00:00Z",
    dependsOn,
  };
}

describe("dependencies helpers", () => {
  it("resolves topological dependency order", () => {
    const manifest: FeatureManifest = [
      createFeature("c", { seen: ["b"] }),
      createFeature("a"),
      createFeature("b", { seen: ["a"] }),
    ];
    expect(resolveDependencyOrder(manifest)).toEqual(["a", "b", "c"]);
  });

  it("detects dependency cycles", () => {
    const cyclic: FeatureManifest = [
      createFeature("a", { seen: ["b"] }),
      createFeature("b", { seen: ["a"] }),
    ];
    expect(hasDependencyCycle(cyclic)).toBe(true);
  });

  it("sorts visible features by dependency order", () => {
    const visible = [
      createFeature("dependent", { seen: ["base"] }),
      createFeature("base"),
    ];
    expect(sortFeaturesByDependencies(visible).map((feature) => feature.id)).toEqual([
      "base",
      "dependent",
    ]);
  });
});
