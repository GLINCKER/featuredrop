import { describe, expect, it, vi } from "vitest";
import {
  createFlagBridge,
  LaunchDarklyBridge,
  PostHogBridge,
  type LaunchDarklyClientLike,
  type PostHogClientLike,
} from "../flags";

describe("feature flag bridges", () => {
  it("creates a generic flag bridge wrapper", () => {
    const bridge = createFlagBridge({
      isEnabled: (flagKey) => flagKey === "enabled-flag",
    });
    expect(bridge.isEnabled("enabled-flag")).toBe(true);
    expect(bridge.isEnabled("disabled-flag")).toBe(false);
  });

  it("evaluates flags via LaunchDarkly variation", () => {
    const variation = vi.fn().mockReturnValue(true);
    const client: LaunchDarklyClientLike = { variation };
    const bridge = new LaunchDarklyBridge(client);

    expect(bridge.isEnabled("new-ui", { plan: "pro", role: "admin" })).toBe(true);
    expect(variation).toHaveBeenCalledWith(
      "new-ui",
      expect.objectContaining({
        custom: expect.objectContaining({ plan: "pro", role: "admin" }),
      }),
      false,
    );
  });

  it("evaluates flags via PostHog isFeatureEnabled", () => {
    const isFeatureEnabled = vi.fn().mockReturnValue(true);
    const client: PostHogClientLike = { isFeatureEnabled };
    const bridge = new PostHogBridge(client);

    expect(bridge.isEnabled("export-v2", { traits: { id: "user-1", cohort: "beta" } })).toBe(true);
    expect(isFeatureEnabled).toHaveBeenCalledWith(
      "export-v2",
      "user-1",
      undefined,
      { id: "user-1", cohort: "beta" },
    );
  });
});
