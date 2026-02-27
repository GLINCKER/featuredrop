import type { FeatureEntry } from "./types";

export interface ThrottleOptions {
  maxSimultaneousBadges?: number;
  maxSimultaneousSpotlights?: number;
  maxToastsPerSession?: number;
  minTimeBetweenModals?: number;
  minTimeBetweenTours?: number;
  sessionCooldown?: number;
  respectDoNotDisturb?: boolean;
}

export interface ThrottleRuntimeState {
  sessionStartedAt: number;
  quietMode?: boolean;
}

export interface ThrottleResult {
  visible: FeatureEntry[];
  queued: FeatureEntry[];
}

function sortByPriorityAndRecency(features: FeatureEntry[]): FeatureEntry[] {
  const priorityWeight = { critical: 3, normal: 2, low: 1 };
  return [...features].sort((a, b) => {
    const scoreA = priorityWeight[a.priority ?? "normal"];
    const scoreB = priorityWeight[b.priority ?? "normal"];
    if (scoreA !== scoreB) return scoreB - scoreA;
    return new Date(b.releasedAt).getTime() - new Date(a.releasedAt).getTime();
  });
}

export function applyAnnouncementThrottle(
  features: FeatureEntry[],
  options: ThrottleOptions | undefined,
  state: ThrottleRuntimeState,
  now: number = Date.now(),
): ThrottleResult {
  const sorted = sortByPriorityAndRecency(features);
  if (sorted.length === 0) {
    return { visible: [], queued: [] };
  }

  if (options?.sessionCooldown && options.sessionCooldown > 0) {
    const elapsed = now - state.sessionStartedAt;
    if (elapsed < options.sessionCooldown) {
      return { visible: [], queued: sorted };
    }
  }

  if (options?.respectDoNotDisturb && state.quietMode) {
    const visible = sorted.filter((feature) => feature.priority === "critical");
    const queued = sorted.filter((feature) => feature.priority !== "critical");
    return { visible, queued };
  }

  const maxVisible = options?.maxSimultaneousBadges;
  if (!maxVisible || !Number.isFinite(maxVisible) || maxVisible < 1) {
    return { visible: sorted, queued: [] };
  }

  return {
    visible: sorted.slice(0, maxVisible),
    queued: sorted.slice(maxVisible),
  };
}
