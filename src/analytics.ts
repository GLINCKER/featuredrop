export type AdoptionEventType =
  | "feature_seen"
  | "feature_clicked"
  | "feature_dismissed"
  | "tour_started"
  | "tour_completed"
  | "tour_skipped"
  | "checklist_task_completed"
  | "checklist_completed"
  | "survey_submitted"
  | "feedback_submitted"
  | "announcement_shown"
  | "cta_clicked";

export interface AdoptionEvent {
  type: AdoptionEventType;
  featureId?: string;
  tourId?: string;
  variant?: string;
  timestamp: string;
  sessionId?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

export type AdoptionEventInput = Omit<AdoptionEvent, "timestamp"> & {
  timestamp?: string;
};

export interface AnalyticsAdapter {
  track: (event: AdoptionEvent) => void | Promise<void>;
  trackBatch?: (events: AdoptionEvent[]) => void | Promise<void>;
}

export interface AnalyticsCollectorOptions {
  adapter: AnalyticsAdapter;
  batchSize?: number;
  flushInterval?: number;
  sampleRate?: number;
  enabled?: boolean;
  sessionId?: string;
  userId?: string;
  now?: () => Date;
  random?: () => number;
}

export class AnalyticsCollector {
  private adapter: AnalyticsAdapter;
  private queue: AdoptionEvent[] = [];
  private batchSize: number;
  private flushInterval: number;
  private sampleRate: number;
  private enabled: boolean;
  private now: () => Date;
  private random: () => number;
  private sessionId?: string;
  private userId?: string;
  private timer: ReturnType<typeof setInterval> | null = null;
  private flushing = false;

  constructor(options: AnalyticsCollectorOptions) {
    this.adapter = options.adapter;
    this.batchSize = options.batchSize ?? 20;
    this.flushInterval = options.flushInterval ?? 10_000;
    this.sampleRate = options.sampleRate ?? 1;
    this.enabled = options.enabled ?? true;
    this.sessionId = options.sessionId;
    this.userId = options.userId;
    this.now = options.now ?? (() => new Date());
    this.random = options.random ?? Math.random;
    this.startTimer();
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  setContext(context: { sessionId?: string; userId?: string }): void {
    if (context.sessionId !== undefined) this.sessionId = context.sessionId;
    if (context.userId !== undefined) this.userId = context.userId;
  }

  getQueueSize(): number {
    return this.queue.length;
  }

  track(event: AdoptionEventInput): void {
    if (!this.enabled) return;
    if (this.sampleRate < 1 && this.random() > this.sampleRate) return;
    const normalized: AdoptionEvent = {
      ...event,
      timestamp: event.timestamp ?? this.now().toISOString(),
      sessionId: event.sessionId ?? this.sessionId,
      userId: event.userId ?? this.userId,
    };
    this.queue.push(normalized);
    if (this.queue.length >= this.batchSize) {
      void this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.flushing) return;
    if (this.queue.length === 0) return;
    this.flushing = true;
    const batch = this.queue.splice(0, this.queue.length);
    try {
      if (this.adapter.trackBatch) {
        await this.adapter.trackBatch(batch);
      } else {
        for (const event of batch) {
          await this.adapter.track(event);
        }
      }
    } catch {
      // Requeue on transient failures.
      this.queue = [...batch, ...this.queue];
    } finally {
      this.flushing = false;
    }
  }

  async destroy(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    await this.flush();
  }

  private startTimer(): void {
    if (this.flushInterval <= 0) return;
    this.timer = setInterval(() => {
      void this.flush();
    }, this.flushInterval);
  }
}

export class PostHogAdapter implements AnalyticsAdapter {
  constructor(
    private readonly client: {
      capture: (event: string, properties?: Record<string, unknown>) => void;
    },
  ) {}

  track(event: AdoptionEvent): void {
    this.client.capture(event.type, {
      featureId: event.featureId,
      tourId: event.tourId,
      variant: event.variant,
      timestamp: event.timestamp,
      sessionId: event.sessionId,
      userId: event.userId,
      ...event.metadata,
    });
  }
}

export class AmplitudeAdapter implements AnalyticsAdapter {
  constructor(
    private readonly client: {
      track: (event: string, properties?: Record<string, unknown>) => void;
    },
  ) {}

