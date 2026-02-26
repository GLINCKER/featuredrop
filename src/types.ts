/** A single feature entry in the manifest */
export interface FeatureEntry {
  /** Unique identifier for the feature */
  id: string;
  /** Human-readable label (e.g. "Decision Journal") */
  label: string;
  /** Optional longer description */
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
