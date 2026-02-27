import { describe, expect, it } from "vitest";
import { TriggerEngine, isTriggerMatch } from "../triggers";

describe("isTriggerMatch", () => {
  it("matches wildcard page patterns", () => {
    expect(
      isTriggerMatch(
        { type: "page", match: "/reports/*" },
        { path: "/reports/2026-q1" },
      ),
    ).toBe(true);
  });

  it("matches milestone and scroll triggers", () => {
    expect(
      isTriggerMatch(
        { type: "milestone", event: "first-team-member-invited" },
        { milestones: new Set(["first-team-member-invited"]) },
      ),
    ).toBe(true);
    expect(
      isTriggerMatch(
        { type: "scroll", minPercent: 60 },
        { scrollPercent: 75 },
      ),
    ).toBe(true);
  });

  it("handles custom trigger safely", () => {
    expect(
      isTriggerMatch(
        { type: "custom", evaluate: (context) => (context.usage?.search ?? 0) > 3 },
        { usage: { search: 4 } },
      ),
    ).toBe(true);
    expect(
      isTriggerMatch(
        { type: "custom", evaluate: () => { throw new Error("bad"); } },
        {},
      ),
    ).toBe(false);
  });
});

describe("TriggerEngine", () => {
  it("tracks usage/events/milestones and evaluates triggers", () => {
    const engine = new TriggerEngine({ path: "/home" });
    engine.setPath("/reports");
    engine.trackUsage("mouse-heavy-session");
    engine.trackUsage("mouse-heavy-session");
    engine.trackEvent("mouse-heavy-session");
    engine.trackMilestone("first-team-member-invited");
    engine.setElapsedMs(7000);
    engine.setScrollPercent(80);

    expect(engine.evaluate({ type: "page", match: "/reports" })).toBe(true);
    expect(
      engine.evaluate({ type: "usage", event: "mouse-heavy-session", minActions: 2 }),
    ).toBe(true);
    expect(engine.evaluate({ type: "time", minSeconds: 5 })).toBe(true);
    expect(engine.evaluate({ type: "scroll", minPercent: 70 })).toBe(true);
    expect(
      engine.evaluate({ type: "milestone", event: "first-team-member-invited" }),
    ).toBe(true);
  });
});
