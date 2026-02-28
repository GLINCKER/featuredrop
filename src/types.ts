/** Entry type label — determines default icon/color in UI */
export type FeatureType = "feature" | "improvement" | "fix" | "breaking";

/** Priority level for announcements */
export type FeaturePriority = "critical" | "normal" | "low";

/** Motion preset for built-in component transitions */
export type FeatureDropAnimationPreset = "none" | "subtle" | "normal" | "playful";

/** Call-to-action for a feature entry */
export interface FeatureCTA {
  /** Button/link label */
  label: string;
  /** URL to navigate to */
  url: string;
}

/** Variant-level overrides for A/B announcement testing */
export interface FeatureVariant {
  /** Optional variant-specific label override */
  label?: string;
  /** Optional variant-specific description override */
  description?: string;
  /** Optional variant-specific image override */
  image?: string;
  /** Optional variant-specific CTA override */
  cta?: FeatureCTA;
  /** Optional variant-specific metadata overrides */
  meta?: Record<string, unknown>;
}

/** Audience targeting rule — determines which user segments see a feature */
export interface AudienceRule {
  /** Plans that should see this feature (e.g. ["pro", "enterprise"]) */
  plan?: string[];
  /** Roles that should see this feature (e.g. ["admin", "editor"]) */
  role?: string[];
  /** Regions that should see this feature (e.g. ["us", "eu"]) */
  region?: string[];
  /** Arbitrary key-value pairs for custom matching logic */
  custom?: Record<string, unknown>;
}

/** User context for audience targeting */
export interface UserContext {
  /** Current user's plan (e.g. "pro", "free") */
  plan?: string;
  /** Current user's role (e.g. "admin", "viewer") */
  role?: string;
  /** Current user's region (e.g. "us", "eu") */
  region?: string;
  /** Arbitrary traits for custom matching logic */
  traits?: Record<string, unknown>;
}

/** Custom audience matcher function */
export type AudienceMatchFn = (
  audience: AudienceRule,
  userContext: UserContext,
) => boolean;

/** Feature flag resolver interface for gating announcement visibility */
export interface FeatureFlagBridge {
  isEnabled: (flagKey: string, userContext?: UserContext) => boolean;
}

/** Dependency gates for progressive feature discovery */
export interface FeatureDependencies {
  /** Features the user must have seen before this one can surface */
  seen?: string[];
  /** Features the user must have clicked before this one can surface */
  clicked?: string[];
  /** Features the user must have dismissed before this one can surface */
  dismissed?: string[];
}

/** Runtime interaction state used to resolve dependency chains */
export interface FeatureDependencyState {
  /** IDs marked as seen */
  seenIds?: ReadonlySet<string>;
  /** IDs marked as clicked */
  clickedIds?: ReadonlySet<string>;
  /** IDs marked as dismissed */
  dismissedIds?: ReadonlySet<string>;
}

/** Runtime context used by trigger evaluation */
export interface TriggerContext {
  /** Current app route/path */
  path?: string;
  /** Named events observed in this session */
  events?: ReadonlySet<string>;
  /** Named milestone flags reached in this session */
  milestones?: ReadonlySet<string>;
  /** Usage counters keyed by event/pattern name */
  usage?: Record<string, number>;
  /** Session elapsed time in milliseconds */
  elapsedMs?: number;
  /** Scroll completion percentage (0-100) */
  scrollPercent?: number;
  /** Optional additional trigger context */
  metadata?: Record<string, unknown>;
}

export type FeatureTrigger =
  | {
      type: "page";
      match: string | RegExp;
    }
  | {
      type: "usage";
      event: string;
      minActions?: number;
    }
  | {
      type: "time";
      minSeconds: number;
    }
  | {
      type: "milestone";
      event: string;
    }
  | {
      type: "frustration";
      pattern: string;
      threshold?: number;
    }
  | {
      type: "scroll";
      minPercent?: number;
    }
  | {
      type: "custom";
      evaluate: (context: TriggerContext) => boolean;
    };

