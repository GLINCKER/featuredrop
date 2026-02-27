import { render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useNewCount } from "../react";
import {
  MockAnalyticsCollector,
  advanceTime,
  createMockManifest,
  createMockStorage,
  createTestProvider,
} from "../testing";

function CountLabel() {
  const count = useNewCount();
  return <span data-testid="count">{count}</span>;
}

describe("testing utilities", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-26T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("builds a manifest with relative dates", () => {
    const manifest = createMockManifest([
      { label: "AI Journal", releasedAt: "today", showNewUntil: "+14d" },
    ], new Date("2026-02-26T00:00:00Z"));
    expect(manifest[0]?.id).toBe("ai-journal");
    expect(manifest[0]?.releasedAt).toBe("2026-02-26T00:00:00.000Z");
    expect(manifest[0]?.showNewUntil).toBe("2026-03-12T00:00:00.000Z");
  });

  it("provides mutable mock storage", async () => {
    const storage = createMockStorage({ dismissedIds: ["one"] });
    expect(storage.getDismissedIds().has("one")).toBe(true);
    storage.dismiss("two");
    expect(storage.getDismissedIds().has("two")).toBe(true);
    await storage.dismissAll(new Date("2026-02-26T00:00:00Z"));
    expect(storage.getWatermark()).toBe("2026-02-26T00:00:00.000Z");
    expect(storage.getDismissedIds().size).toBe(0);
  });

  it("creates provider wrapper for render", () => {
    const manifest = createMockManifest([
      { id: "new-one", label: "New One", releasedAt: "today", showNewUntil: "+14d" },
    ]);
    const storage = createMockStorage();
    const Wrapper = createTestProvider({ manifest, storage });
    render(<CountLabel />, { wrapper: Wrapper });
    expect(screen.getByTestId("count").textContent).toBe("1");
  });

  it("advances fake timers through utility helper", () => {
    let hit = false;
    setTimeout(() => {
      hit = true;
    }, 1000);
    advanceTime(1000);
    expect(hit).toBe(true);
  });

  it("captures analytics events in memory", async () => {
    const collector = new MockAnalyticsCollector();
    collector.track({ type: "feature_seen", featureId: "ai-journal" });
    await collector.flush();
    expect(collector.events).toHaveLength(1);
    expect(collector.events[0]?.featureId).toBe("ai-journal");
    await collector.destroy();
  });
});
