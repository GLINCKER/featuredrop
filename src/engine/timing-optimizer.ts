import type { DeliveryContext, TimingDecision } from "../types";
import type { BehaviorTracker } from "./behavior-tracker";

export interface TimingOptimizerConfig {
  /** Minimum session age in ms before showing anything (default: 10000) */
  sessionGateMs: number;
  /** Max dismissals in the backoff window before backing off (default: 2) */
  maxDismissalsBeforeBackoff: number;
  /** Backoff window in ms to count recent dismissals (default: 180000 = 3 min) */
  dismissBackoffWindowMs: number;
  /** Cooldown between announcements in ms (default: 60000) */
  cooldownMs: number;
  /** Path patterns to exclude (glob-style simple matching) */
  excludePaths: string[];
}

const DEFAULTS: TimingOptimizerConfig = {
  sessionGateMs: 10_000,
  maxDismissalsBeforeBackoff: 2,
  dismissBackoffWindowMs: 180_000,
  cooldownMs: 60_000,
  excludePaths: ["/checkout", "/auth/*", "/error", "/login", "/signup"],
};

export class TimingOptimizer {
  private config: TimingOptimizerConfig;
  private tracker: BehaviorTracker;
  private lastAnnouncementTime = 0;

  constructor(tracker: BehaviorTracker, config?: Partial<TimingOptimizerConfig>) {
    this.tracker = tracker;
    this.config = { ...DEFAULTS, ...config };
  }

  /** Decide whether to show a feature announcement now */
  shouldShowNow(_featureId: string, context: DeliveryContext): TimingDecision {
    // 1. SESSION GATE — don't interrupt immediately
    if (context.sessionAge < this.config.sessionGateMs / 1000) {
      return {
        show: false,
        reason: "session_too_young",
        delayMs: this.config.sessionGateMs - context.sessionAge * 1000,
        confidence: 0.9,
      };
    }

    // 2. DISMISS VELOCITY — user is dismissing everything, back off
    const recentDismissals = this.tracker.getRecentDismissalCount(
      this.config.dismissBackoffWindowMs
    );
    if (recentDismissals >= this.config.maxDismissalsBeforeBackoff) {
      return {
        show: false,
        reason: "high_dismiss_rate",
        delayMs: this.config.dismissBackoffWindowMs,
        confidence: 0.85,
      };
    }

    // 3. PAGE EXCLUSION — don't show on checkout, auth, error pages
    if (this.isExcludedPath(context.currentPath)) {
      return {
        show: false,
        reason: "excluded_page",
        confidence: 1.0,
      };
    }

    // 4. COOLDOWN — minimum gap between announcements
    const now = Date.now();
    if (this.lastAnnouncementTime > 0 && now - this.lastAnnouncementTime < this.config.cooldownMs) {
      return {
        show: false,
        reason: "cooldown",
        delayMs: this.config.cooldownMs - (now - this.lastAnnouncementTime),
        confidence: 0.9,
      };
    }

    // 5. PRIORITY OVERRIDE — critical features bypass timing
    if (context.featurePriority === "critical") {
      this.lastAnnouncementTime = now;
      return {
        show: true,
        reason: "priority_override",
        confidence: 1.0,
      };
    }

    // 6. ACTIVE HOURS BOOST — user is typically active at this hour
    let confidence = 0.6;
    const currentHour = new Date().getHours();
    const activeHours = this.tracker.getActiveHours();
    if (activeHours.includes(currentHour)) {
      confidence += 0.2;
    }

    // 7. ENGAGEMENT HISTORY — if user engages, confidence goes up
    const engagementRate = this.tracker.getEngagementRate();
    if (engagementRate > 0.5) {
      confidence += 0.1;
    }

    // 8. LOW PRIORITY FEATURES — need higher confidence
    if (context.featurePriority === "low" && confidence < 0.7) {
      return {
        show: false,
        reason: "low_priority_insufficient_confidence",
        delayMs: this.config.cooldownMs,
        confidence,
      };
    }

    this.lastAnnouncementTime = now;
    return {
      show: true,
      reason: "optimal_window",
      confidence: Math.min(confidence, 1.0),
    };
  }

  /** Mark that an announcement was shown (for cooldown tracking) */
  recordAnnouncementShown(): void {
    this.lastAnnouncementTime = Date.now();
  }

  private isExcludedPath(path: string): boolean {
    return this.config.excludePaths.some((pattern) => {
      if (pattern.endsWith("/*")) {
        const prefix = pattern.slice(0, -2);
        return path === prefix || path.startsWith(prefix + "/");
      }
      return path === pattern;
    });
  }
}
