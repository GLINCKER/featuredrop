import type { FeatureEntry, FeatureManifest, StorageAdapter } from "./types";
import { isNew } from "./core";

/**
 * Create a frozen feature manifest from an array of entries.
 * Ensures the manifest is immutable at runtime.
 */
export function createManifest(
  entries: FeatureEntry[],
): FeatureManifest {
  return Object.freeze([...entries]);
}

/**
 * Find a feature by its ID in the manifest.
 * Returns `undefined` if not found.
 */
export function getFeatureById(
  manifest: FeatureManifest,
  id: string,
): FeatureEntry | undefined {
  return manifest.find((f) => f.id === id);
}

/**
 * Get all new features in a specific category.
 */
export function getNewFeaturesByCategory(
  manifest: FeatureManifest,
  category: string,
  storage: StorageAdapter,
  now: Date = new Date(),
): FeatureEntry[] {
  const watermark = storage.getWatermark();
  const dismissedIds = storage.getDismissedIds();
  return manifest.filter(
    (f) => f.category === category && isNew(f, watermark, dismissedIds, now),
  );
}
