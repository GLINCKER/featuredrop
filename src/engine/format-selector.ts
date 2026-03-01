import type { DisplayFormat, FeaturePriority, FormatRecommendation } from "../types";
import type { BehaviorTracker } from "./behavior-tracker";

export class FormatSelector {
  private tracker: BehaviorTracker;

  constructor(tracker: BehaviorTracker) {
    this.tracker = tracker;
  }

  /** Recommend the best display format for a feature */
  recommendFormat(
    featureId: string,
    priority: FeaturePriority
  ): FormatRecommendation {
    const profile = this.tracker.getProfile();
    const sessionCount = this.tracker.getSessionCount();
    const fi = this.tracker.getFeatureInteractions(featureId);

    // Critical features get modal or banner
    if (priority === "critical") {
      return {
        primary: "modal",
        fallback: "banner",
        reason: "critical_priority",
      };
    }

    // Low priority features get badge or inline
    if (priority === "low") {
      return {
        primary: "badge",
        fallback: "inline",
        reason: "low_priority",
      };
    }

    // New users (< 3 sessions) get gentler formats
    if (sessionCount < 3) {
      return {
        primary: "badge",
        fallback: "toast",
        reason: "new_user_gentle",
      };
    }

    // Power users (50+ sessions) get concise formats
    if (sessionCount > 50) {
      return {
        primary: "badge",
        fallback: "inline",
        reason: "power_user_concise",
      };
    }

    // Format preference from history — if user engages with a format, prefer it
    const prefs = profile.formatPrefs;
    const totalFormatInteractions =
      prefs.badge + prefs.toast + prefs.modal + prefs.inline + prefs.banner + prefs.spotlight;

    if (totalFormatInteractions >= 5) {
      // Find the most engaged-with format
      const best = this.getBestFormat(prefs);
      const fallback = this.getFallbackFormat(best);
      return {
        primary: best,
        fallback,
        reason: "user_preference",
      };
    }

    // Escalation logic — if feature was shown as badge and ignored, escalate
    if (fi) {
      const seenCount = fi.seen;
      const clicked = fi.clicked;

      // Shown as badge 3+ times but never clicked → escalate to toast
      if (seenCount >= 3 && clicked === 0) {
        return {
          primary: "toast",
          fallback: "badge",
          reason: "escalation_from_badge",
        };
      }

      // Shown 6+ times without click → escalate to modal
      if (seenCount >= 6 && clicked === 0) {
        return {
          primary: "modal",
          fallback: "toast",
          reason: "escalation_from_toast",
        };
      }
    }

    // Dismiss rate check — if user dismisses a lot, use less intrusive formats
    const dismissRate = this.tracker.getDismissRate();
    if (dismissRate > 0.7) {
      return {
        primary: "badge",
        fallback: "inline",
        reason: "high_dismiss_rate_gentle",
      };
    }

    // Default for normal priority
    return {
      primary: "toast",
      fallback: "badge",
      reason: "default_normal",
    };
  }

  private getBestFormat(
    prefs: Record<string, number>
  ): DisplayFormat {
    let best: DisplayFormat = "badge";
    let bestCount = 0;
    for (const [format, count] of Object.entries(prefs)) {
      if (count > bestCount) {
        bestCount = count;
        best = format as DisplayFormat;
      }
    }
    return best;
  }

  private getFallbackFormat(primary: DisplayFormat): DisplayFormat {
    const fallbacks: Record<DisplayFormat, DisplayFormat> = {
      badge: "inline",
      toast: "badge",
      modal: "toast",
      banner: "toast",
      inline: "badge",
      spotlight: "toast",
    };
    return fallbacks[primary];
  }
}