/** A single feature entry in the manifest */
export interface FeatureEntry {
  /** Unique identifier for the feature */
  id: string;
  /** Human-readable label (e.g. "Decision Journal") */
  label: string;
  /** Optional longer description (supports markdown in UI components) */
  description?: string;
  /**
   * Semantic version targeting.
   * If provided as an object, requires `appVersion` to be supplied to the provider/helpers.
   * - introduced: earliest app version that includes this feature
   * - showNewUntil: stop showing "new" once appVersion reaches this
   * - deprecatedAt: hide feature for app versions at or above this (optional safety)
   * - showIn: range string, e.g. ">=2.5.0 <3.0.0"
   */
  version?:
    | string
    | {
        introduced?: string;
        showNewUntil?: string;
        deprecatedAt?: string;
        showIn?: string;
      };
  /** ISO date when this feature was released */
  releasedAt: string;
  /** ISO date after which the "new" badge should stop showing */
  showNewUntil: string;
  /** Optional key to match navigation items (e.g. "/journal", "settings") */
  sidebarKey?: string;
  /** Optional grouping category (e.g. "ai", "billing", "core") */
  category?: string;
  /** Optional product scope (`"*"`, `"askverdict"`, etc.) for multi-product manifests */
  product?: string;
  /** Optional URL to link to (e.g. docs page, changelog entry) */
  url?: string;
  /** Optional feature flag key; requires a flag bridge to evaluate */
  flagKey?: string;
  /** Entry type — determines default icon/color in UI components */
  type?: FeatureType;
  /** Priority level — critical entries get special treatment in UI */
  priority?: FeaturePriority;
  /** Optional image/screenshot URL */
  image?: string;
  /** Optional call-to-action button */
  cta?: FeatureCTA;
  /** ISO date — entry is hidden until this date (scheduled publishing) */
  publishAt?: string;
  /** Optional arbitrary metadata */
  meta?: Record<string, unknown>;
  /** A/B variants keyed by variant name (e.g. control, treatment_a) */
  variants?: Record<string, FeatureVariant>;
  /** Percentage split per variant (same order as variants object keys) */
  variantSplit?: number[];
  /** Audience targeting — if set, only matching users see this feature */
  audience?: AudienceRule;
  /** Dependency requirements (progressive disclosure sequencing) */
  dependsOn?: FeatureDependencies;
  /** Contextual trigger rule */
  trigger?: FeatureTrigger;
}

/** The full feature manifest — an array of feature entries */
export type FeatureManifest = readonly FeatureEntry[];

/**
 * Storage adapter interface — implement for your persistence layer.
 *
 * The adapter bridges two data sources:
 * - **Watermark**: a server-side timestamp ("features seen at")
 * - **Dismissed IDs**: client-side per-feature dismissals
 */
export interface StorageAdapter {
  /** Get the user's "features seen at" watermark (ISO string or null) */
  getWatermark(): string | null;
  /** Get the set of individually dismissed feature IDs */
  getDismissedIds(): ReadonlySet<string>;
  /** Dismiss a single feature by ID */
  dismiss(id: string): void;
  /** Dismiss all features — sets watermark to `now` and clears dismissals */
  dismissAll(now: Date): Promise<void>;
}

/** Extended server-side dismissal state */
export interface DismissalState {
  /** Server-side watermark */
  watermark: string | null;
  /** Dismissed feature IDs */
  dismissedIds: string[];
  /** ISO timestamp of last interaction */
  lastSeen: string;
  /** Estimated device count contributing to this state */
  deviceCount: number;
}

/** Server-capable storage adapter */
export interface ServerStorageAdapter extends StorageAdapter {
  /** Current user for this adapter instance */
  userId: string;
  /** Pull latest state from the server/database */
  sync(): Promise<void>;
  /** Dismiss multiple features at once */
  dismissBatch(ids: string[]): Promise<void>;
  /** Reset state for a target user */
  resetUser(userId: string): Promise<void>;
  /** Fetch multiple users' state */
  getBulkState(userIds: string[]): Promise<Map<string, DismissalState>>;
  /** Health check */
  isHealthy(): Promise<boolean>;
  /** Cleanup resources */
  destroy(): Promise<void>;
}

