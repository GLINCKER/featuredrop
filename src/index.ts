// Core functions
export {
  isNew,
  getNewFeatures,
  getNewFeatureCount,
  hasNewFeature,
  getNewFeaturesSorted,
} from "./core";

// Helpers
export { createManifest, getFeatureById, getNewFeaturesByCategory } from "./helpers";

// Adapters
export { LocalStorageAdapter, MemoryAdapter } from "./adapters";
export type { LocalStorageAdapterOptions } from "./adapters";

// Types
export type {
  FeatureEntry,
  FeatureManifest,
  StorageAdapter,
  FeatureType,
  FeaturePriority,
  FeatureCTA,
  AnalyticsCallbacks,
} from "./types";
