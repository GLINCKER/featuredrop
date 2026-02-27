import { describe, expect, it } from "vitest";
import { applyAnnouncementThrottle } from "../throttle";
import type { FeatureEntry } from "../types";

function feature(
  id: string,
  priority: FeatureEntry["priority"],
  releasedAt: string,
): FeatureEntry {
  return {
    id,
    label: id,
    releasedAt,
    showNewUntil: "2026-12-31T00:00:00Z",
    priority: priority ?? "normal",
  };
}

describe("applyAnnouncementThrottle", () => {
  const features: FeatureEntry[] = [
    feature("normal-old", "normal", "2026-02-10T00:00:00Z"),
    feature("critical-new", "critical", "2026-02-15T00:00:00Z"),
    feature("normal-new", "normal", "2026-02-14T00:00:00Z"),
    feature("low-new", "low", "2026-02-16T00:00:00Z"),
  ];

  it("limits visible features and queues the rest", () => {
    const result = applyAnnouncementThrottle(
      features,
      { maxSimultaneousBadges: 2 },
      { sessionStartedAt: Date.now() - 10_000, quietMode: false },
    );
    expect(result.visible.map((item) => item.id)).toEqual(["critical-new", "normal-new"]);
    expect(result.queued.map((item) => item.id)).toEqual(["normal-old", "low-new"]);
  });

  it("queues everything during session cooldown", () => {
    const now = Date.now();
    const result = applyAnnouncementThrottle(
      features,
      { sessionCooldown: 30_000 },
      { sessionStartedAt: now - 5_000, quietMode: false },
      now,
    );
    expect(result.visible).toHaveLength(0);
    expect(result.queued).toHaveLength(features.length);
  });

  it("respects quiet mode by showing only critical announcements", () => {
    const result = applyAnnouncementThrottle(
      features,
      { respectDoNotDisturb: true },
      { sessionStartedAt: Date.now() - 10_000, quietMode: true },
    );
    expect(result.visible.map((item) => item.id)).toEqual(["critical-new"]);
    expect(result.queued).toHaveLength(3);
  });
});
