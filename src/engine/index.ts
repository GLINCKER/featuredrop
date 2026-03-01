import type {
  AdoptionScore,
  DeliveryContext,
  FeatureAdoptionStatus,
  FeatureDropEngine,
  FeatureEntry,
  FormatRecommendation,
  InteractionType,
  TimingDecision,
} from "../types";
import { BehaviorTracker } from "./behavior-tracker";
import type { TimingOptimizerConfig } from "./timing-optimizer";
import { TimingOptimizer } from "./timing-optimizer";
import { FormatSelector } from "./format-selector";
import { AdoptionScorer } from "./adoption-scorer";

export type { BehaviorProfile } from "./behavior-tracker";
export { BehaviorTracker } from "./behavior-tracker";
export { TimingOptimizer } from "./timing-optimizer";
export type { TimingOptimizerConfig } from "./timing-optimizer";
export { FormatSelector } from "./format-selector";
export { AdoptionScorer } from "./adoption-scorer";

/** Configuration for creating an AdoptionEngine */
export interface AdoptionEngineConfig {
  /** Feature manifest (required for adoption scoring) */
  manifest: readonly FeatureEntry[];
  /** Timing optimizer settings */
  timing?: Partial<TimingOptimizerConfig>;
}

/**
 * Client-side behavioral intelligence engine for FeatureDrop.
 *
 * Tracks user interactions, optimizes announcement timing,
 * recommends display formats, and scores feature adoption —
 * all client-side with zero data transfer.
 *
 * @example
 * ```ts
 * import { createAdoptionEngine } from 'featuredrop/engine'
 *
 * const engine = createAdoptionEngine({
 *   manifest: features,
 *   timing: { cooldownMs: 30_000 },
 * })
 *
 * <FeatureDropProvider manifest={features} engine={engine}>
 *   <App />
 * </FeatureDropProvider>
 * ```
 */
export class AdoptionEngine implements FeatureDropEngine {
  private tracker: BehaviorTracker;
  private timing: TimingOptimizer;
  private format: FormatSelector;
  private scorer: AdoptionScorer;
  private manifest: readonly FeatureEntry[];

  constructor(config: AdoptionEngineConfig) {
    this.manifest = config.manifest;
    this.tracker = new BehaviorTracker();
    this.timing = new TimingOptimizer(this.tracker, config.timing);
    this.format = new FormatSelector(this.tracker);
    this.scorer = new AdoptionScorer(this.tracker);
  }

  /** Initialize the engine (called by FeatureDropProvider on mount) */
  initialize(): void {
    // BehaviorTracker self-initializes from localStorage in constructor
  }

  /** Cleanup resources (called by FeatureDropProvider on unmount) */
  destroy(): void {
    // No cleanup needed — data persists in localStorage
  }

  /** Decide whether to show a feature announcement now */
  shouldShow(featureId: string, context: DeliveryContext): TimingDecision {
    return this.timing.shouldShowNow(featureId, context);
  }

  /** Recommend the best display format for a feature */
  recommendFormat(featureId: string): FormatRecommendation {
    const feature = this.manifest.find((f) => f.id === featureId);
    const priority = feature?.priority ?? "normal";
    return this.format.recommendFormat(featureId, priority);
  }

  /** Get the user's overall adoption score */
  getAdoptionScore(): AdoptionScore {
    return this.scorer.getAdoptionScore(this.manifest);
  }

  /** Track a user interaction with a feature */
  trackInteraction(featureId: string, type: InteractionType): void {
    this.tracker.trackInteraction(featureId, type);
  }

  /** Get adoption status for a specific feature */
  getFeatureAdoption(featureId: string): FeatureAdoptionStatus {
    return this.scorer.getFeatureAdoption(featureId);
  }

  /** Access the behavior tracker for advanced usage */
  getBehaviorTracker(): BehaviorTracker {
    return this.tracker;
  }

  /** Clear all behavior data */
  clearProfile(): void {
    this.tracker.clearProfile();
  }

  /** Update the manifest (e.g., if features change at runtime) */
  updateManifest(manifest: readonly FeatureEntry[]): void {
    this.manifest = manifest;
  }
}

/**
 * Create a new AdoptionEngine instance.
 *
 * @example
 * ```ts
 * import { createAdoptionEngine } from 'featuredrop/engine'
 *
 * const engine = createAdoptionEngine({
 *   manifest: features,
 *   timing: {
 *     cooldownMs: 30_000,
 *     excludePaths: ['/checkout', '/login'],
 *   },
 * })
 * ```
 */
export function createAdoptionEngine(
  config: AdoptionEngineConfig
): AdoptionEngine {
  return new AdoptionEngine(config);
}
