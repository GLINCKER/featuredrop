import { useMemo } from "react";
import { useFeatureDrop } from "./use-feature-drop";
import type { AdoptionScore } from "../../types";

export type UseAdoptionScoreResult = AdoptionScore;

const DEFAULT_SCORE: AdoptionScore = {
  score: 100,
  grade: "A",
  breakdown: {
    featuresExplored: 0,
    dismissRate: 0,
    completionRate: 0,
    engagementTrend: "stable",
  },
  recommendations: [],
};

/**
 * Get the user's overall feature adoption score.
 *
 * Returns a 0-100 score with letter grade, breakdown, and recommendations.
 * Useful for admin dashboards, debug panels, or gamification.
 *
 * Without an engine, returns a perfect score with no recommendations.
 *
 * @returns `{ score, grade, breakdown, recommendations }`
 *
 * @example
 * ```tsx
 * function AdoptionDashboard() {
 *   const { score, grade, breakdown, recommendations } = useAdoptionScore()
 *
 *   return (
 *     <div>
 *       <h2>Adoption Score: {score}/100 ({grade})</h2>
 *       <p>Features explored: {Math.round(breakdown.featuresExplored * 100)}%</p>
 *       <p>Completion rate: {Math.round(breakdown.completionRate * 100)}%</p>
 *       <ul>
 *         {recommendations.map((r, i) => <li key={i}>{r}</li>)}
 *       </ul>
 *     </div>
 *   )
 * }
 * ```
 */
export function useAdoptionScore(): UseAdoptionScoreResult {
  const { engine } = useFeatureDrop();

  return useMemo(() => {
    if (!engine) return DEFAULT_SCORE;
    return engine.getAdoptionScore();
  }, [engine]);
}
