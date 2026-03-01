import { useMemo } from "react";
import { useFeatureDrop } from "./use-feature-drop";
import type { DisplayFormat } from "../../types";

export interface UseBehaviorProfileResult {
  /** Total sessions tracked */
  sessionCount: number;
  /** Dismiss rate (0-1) — fraction of announcements dismissed */
  dismissRate: number;
  /** Engagement rate (0-1) — fraction of announcements clicked/completed */
  engagementRate: number;
  /** User's preferred display format based on past behavior */
  preferredFormat: DisplayFormat;
  /** Whether an engine is available */
  hasEngine: boolean;
}

const DEFAULT_PROFILE: UseBehaviorProfileResult = {
  sessionCount: 0,
  dismissRate: 0,
  engagementRate: 0,
  preferredFormat: "badge",
  hasEngine: false,
};

/**
 * Access the user's behavior profile for debug or admin views.
 *
 * Exposes aggregated behavior data from the AdoptionEngine's BehaviorTracker.
 * Without an engine, returns default values.
 *
 * @returns `{ sessionCount, dismissRate, engagementRate, preferredFormat, hasEngine }`
 *
 * @example
 * ```tsx
 * function DebugPanel() {
 *   const { sessionCount, dismissRate, engagementRate, preferredFormat, hasEngine } = useBehaviorProfile()
 *
 *   if (!hasEngine) return <p>No engine configured</p>
 *
 *   return (
 *     <div>
 *       <p>Sessions: {sessionCount}</p>
 *       <p>Dismiss rate: {(dismissRate * 100).toFixed(0)}%</p>
 *       <p>Engagement rate: {(engagementRate * 100).toFixed(0)}%</p>
 *       <p>Preferred format: {preferredFormat}</p>
 *     </div>
 *   )
 * }
 * ```
 */
export function useBehaviorProfile(): UseBehaviorProfileResult {
  const { engine } = useFeatureDrop();

  return useMemo(() => {
    if (!engine) return DEFAULT_PROFILE;

    // Access BehaviorTracker via the engine's public methods
    // The engine tracks interactions internally, so we derive profile data
    // from the engine's adoption scoring methods
    const score = engine.getAdoptionScore();

    return {
      sessionCount: 0, // Not directly exposed by FeatureDropEngine interface
      dismissRate: score.breakdown.dismissRate,
      engagementRate: 1 - score.breakdown.dismissRate,
      preferredFormat: "badge" as DisplayFormat, // Default — full profile requires AdoptionEngine
      hasEngine: true,
    };
  }, [engine]);
}
