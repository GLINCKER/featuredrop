import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AmplitudeAdapter,
  AnalyticsCollector,
  CustomAdapter,
  MixpanelAdapter,
  PostHogAdapter,
  SegmentAdapter,
  createAdoptionMetrics,
  type AdoptionEvent,
} from "../analytics";

afterEach(() => {
  vi.useRealTimers();
});

describe("AnalyticsCollector", () => {
  it("flushes batches when batch size is reached", async () => {
    const trackBatch = vi.fn();
    const collector = new AnalyticsCollector({
      adapter: { track: vi.fn(), trackBatch },
      batchSize: 2,
      flushInterval: 0,
      random: () => 0,
    });

    collector.track({ type: "feature_seen", featureId: "a" });
    collector.track({ type: "feature_clicked", featureId: "a" });
    await collector.flush();

    expect(trackBatch).toHaveBeenCalledOnce();
    const flushed = trackBatch.mock.calls[0][0] as AdoptionEvent[];
    expect(flushed).toHaveLength(2);
    expect(flushed[0].type).toBe("feature_seen");
    expect(flushed[1].type).toBe("feature_clicked");
    await collector.destroy();
  });

  it("applies sampling and context fields", async () => {
    const track = vi.fn();
    const collector = new AnalyticsCollector({
      adapter: { track },
      batchSize: 10,
      flushInterval: 0,
      sampleRate: 0.5,
      random: () => 0.9,
      sessionId: "s1",
      userId: "u1",
    });

    collector.track({ type: "feature_seen", featureId: "a" });
    expect(collector.getQueueSize()).toBe(0);

    collector.setEnabled(false);
    collector.track({ type: "feature_seen", featureId: "a" });
    expect(collector.getQueueSize()).toBe(0);

    collector.setEnabled(true);
    collector.setContext({ sessionId: "s2" });
    const sampledIn = new AnalyticsCollector({
      adapter: { track },
      batchSize: 10,
      flushInterval: 0,
      sampleRate: 1,
      sessionId: "s2",
      userId: "u1",
      now: () => new Date("2026-02-26T00:00:00Z"),
    });
    sampledIn.track({ type: "feature_seen", featureId: "a" });
    await sampledIn.flush();

    expect(track).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "feature_seen",
        featureId: "a",
        sessionId: "s2",
        userId: "u1",
        timestamp: "2026-02-26T00:00:00.000Z",
      }),
    );

    await collector.destroy();
    await sampledIn.destroy();
  });

  it("requeues events when adapter throws", async () => {
    const track = vi.fn().mockRejectedValue(new Error("boom"));
    const collector = new AnalyticsCollector({
      adapter: { track },
      batchSize: 1,
      flushInterval: 0,
      random: () => 0,
    });
    collector.track({ type: "feature_seen", featureId: "a" });
    await collector.flush();
    expect(collector.getQueueSize()).toBe(1);
    await collector.destroy();
  });
});

describe("adapters", () => {
  it("maps events for provider adapters", () => {
    const posthog = { capture: vi.fn() };
    const amplitude = { track: vi.fn() };
    const mixpanel = { track: vi.fn() };
    const segment = { track: vi.fn() };
    const event: AdoptionEvent = {
      type: "feature_seen",
      featureId: "a",
      timestamp: "2026-02-26T00:00:00.000Z",
      metadata: { source: "test" },
    };

    new PostHogAdapter(posthog).track(event);
    new AmplitudeAdapter(amplitude).track(event);
    new MixpanelAdapter(mixpanel).track(event);
    new SegmentAdapter(segment).track(event);
    expect(posthog.capture).toHaveBeenCalledOnce();
    expect(amplitude.track).toHaveBeenCalledOnce();
    expect(mixpanel.track).toHaveBeenCalledOnce();
    expect(segment.track).toHaveBeenCalledOnce();
  });

  it("runs custom adapter handler", async () => {
    const handler = vi.fn();
    const adapter = new CustomAdapter(handler);
    await adapter.track({
      type: "feature_seen",
      featureId: "a",
      timestamp: "2026-02-26T00:00:00.000Z",
    });
    expect(handler).toHaveBeenCalledOnce();
  });
});

describe("createAdoptionMetrics", () => {
  it("computes adoption and engagement metrics", () => {
    const events: AdoptionEvent[] = [
      { type: "feature_seen", featureId: "a", timestamp: "2026-02-26T00:00:00.000Z", variant: "control" },
      { type: "feature_clicked", featureId: "a", timestamp: "2026-02-26T00:00:01.000Z", variant: "control" },
      { type: "feature_dismissed", featureId: "a", timestamp: "2026-02-26T00:00:02.000Z" },
      { type: "tour_started", tourId: "t1", timestamp: "2026-02-26T00:00:03.000Z" },
      { type: "tour_completed", tourId: "t1", timestamp: "2026-02-26T00:00:04.000Z" },
      { type: "checklist_task_completed", timestamp: "2026-02-26T00:00:05.000Z", metadata: { checklistId: "c1" } },
      { type: "checklist_completed", timestamp: "2026-02-26T00:00:06.000Z", metadata: { checklistId: "c1" } },
    ];
    const metrics = createAdoptionMetrics(events);
    expect(metrics.getAdoptionRate("a")).toBe(1);
    expect(metrics.getTourCompletionRate("t1")).toBe(1);
    expect(metrics.getChecklistCompletionRate("c1")).toBe(1);
    expect(metrics.getFeatureEngagement("a")).toEqual({
      seen: 1,
      clicked: 1,
      dismissed: 1,
    });
    expect(metrics.getVariantPerformance("a")).toEqual({ control: 1 });
  });
});
