/** Entry type label — determines default icon/color in UI */
export type FeatureType = "feature" | "improvement" | "fix" | "breaking";

/** Priority level for announcements */
export type FeaturePriority = "critical" | "normal" | "low";

/** Call-to-action for a feature entry */
export interface FeatureCTA {
  /** Button/link label */
  label: string;
  /** URL to navigate to */
  url: string;
}

/** A single feature entry in the manifest */
export interface FeatureEntry {
  /** Unique identifier for the feature */
  id: string;
  /** Human-readable label (e.g. "Decision Journal") */
  label: string;
  /** Optional longer description (supports markdown in UI components) */
  description?: string;
  /** ISO date when this feature was released */
  releasedAt: string;
  /** ISO date after which the "new" badge should stop showing */
  showNewUntil: string;
  /** Optional key to match navigation items (e.g. "/journal", "settings") */
  sidebarKey?: string;
  /** Optional grouping category (e.g. "ai", "billing", "core") */
  category?: string;
  /** Optional URL to link to (e.g. docs page, changelog entry) */
  url?: string;
  /** Optional version string when this feature shipped */
  version?: string;
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
