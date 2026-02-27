import { describe, expect, it, vi } from "vitest";
import { MemoryAdapter } from "../adapters/memory";
import { createFlagBridge } from "../flags";
import { createChangelogRenderer } from "../renderer";
import type { FeatureManifest } from "../types";

const BASE_MANIFEST: FeatureManifest = [
  {
    id: "core-a",
    label: "Core A",
    releasedAt: "2026-02-10T00:00:00Z",
    showNewUntil: "2026-03-10T00:00:00Z",
    sidebarKey: "/core-a",
    category: "core",
    priority: "normal",
  },
  {
    id: "ai-critical",
    label: "AI Critical",
    releasedAt: "2026-02-08T00:00:00Z",
    showNewUntil: "2026-03-10T00:00:00Z",
    sidebarKey: "/ai",
    category: "ai",
    priority: "critical",
  },
  {
    id: "v2-only",
    label: "Version gated",
    releasedAt: "2026-02-12T00:00:00Z",
    showNewUntil: "2026-03-10T00:00:00Z",
    sidebarKey: "/v2",
    category: "core",
    version: {
      introduced: "2.0.0",
    },
  },
  {
    id: "flagged",
    label: "Flagged",
    releasedAt: "2026-02-14T00:00:00Z",
    showNewUntil: "2026-03-10T00:00:00Z",
    sidebarKey: "/flagged",
    flagKey: "flag-enabled",
  },
  {
    id: "product-only",
    label: "AskVerdict only",
    releasedAt: "2026-02-14T00:00:00Z",
    showNewUntil: "2026-03-10T00:00:00Z",
    sidebarKey: "/product",
    product: "askverdict",
  },
];

describe("createChangelogRenderer", () => {
  it("computes state and computed helpers from manifest + storage", () => {
    const renderer = createChangelogRenderer({
      manifest: BASE_MANIFEST,
      storage: new MemoryAdapter(),
      appVersion: "1.5.0",
      now: () => new Date("2026-02-20T00:00:00Z"),
    });

    expect(renderer.state.newCount).toBe(2);
    expect(renderer.state.newFeaturesSorted[0]?.id).toBe("ai-critical");
    expect(renderer.computed.isNew("/ai")).toBe(true);
    expect(renderer.computed.getFeatureById("v2-only")).toBeUndefined();
    expect(renderer.computed.getFeaturesByCategory("core").length).toBe(1);
  });

  it("updates subscribers when dismissing and supports unsubscribe", () => {
    const renderer = createChangelogRenderer({
      manifest: BASE_MANIFEST,
      storage: new MemoryAdapter(),
      appVersion: "1.5.0",
      now: () => new Date("2026-02-20T00:00:00Z"),
    });

    const listener = vi.fn();
    const unsubscribe = renderer.subscribe(listener);

    renderer.actions.dismiss("core-a");
    expect(renderer.state.newCount).toBe(1);
    expect(listener).toHaveBeenCalled();

    const callsBeforeUnsubscribe = listener.mock.calls.length;
    unsubscribe();
    renderer.actions.dismiss("ai-critical");
    expect(listener.mock.calls.length).toBe(callsBeforeUnsubscribe);
  });

  it("supports dynamic appVersion/userContext/manifest updates", () => {
    const renderer = createChangelogRenderer({
      manifest: BASE_MANIFEST,
      storage: new MemoryAdapter(),
      appVersion: "1.5.0",
      userContext: { plan: "free" },
      now: () => new Date("2026-02-20T00:00:00Z"),
    });

    expect(renderer.computed.getFeatureById("v2-only")).toBeUndefined();

    renderer.actions.setAppVersion("2.1.0");
    expect(renderer.computed.getFeatureById("v2-only")).toBeDefined();

    renderer.actions.setManifest([
      ...BASE_MANIFEST,
      {
        id: "pro-only",
        label: "Pro only",
        releasedAt: "2026-02-15T00:00:00Z",
        showNewUntil: "2026-03-10T00:00:00Z",
        sidebarKey: "/pro",
        category: "pro",
        audience: { plan: ["pro"] },
      },
    ]);

    expect(renderer.computed.getFeatureById("pro-only")).toBeUndefined();
    renderer.actions.setUserContext({ plan: "pro" });
    expect(renderer.computed.getFeatureById("pro-only")).toBeDefined();
  });

  it("supports dynamic flag bridge updates", () => {
    const renderer = createChangelogRenderer({
      manifest: BASE_MANIFEST,
      storage: new MemoryAdapter(),
      appVersion: "2.1.0",
      now: () => new Date("2026-02-20T00:00:00Z"),
    });

    expect(renderer.computed.getFeatureById("flagged")).toBeUndefined();

    renderer.actions.setFlagBridge(
      createFlagBridge({ isEnabled: (key) => key === "flag-enabled" }),
    );
    expect(renderer.computed.getFeatureById("flagged")).toBeDefined();
  });

  it("supports dynamic product scope updates", () => {
    const renderer = createChangelogRenderer({
      manifest: BASE_MANIFEST,
      storage: new MemoryAdapter(),
      appVersion: "2.1.0",
      now: () => new Date("2026-02-20T00:00:00Z"),
    });

    expect(renderer.computed.getFeatureById("product-only")).toBeUndefined();
    renderer.actions.setProduct("askverdict");
    expect(renderer.computed.getFeatureById("product-only")).toBeDefined();
  });

  it("dismisses all and refreshes watermark state", async () => {
    const renderer = createChangelogRenderer({
      manifest: BASE_MANIFEST,
      storage: new MemoryAdapter(),
      appVersion: "2.1.0",
      now: () => new Date("2026-02-20T00:00:00Z"),
    });

    expect(renderer.state.newCount).toBe(3);
    await renderer.actions.dismissAll();
    expect(renderer.state.newCount).toBe(0);
    expect(renderer.state.watermark).toBe("2026-02-20T00:00:00.000Z");
  });
});
