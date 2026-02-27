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
export { parseDescription } from "./markdown";
export {
  FEATUREDROP_THEMES,
  createTheme,
  resolveTheme,
  themeToCSSVariables,
} from "./theme";
export {
  FEATUREDROP_TRANSLATIONS,
  resolveTranslations,
} from "./i18n";
export type {
  FeatureDropTheme,
  FeatureDropThemeInput,
  FeatureDropThemeOverrides,
  FeatureDropThemePreset,
} from "./theme";
export type { FeatureDropTranslations } from "./i18n";
export { generateRSS } from "./rss";
export { applyAnnouncementThrottle } from "./throttle";
export type { ThrottleOptions, ThrottleRuntimeState, ThrottleResult } from "./throttle";
export {
  AnalyticsCollector,
  PostHogAdapter,
  AmplitudeAdapter,
  MixpanelAdapter,
  SegmentAdapter,
  CustomAdapter,
  createAdoptionMetrics,
} from "./analytics";
export type {
  AdoptionEvent,
  AdoptionEventInput,
  AdoptionEventType,
  AnalyticsAdapter,
  AnalyticsCollectorOptions,
  AdoptionMetrics,
  FeatureEngagementMetrics,
} from "./analytics";
export {
  resolveDependencyOrder,
  hasDependencyCycle,
  sortFeaturesByDependencies,
} from "./dependencies";
export { TriggerEngine, isTriggerMatch } from "./triggers";
export {
  applyFeatureVariant,
  applyFeatureVariants,
  getFeatureVariantName,
  getOrCreateVariantKey,
} from "./variants";
export {
  computeManifestStats,
  generateMarkdownChangelog,
  runDoctor,
} from "./cli-utils";
export {
  featureEntrySchema,
  featureManifestSchema,
  featureEntryJsonSchema,
  featureManifestJsonSchema,
  validateManifest,
} from "./schema";
export type {
  ValidationIssue,
  ValidationResult,
} from "./schema";

// Adapters
export { LocalStorageAdapter, MemoryAdapter } from "./adapters";
export {
  RemoteAdapter,
  PostgresAdapter,
  RedisAdapter,
  HybridAdapter,
  MySQLAdapter,
  MongoAdapter,
  SQLiteAdapter,
  SupabaseAdapter,
} from "./adapters";
export type {
  LocalStorageAdapterOptions,
  RemoteAdapterOptions,
  PostgresAdapterOptions,
  PostgresQueryFn,
  PostgresQueryResult,
  RedisAdapterOptions,
  RedisLikeClient,
  RedisLikePipeline,
  HybridAdapterOptions,
  MySQLAdapterOptions,
  MySQLQueryFn,
  MySQLQueryResult,
  MongoAdapterOptions,
  MongoLikeCollection,
  SQLiteAdapterOptions,
  SQLiteQueryFn,
  SQLiteQueryResult,
  SupabaseAdapterOptions,
  SupabaseClientLike,
  SupabaseRealtimeChannelLike,
} from "./adapters";

// Types
export type {
  AudienceMatchFn,
  AudienceRule,
  FeatureEntry,
  FeatureManifest,
  StorageAdapter,
  FeatureType,
  FeaturePriority,
  FeatureCTA,
  FeatureVariant,
  AnalyticsCallbacks,
  UserContext,
  DismissalState,
  ServerStorageAdapter,
  FeatureDependencies,
  FeatureDependencyState,
  FeatureTrigger,
  TriggerContext,
} from "./types";
