import { describe, expect, it } from "vitest";
import {
  getAnimationDurationMs,
  getEnterAnimation,
  getExitAnimation,
  getPulseAnimation,
  resolveAnimationPreset,
} from "../animation";

describe("animation utilities", () => {
  it("respects reduced motion by forcing none", () => {
    expect(resolveAnimationPreset("playful", { reducedMotion: true })).toBe("none");
    expect(resolveAnimationPreset("subtle", { reducedMotion: false })).toBe("subtle");
  });

  it("returns deterministic enter animation values per preset/surface", () => {
    expect(getEnterAnimation("none", "modal")).toBeUndefined();
    expect(getEnterAnimation("subtle", "panel")).toContain("featuredrop-enter-panel");
    expect(getEnterAnimation("normal", "toast")).toContain("featuredrop-enter-fade-up");
    expect(getEnterAnimation("playful", "modal")).toContain("featuredrop-enter-pop");
  });

  it("returns deterministic exit animation values and durations", () => {
    expect(getExitAnimation("none", "modal")).toBeUndefined();
    expect(getExitAnimation("subtle", "panel")).toContain("featuredrop-exit-panel");
    expect(getAnimationDurationMs("subtle", "panel", "exit")).toBe(150);
    expect(getAnimationDurationMs("normal", "toast", "enter")).toBe(210);
  });

  it("returns deterministic pulse animation values", () => {
    expect(getPulseAnimation("none", "dot")).toBeUndefined();
    expect(getPulseAnimation("subtle", "dot")).toContain("featuredrop-pulse");
    expect(getPulseAnimation("playful", "beacon")).toContain("featuredrop-beacon-pop-pulse");
  });
});
