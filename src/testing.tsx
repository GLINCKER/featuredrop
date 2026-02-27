import type { ReactElement, ReactNode } from "react";
import { AnalyticsCollector } from "./analytics";
import type { AdoptionEvent, AnalyticsCollectorOptions } from "./analytics";
import { createManifest } from "./helpers";
import { FeatureDropProvider } from "./react/provider";
import type { FeatureDropProviderProps } from "./react/provider";
import type { FeatureEntry, FeatureManifest, FeatureType, StorageAdapter } from "./types";

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function toIso(value: string, now: Date, fallbackDays = 0): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "today") return new Date(now).toISOString();
  const rel = trimmed.match(/^([+-]\d+)d$/);
  if (rel) {
    const days = Number(rel[1]);
    return new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
  }
  const parsed = new Date(trimmed).getTime();
  if (Number.isFinite(parsed)) return new Date(parsed).toISOString();
  return new Date(now.getTime() + fallbackDays * 24 * 60 * 60 * 1000).toISOString();
}

export type MockFeatureInput = Partial<FeatureEntry> & {
  id?: string;
  label?: string;
  releasedAt?: string;
  showNewUntil?: string;
  type?: FeatureType;
};

export function createMockManifest(
  entries: MockFeatureInput[],
  now: Date = new Date(),
): FeatureManifest {
  const normalized = entries.map((entry, index) => {
    const label = entry.label?.trim() || `Feature ${index + 1}`;
    const id = entry.id?.trim() || toSlug(label) || `feature-${index + 1}`;
    const releasedAt = toIso(entry.releasedAt ?? "today", now);
    const showNewUntil = toIso(entry.showNewUntil ?? "+14d", now, 14);
    const normalizedEntry: FeatureEntry = {
      ...entry,
      id,
      label,
      releasedAt,
      showNewUntil,
      type: entry.type ?? "feature",
    };
    return normalizedEntry;
  });
  return createManifest(normalized);
}

export interface MockStorage extends StorageAdapter {
  setWatermark: (watermark: string | null) => void;
  setDismissedIds: (ids: string[]) => void;
  reset: () => void;
}

class MockStorageAdapter implements MockStorage {
  private watermark: string | null;
  private dismissed = new Set<string>();

  constructor(initial?: { watermark?: string | null; dismissedIds?: string[] }) {
    this.watermark = initial?.watermark ?? null;
    if (initial?.dismissedIds) {
      for (const id of initial.dismissedIds) this.dismissed.add(id);
    }
  }

  getWatermark(): string | null {
    return this.watermark;
  }

  getDismissedIds(): ReadonlySet<string> {
    return this.dismissed;
  }

  dismiss(id: string): void {
    this.dismissed.add(id);
  }

  async dismissAll(now: Date): Promise<void> {
    this.watermark = now.toISOString();
    this.dismissed.clear();
  }

  setWatermark(watermark: string | null): void {
    this.watermark = watermark;
  }

  setDismissedIds(ids: string[]): void {
    this.dismissed = new Set(ids);
  }

  reset(): void {
    this.watermark = null;
    this.dismissed.clear();
  }
}

export function createMockStorage(initial?: { watermark?: string | null; dismissedIds?: string[] }): MockStorage {
  return new MockStorageAdapter(initial);
}

export function createTestProvider(
  props: Omit<FeatureDropProviderProps, "children">,
): ({ children }: { children?: ReactNode }) => ReactElement {
  return function TestProvider({ children }: { children?: ReactNode }): ReactElement {
    return <FeatureDropProvider {...props}>{children}</FeatureDropProvider>;
  };
}

interface TimerController {
  advanceTimersByTime: (ms: number) => void;
  setSystemTime?: (now: number | Date) => void;
}

function getTimerController(): TimerController | null {
  const viController = (globalThis as { vi?: TimerController }).vi;
  if (viController && typeof viController.advanceTimersByTime === "function") return viController;
  const jestController = (globalThis as { jest?: TimerController }).jest;
  if (jestController && typeof jestController.advanceTimersByTime === "function") return jestController;
  return null;
}

export function advanceTime(ms: number): void {
  const controller = getTimerController();
  if (!controller) throw new Error("No fake timer controller found (vi/jest).");
  controller.advanceTimersByTime(ms);
}

export function setMockTime(now: number | Date): void {
  const controller = getTimerController();
  if (!controller || typeof controller.setSystemTime !== "function") {
    throw new Error("Timer controller does not support setSystemTime.");
  }
  controller.setSystemTime(now);
}

export type MockAnalyticsCollectorOptions = Omit<AnalyticsCollectorOptions, "adapter">;

export class MockAnalyticsCollector extends AnalyticsCollector {
  readonly events: AdoptionEvent[] = [];

  constructor(options: MockAnalyticsCollectorOptions = {}) {
    const events: AdoptionEvent[] = [];
    super({
      adapter: {
        track: (event: AdoptionEvent) => {
          events.push(event);
        },
        trackBatch: (batch: AdoptionEvent[]) => {
          events.push(...batch);
        },
      },
      batchSize: options.batchSize ?? 1,
      flushInterval: options.flushInterval ?? 0,
      sampleRate: options.sampleRate,
      enabled: options.enabled,
      sessionId: options.sessionId,
      userId: options.userId,
      now: options.now,
      random: options.random,
    });
    this.events = events;
  }

  clear(): void {
    this.events.splice(0, this.events.length);
  }
}
