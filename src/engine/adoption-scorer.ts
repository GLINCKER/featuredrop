import type {
  AdoptionScore,
  FeatureAdoptionStatus,
  FeatureEntry,
} from "../types";
import type { BehaviorTracker } from "./behavior-tracker";

export class AdoptionScorer {
  private tracker: BehaviorTracker;

  constructor(tracker: BehaviorTracker) {
    this.tracker = tracker;
  }

  /** Calculate overall adoption score (0-100) */
  getAdoptionScore(manifest: readonly FeatureEntry[]): AdoptionScore {
    if (manifest.length === 0) {
      return {
        score: 100,
        grade: "A",
        breakdown: {
          featuresExplored: 1,
          dismissRate: 0,
          completionRate: 1,
          engagementTrend: "stable",
        },
        recommendations: [],
      };
    }

    const statuses = manifest.map((f) => this.getFeatureAdoption(f.id));

    const explored = statuses.filter(
      (s) => s.status === "explored" || s.status === "adopted"
    ).length;
    const adopted = statuses.filter((s) => s.status === "adopted").length;
    const dismissed = statuses.filter((s) => s.status === "dismissed").length;

    const explorationRate = explored / manifest.length;
    const adoptionRate = adopted / manifest.length;
    const dismissRate =
      explored + dismissed > 0 ? dismissed / (explored + dismissed) : 0;

    // Weighted score
    const rawScore =
      explorationRate * 30 + adoptionRate * 50 + (1 - dismissRate) * 20;

    const score = Math.round(Math.min(100, Math.max(0, rawScore)));

    const grade = this.toGrade(score);

    // Trend detection
    const engagementTrend = this.detectTrend();

    // Recommendations
    const recommendations: string[] = [];

    const unseen = statuses.filter((s) => s.status === "unseen");
    if (unseen.length > 0) {
      const first = unseen[0];
      recommendations.push(
        `User hasn't seen "${first.featureId}" — consider showing as badge or toast.`
      );
    }

    if (dismissRate > 0.5) {
      recommendations.push(
        "High dismiss rate — try less intrusive formats (badge instead of modal)."
      );
    }

    if (explorationRate < 0.3) {
      recommendations.push(
        "Low feature exploration — consider a guided tour to highlight key features."
      );
    }

    return {
      score,
      grade,
      breakdown: {
        featuresExplored: explorationRate,
        dismissRate,
        completionRate: adoptionRate,
        engagementTrend,
      },
      recommendations,
    };
  }

  /** Get adoption status for a specific feature */
  getFeatureAdoption(featureId: string): FeatureAdoptionStatus {
    const fi = this.tracker.getFeatureInteractions(featureId);

    if (!fi) {
      return {
        featureId,
        status: "unseen",
        interactionCount: 0,
      };
    }

    const interactionCount = fi.seen + fi.clicked + fi.dismissed + fi.completed;

    let status: FeatureAdoptionStatus["status"];
    if (fi.completed > 0) {
      status = "adopted";
    } else if (fi.dismissed > 0 && fi.clicked === 0) {
      status = "dismissed";
    } else if (fi.clicked > 0) {
      status = "explored";
    } else if (fi.seen > 0) {
      status = "seen";
    } else {
      status = "unseen";
    }

    return {
      featureId,
      status,
      firstSeen: fi.lastInteraction, // approximate — we don't store firstSeen separately
      lastInteraction: fi.lastInteraction,
      interactionCount,
    };
  }

  private toGrade(score: number): AdoptionScore["grade"] {
    if (score >= 90) return "A";
    if (score >= 75) return "B";
    if (score >= 60) return "C";
    if (score >= 40) return "D";
    return "F";
  }

  private detectTrend(): "rising" | "stable" | "declining" {
    const profile = this.tracker.getProfile();

    // Simple heuristic: if there are more recent interactions than older ones
    const hourly = profile.hourlyActivity;
    const recentHalf = hourly.slice(12).reduce((a, b) => a + b, 0);
    const olderHalf = hourly.slice(0, 12).reduce((a, b) => a + b, 0);

    if (recentHalf > olderHalf * 1.2) return "rising";
    if (recentHalf < olderHalf * 0.8) return "declining";
    return "stable";
  }
}
