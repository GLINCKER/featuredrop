import { describe, expect, it } from "vitest";
import { ChangelogWidget, FeatureDropProvider, useFeatureDrop } from "../preact";

describe("preact adapter", () => {
  it("re-exports core React bindings for compat usage", () => {
    expect(typeof FeatureDropProvider).toBe("function");
    expect(typeof ChangelogWidget).toBe("function");
    expect(typeof useFeatureDrop).toBe("function");
  });
});