/** Analytics event callbacks — pipe to your analytics provider */
export interface AnalyticsCallbacks {
  /** Fired when a feature badge becomes visible to the user */
  onFeatureSeen?: (feature: FeatureEntry) => void;
  /** Fired when a user dismisses a single feature */
  onFeatureDismissed?: (feature: FeatureEntry) => void;
  /** Fired when a user clicks a feature link or CTA */
  onFeatureClicked?: (feature: FeatureEntry) => void;
  /** Fired when the changelog widget is opened */
  onWidgetOpened?: () => void;
  /** Fired when the changelog widget is closed */
  onWidgetClosed?: () => void;
  /** Fired when all features are dismissed at once */
  onAllDismissed?: () => void;
}

/** Display format hint from the engine */
export type DisplayFormat = "badge" | "toast" | "modal" | "banner" | "inline" | "spotlight";

/** Interaction type tracked by the engine */
export type InteractionType =
  | "seen"
  | "dismissed"
  | "clicked"
  | "completed"
  | "snoozed"
  | "hovered"
  | "expanded";

/** Timing decision returned by the engine */
export interface TimingDecision {
  /** Whether to show the announcement now */
  show: boolean;
  /** Reason for the decision */
  reason: string;
  /** Suggested delay in ms if not showing now */
  delayMs?: number;
  /** Confidence level (0-1) */
  confidence: number;
}

/** Format recommendation from the engine */
export interface FormatRecommendation {
  /** Recommended display format */
  primary: DisplayFormat;
  /** Fallback format if primary component isn't used */
  fallback: DisplayFormat;
  /** Reason for the recommendation */
  reason: string;
}

/** Adoption score breakdown */
export interface AdoptionScore {
  /** Overall score (0-100) */
  score: number;
  /** Letter grade */
  grade: "A" | "B" | "C" | "D" | "F";
  /** Score breakdown */
  breakdown: {
    /** % of features the user has explored */
    featuresExplored: number;
    /** Rate of dismissals (lower is better) */
    dismissRate: number;
    /** Rate of tour/checklist completion */
    completionRate: number;
    /** Whether engagement is rising, stable, or declining */
    engagementTrend: "rising" | "stable" | "declining";
  };
  /** Actionable recommendations */
  recommendations: string[];
}

/** Per-feature adoption status */
export interface FeatureAdoptionStatus {
  featureId: string;
  status: "unseen" | "seen" | "explored" | "adopted" | "dismissed";
  firstSeen?: string;
  lastInteraction?: string;
  interactionCount: number;
}

/** Delivery context passed to the engine for timing decisions */
export interface DeliveryContext {
  /** Current route/path */
  currentPath: string;
  /** Seconds since session start */
  sessionAge: number;
  /** Dismissals in last 5 minutes */
  recentDismissals: number;
  /** Feature priority */
  featurePriority: FeaturePriority;
}

/**
 * Plugin interface for the FeatureDrop engine.
 *
 * The open-source library defines this interface.
 * The proprietary @featuredrop/engine implements it.
 * Users can also build their own engine implementation.
 *
 * The free library works perfectly without any engine.
 */
export interface FeatureDropEngine {
  /** Decide whether to show a feature announcement now */
  shouldShow(featureId: string, context: DeliveryContext): TimingDecision;
  /** Recommend the best display format for a feature */
  recommendFormat(featureId: string): FormatRecommendation;
  /** Get the user's overall adoption score */
  getAdoptionScore(): AdoptionScore;
  /** Track a user interaction with a feature */
  trackInteraction(featureId: string, type: InteractionType): void;
  /** Get adoption status for a specific feature */
  getFeatureAdoption(featureId: string): FeatureAdoptionStatus;
  /** Initialize the engine (called by provider on mount) */
  initialize?(): void;
  /** Cleanup resources (called by provider on unmount) */
  destroy?(): void;
}
