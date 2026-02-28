// Core functions
export {
  isNew,
  getNewFeatures,
  getNewFeatureCount,
  hasNewFeature,
  getNewFeaturesSorted,
  matchesAudience,
} from "./core";

// Helpers
export { createManifest, getFeatureById, getNewFeaturesByCategory } from "./helpers";

// Browser adapters (lightweight, no server deps)
export { LocalStorageAdapter, MemoryAdapter } from "./adapters";
export type { LocalStorageAdapterOptions } from "./adapters";

// Types — all type-only exports are zero-cost (erased at build time)
export type {
  AudienceMatchFn,
  AudienceRule,
  FeatureEntry,
  FeatureManifest,
  StorageAdapter,
  FeatureType,
  FeaturePriority,
  FeatureDropAnimationPreset,
  FeatureCTA,
  FeatureVariant,
  AnalyticsCallbacks,
  UserContext,
  DismissalState,
  ServerStorageAdapter,
  FeatureDependencies,
  FeatureDependencyState,
  FeatureFlagBridge,
  FeatureTrigger,
  TriggerContext,
  DisplayFormat,
  InteractionType,
  TimingDecision,
  FormatRecommendation,
  AdoptionScore,
  FeatureAdoptionStatus,
  DeliveryContext,
  FeatureDropEngine,
} from "./types";

// ────────────────────────────────────────────────────────────────────────────
// Everything below is available via subpath imports:
//
//   import { parseDescription }    from 'featuredrop/markdown'
//   import { generateRSS }         from 'featuredrop/rss'
//   import { SlackBridge }         from 'featuredrop/bridges'
//   import { ContentfulAdapter }   from 'featuredrop/cms'
//   import { ManifestEditor }      from 'featuredrop/admin'
//   import { validateManifest }    from 'featuredrop/schema'
//   import { diffManifest }        from 'featuredrop/ci'
//   import { createChangelogRenderer } from 'featuredrop/renderer'
//   import { createFlagBridge }    from 'featuredrop/flags'
//   import { AnalyticsCollector }  from 'featuredrop/analytics'  — planned
//   import { PostgresAdapter }     from 'featuredrop/adapters'
//   import { RemoteAdapter }       from 'featuredrop/adapters'
//   import { IndexedDBAdapter }    from 'featuredrop/adapters'
//
// These are NOT re-exported here to keep the core bundle small (< 5 kB).
// ────────────────────────────────────────────────────────────────────────────