  track(event: AdoptionEvent): void {
    this.client.track(event.type, {
      featureId: event.featureId,
      tourId: event.tourId,
      variant: event.variant,
      timestamp: event.timestamp,
      sessionId: event.sessionId,
      userId: event.userId,
      ...event.metadata,
    });
  }
}

export class MixpanelAdapter implements AnalyticsAdapter {
  constructor(
    private readonly client: {
      track: (event: string, properties?: Record<string, unknown>) => void;
    },
  ) {}

  track(event: AdoptionEvent): void {
    this.client.track(event.type, {
      featureId: event.featureId,
      tourId: event.tourId,
      variant: event.variant,
      timestamp: event.timestamp,
      sessionId: event.sessionId,
      userId: event.userId,
      ...event.metadata,
    });
  }
}

export class SegmentAdapter implements AnalyticsAdapter {
  constructor(
    private readonly client: {
      track: (event: string, properties?: Record<string, unknown>) => void;
    },
  ) {}

  track(event: AdoptionEvent): void {
    this.client.track(event.type, {
      featureId: event.featureId,
      tourId: event.tourId,
      variant: event.variant,
      timestamp: event.timestamp,
      sessionId: event.sessionId,
      userId: event.userId,
      ...event.metadata,
    });
  }
}

export class CustomAdapter implements AnalyticsAdapter {
  constructor(private readonly handler: (event: AdoptionEvent) => void | Promise<void>) {}

  track(event: AdoptionEvent): void | Promise<void> {
    return this.handler(event);
  }
}

export interface FeatureEngagementMetrics {
  seen: number;
  clicked: number;
  dismissed: number;
}

export interface AdoptionMetrics {
  getAdoptionRate: (featureId: string) => number;
  getTourCompletionRate: (tourId: string) => number;
  getChecklistCompletionRate: (checklistId: string) => number;
  getFeatureEngagement: (featureId: string) => FeatureEngagementMetrics;
  getVariantPerformance: (featureId: string) => Record<string, number>;
}

export function createAdoptionMetrics(events: AdoptionEvent[]): AdoptionMetrics {
  const getAdoptionRate = (featureId: string): number => {
    const seen = events.filter((event) => event.type === "feature_seen" && event.featureId === featureId).length;
    if (seen === 0) return 0;
    const clicked = events.filter((event) => event.type === "feature_clicked" && event.featureId === featureId).length;
    return clicked / seen;
  };

  const getTourCompletionRate = (tourId: string): number => {
    const started = events.filter((event) => event.type === "tour_started" && event.tourId === tourId).length;
    if (started === 0) return 0;
    const completed = events.filter((event) => event.type === "tour_completed" && event.tourId === tourId).length;
    return completed / started;
  };

  const getChecklistCompletionRate = (checklistId: string): number => {
    const taskCompleted = events.filter((event) =>
      event.type === "checklist_task_completed" &&
      event.metadata?.checklistId === checklistId
    ).length;
    if (taskCompleted === 0) return 0;
    const completed = events.filter((event) =>
      event.type === "checklist_completed" &&
      event.metadata?.checklistId === checklistId
    ).length;
    return completed / taskCompleted;
  };

  const getFeatureEngagement = (featureId: string): FeatureEngagementMetrics => ({
    seen: events.filter((event) => event.type === "feature_seen" && event.featureId === featureId).length,
    clicked: events.filter((event) => event.type === "feature_clicked" && event.featureId === featureId).length,
    dismissed: events.filter((event) => event.type === "feature_dismissed" && event.featureId === featureId).length,
  });

  const getVariantPerformance = (featureId: string): Record<string, number> => {
    const byVariant = new Map<string, { seen: number; clicked: number }>();
    for (const event of events) {
      if (event.featureId !== featureId) continue;
      const variant = event.variant ?? "control";
      const bucket = byVariant.get(variant) ?? { seen: 0, clicked: 0 };
      if (event.type === "feature_seen") bucket.seen += 1;
      if (event.type === "feature_clicked") bucket.clicked += 1;
      byVariant.set(variant, bucket);
    }
    const output: Record<string, number> = {};
    for (const [variant, bucket] of byVariant.entries()) {
      output[variant] = bucket.seen === 0 ? 0 : bucket.clicked / bucket.seen;
    }
    return output;
  };

  return {
    getAdoptionRate,
    getTourCompletionRate,
    getChecklistCompletionRate,
    getFeatureEngagement,
    getVariantPerformance,
  };
}
