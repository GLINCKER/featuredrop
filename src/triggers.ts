import type { FeatureEntry, FeatureTrigger, TriggerContext } from "./types";

function wildcardToRegExp(value: string): RegExp {
  const escaped = value.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  const pattern = `^${escaped.replace(/\*/g, ".*")}$`;
  return new RegExp(pattern);
}

function matchPath(path: string, pattern: string | RegExp): boolean {
  if (pattern instanceof RegExp) return pattern.test(path);
  if (!pattern) return false;
  if (pattern.includes("*")) return wildcardToRegExp(pattern).test(path);
  return path === pattern || path.startsWith(pattern);
}

export function isTriggerMatch(trigger: FeatureTrigger | undefined, context?: TriggerContext): boolean {
  if (!trigger) return true;
  if (!context) return false;

  if (trigger.type === "page") {
    const path = context.path;
    if (!path) return false;
    return matchPath(path, trigger.match);
  }

  if (trigger.type === "usage") {
    const usage = context.usage ?? {};
    const count = usage[trigger.event] ?? 0;
    return count >= (trigger.minActions ?? 1);
  }

  if (trigger.type === "time") {
    const elapsedMs = context.elapsedMs ?? 0;
    return elapsedMs >= trigger.minSeconds * 1000;
  }

  if (trigger.type === "milestone") {
    return context.milestones?.has(trigger.event) ?? false;
  }

  if (trigger.type === "frustration") {
    const usage = context.usage ?? {};
    const count = usage[trigger.pattern] ?? 0;
    return count >= (trigger.threshold ?? 1);
  }

  if (trigger.type === "scroll") {
    return (context.scrollPercent ?? 0) >= (trigger.minPercent ?? 50);
  }

  try {
    return trigger.evaluate(context);
  } catch {
    return false;
  }
}

export class TriggerEngine {
  private context: TriggerContext;

  constructor(initial?: TriggerContext) {
    this.context = {
      path: initial?.path,
      events: new Set(initial?.events ?? []),
      milestones: new Set(initial?.milestones ?? []),
      usage: { ...(initial?.usage ?? {}) },
      elapsedMs: initial?.elapsedMs ?? 0,
      scrollPercent: initial?.scrollPercent ?? 0,
      metadata: { ...(initial?.metadata ?? {}) },
    };
  }

  setPath(path: string): void {
    this.context.path = path;
  }

  trackEvent(event: string): void {
    const next = new Set(this.context.events ?? new Set<string>());
    next.add(event);
    this.context.events = next;
  }

  trackUsage(event: string, delta = 1): void {
    const usage = { ...(this.context.usage ?? {}) };
    usage[event] = (usage[event] ?? 0) + Math.max(1, delta);
    this.context.usage = usage;
  }

  trackMilestone(event: string): void {
    const next = new Set(this.context.milestones ?? new Set<string>());
    next.add(event);
    this.context.milestones = next;
  }

  setElapsedMs(elapsedMs: number): void {
    this.context.elapsedMs = Math.max(0, elapsedMs);
  }

  setScrollPercent(scrollPercent: number): void {
    const clamped = Math.max(0, Math.min(100, scrollPercent));
    this.context.scrollPercent = clamped;
  }

  setMetadata(next: Record<string, unknown>): void {
    this.context.metadata = { ...next };
  }

  getContext(): TriggerContext {
    return {
      path: this.context.path,
      events: new Set(this.context.events ?? []),
      milestones: new Set(this.context.milestones ?? []),
      usage: { ...(this.context.usage ?? {}) },
      elapsedMs: this.context.elapsedMs,
      scrollPercent: this.context.scrollPercent,
      metadata: { ...(this.context.metadata ?? {}) },
    };
  }

  evaluate(trigger: FeatureTrigger | undefined): boolean {
    return isTriggerMatch(trigger, this.context);
  }

  evaluateFeature(feature: Pick<FeatureEntry, "trigger">): boolean {
    return this.evaluate(feature.trigger);
  }
}
