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
export { createChangelogRenderer } from "./renderer";
export {
  DiscordBridge,
  EmailDigestGenerator,
  RSSFeedGenerator,
  SlackBridge,
  WebhookBridge,
} from "./bridges";
export {
  diffManifest,
  generateChangelogDiff,
  validateManifestForCI,
} from "./ci";
export {
  createFlagBridge,
  LaunchDarklyBridge,
  PostHogBridge,
} from "./flags";
export {
  AudienceBuilder,
  ManifestEditor,
  PreviewPanel,
  ScheduleCalendar,
} from "./admin";
export {
  ContentfulAdapter,
  SanityAdapter,
  StrapiAdapter,
  NotionAdapter,
  MarkdownAdapter,
} from "./cms";
export {
  FEATUREDROP_THEMES,
  createTheme,
  resolveTheme,
  themeToCSSVariables,
} from "./theme";
export {
  FEATUREDROP_TRANSLATIONS,
  formatDateForLocale,
  formatRelativeTimeForLocale,
  getLocaleDirection,
  resolveLocale,
  resolveTranslations,
} from "./i18n";
export {
  FEATUREDROP_ANIMATION_PRESETS,
  getAnimationDurationMs,
  getEnterAnimation,
  getExitAnimation,
  getPulseAnimation,
  resolveAnimationPreset,
} from "./animation";
export type {
  FeatureDropTheme,
  FeatureDropThemeInput,
  FeatureDropThemeOverrides,
  FeatureDropThemePreset,
} from "./theme";
export type { FeatureDropTranslations } from "./i18n";
export type {
  ChangelogRenderer,
  ChangelogRendererActions,
  ChangelogRendererComputed,
  ChangelogRendererOptions,
  ChangelogRendererState,
} from "./renderer";
export type {
  DiscordBridgeOptions,
  EmailDigestGeneratorOptions,
  RSSFeedGeneratorOptions,
  SlackBridgeOptions,
  WebhookBridgeOptions,
} from "./bridges";
export type { ChangelogDiffOptions, ChangedFeature, ManifestDiff } from "./ci";
export type {
  CreateFlagBridgeOptions,
  LaunchDarklyBridgeOptions,
  LaunchDarklyClientLike,
  PostHogBridgeOptions,
  PostHogClientLike,
} from "./flags";
export type {
  AudienceBuilderProps,
  ManifestEditorProps,
  PreviewPanelProps,
  ScheduleCalendarProps,
} from "./admin";
export type { CMSAdapter, CMSFieldMapping } from "./cms";
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
export { LocalStorageAdapter, IndexedDBAdapter, MemoryAdapter } from "./adapters";
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
  IndexedDBAdapterOptions,
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
} from "./types";
