import type { InteractionType } from "../types";

/** Compact behavior profile stored in localStorage */
export interface BehaviorProfile {
  version: 1;
  firstSeen: string;
  sessionCount: number;
  totalInteractions: number;
  dismissCount: number;
  clickCount: number;
  completionCount: number;
  formatPrefs: {
    badge: number;
    toast: number;
    modal: number;
    inline: number;
    banner: number;
    spotlight: number;
  };
  /** 24-element array, interaction count per hour */
  hourlyActivity: number[];
  /** Last 20 dismissed feature IDs (circular buffer) */
  recentDismissals: string[];
  /** Per-feature interaction data */
  featureInteractions: Record<
    string,
    {
      seen: number;
      clicked: number;
      dismissed: number;
      completed: number;
      lastInteraction: string;
    }
  >;
}

const STORAGE_KEY = "fd_behavior";
const MAX_RECENT_DISMISSALS = 20;

function createEmptyProfile(): BehaviorProfile {
  return {
    version: 1,
    firstSeen: new Date().toISOString(),
    sessionCount: 0,
    totalInteractions: 0,
    dismissCount: 0,
    clickCount: 0,
    completionCount: 0,
    formatPrefs: { badge: 0, toast: 0, modal: 0, inline: 0, banner: 0, spotlight: 0 },
    hourlyActivity: new Array(24).fill(0),
    recentDismissals: [],
    featureInteractions: {},
  };
}

export class BehaviorTracker {
  private profile: BehaviorProfile;
  private sessionStartTime: number;

  constructor() {
    this.profile = this.load();
    this.sessionStartTime = Date.now();
    this.profile.sessionCount++;
    this.save();
  }

  /** Track a feature interaction */
  trackInteraction(featureId: string, type: InteractionType): void {
    const hour = new Date().getHours();
    this.profile.hourlyActivity[hour]++;
    this.profile.totalInteractions++;

    if (!this.profile.featureInteractions[featureId]) {
      this.profile.featureInteractions[featureId] = {
        seen: 0,
        clicked: 0,
        dismissed: 0,
        completed: 0,
        lastInteraction: new Date().toISOString(),
      };
    }

    const fi = this.profile.featureInteractions[featureId];
    fi.lastInteraction = new Date().toISOString();

    switch (type) {
      case "seen":
      case "hovered":
      case "expanded":
        fi.seen++;
        break;
      case "clicked":
        fi.clicked++;
        this.profile.clickCount++;
        break;
      case "dismissed":
      case "snoozed":
        fi.dismissed++;
        this.profile.dismissCount++;
        this.profile.recentDismissals.push(featureId);
        if (this.profile.recentDismissals.length > MAX_RECENT_DISMISSALS) {
          this.profile.recentDismissals.shift();
        }
        break;
      case "completed":
        fi.completed++;
        this.profile.completionCount++;
        break;
    }

    this.save();
  }

  /** Record a format engagement (user interacted via this format) */
  trackFormatEngagement(format: keyof BehaviorProfile["formatPrefs"]): void {
    if (format in this.profile.formatPrefs) {
      this.profile.formatPrefs[format]++;
      this.save();
    }
  }

  /** Get current profile */
  getProfile(): Readonly<BehaviorProfile> {
    return this.profile;
  }

  /** Session count */
  getSessionCount(): number {
    return this.profile.sessionCount;
  }

  /** Average session duration (rough estimate based on current session) */
  getSessionAge(): number {
    return (Date.now() - this.sessionStartTime) / 1000;
  }

  /** Dismiss rate (0-1) */
  getDismissRate(): number {
    if (this.profile.totalInteractions === 0) return 0;
    return this.profile.dismissCount / this.profile.totalInteractions;
  }

  /** Engagement rate (clicked or completed / total interactions) */
  getEngagementRate(): number {
    if (this.profile.totalInteractions === 0) return 0;
    return (
      (this.profile.clickCount + this.profile.completionCount) /
      this.profile.totalInteractions
    );
  }

  /** Preferred format based on highest engagement count */
  getPreferredFormat(): keyof BehaviorProfile["formatPrefs"] {
    const prefs = this.profile.formatPrefs;
    let best: keyof typeof prefs = "badge";
    let bestCount = 0;
    for (const [format, count] of Object.entries(prefs)) {
      if (count > bestCount) {
        bestCount = count;
        best = format as keyof typeof prefs;
      }
    }
    return best;
  }

  /** Top 3 active hours (0-23) */
  getActiveHours(): number[] {
    return this.profile.hourlyActivity
      .map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map((h) => h.hour);
  }

  /** Recent dismissals (last N feature IDs) */
  getRecentDismissals(): string[] {
    return this.profile.recentDismissals;
  }

  /** Count of dismissals in last N milliseconds */
  getRecentDismissalCount(windowMs: number): number {
    const now = new Date();
    const cutoff = new Date(now.getTime() - windowMs);
    let count = 0;
    for (const featureId of this.profile.recentDismissals) {
      const fi = this.profile.featureInteractions[featureId];
      if (fi && new Date(fi.lastInteraction) >= cutoff) {
        count++;
      }
    }
    return count;
  }

  /** Get interaction data for a specific feature */
  getFeatureInteractions(featureId: string) {
    return this.profile.featureInteractions[featureId] ?? null;
  }

  /** Clear all behavior data */
  clearProfile(): void {
    this.profile = createEmptyProfile();
    this.save();
  }

  private load(): BehaviorProfile {
    if (typeof localStorage === "undefined") return createEmptyProfile();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return createEmptyProfile();
      const parsed = JSON.parse(raw) as BehaviorProfile;
      if (parsed.version !== 1) return createEmptyProfile();
      return parsed;
    } catch {
      return createEmptyProfile();
    }
  }

  private save(): void {
    if (typeof localStorage === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.profile));
    } catch {
      // localStorage full or unavailable — silently fail
    }
  }
}
