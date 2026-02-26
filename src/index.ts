// Core functions
export { isNew, getNewFeatures, getNewFeatureCount, hasNewFeature } from "./core";

// Helpers
export { createManifest, getFeatureById, getNewFeaturesByCategory } from "./helpers";

// Adapters
export { LocalStorageAdapter, MemoryAdapter } from "./adapters";
export type { LocalStorageAdapterOptions } from "./adapters";

// Types
export type { FeatureEntry, FeatureManifest, StorageAdapter } from "./types";
