import type { FeatureEntry, FeatureManifest, StorageAdapter } from "./types";

/**
 * Check if a single feature should show as "new".
 *
 * A feature is "new" when ALL of these are true:
 * 1. Current time is before `showNewUntil`
 * 2. Feature was released after the watermark (or no watermark exists)
 * 3. Feature has not been individually dismissed
 * 4. If `publishAt` is set, current time must be after it (scheduled publishing)
 */
export function isNew(
  feature: FeatureEntry,
  watermark: string | null,
  dismissedIds: ReadonlySet<string>,
  now: Date = new Date(),
): boolean {
  // Already dismissed by the user on this device
  if (dismissedIds.has(feature.id)) return false;

  const nowMs = now.getTime();

  // Scheduled publishing — hidden until publishAt
  if (feature.publishAt) {
    const publishMs = new Date(feature.publishAt).getTime();
    if (nowMs < publishMs) return false;
  }

  const showUntilMs = new Date(feature.showNewUntil).getTime();

  // Past the display window
  if (nowMs >= showUntilMs) return false;

  // If there's a watermark, feature must have been released after it
  if (watermark) {
    const watermarkMs = new Date(watermark).getTime();
    const releasedMs = new Date(feature.releasedAt).getTime();
    if (releasedMs <= watermarkMs) return false;
  }

  return true;
}

/**
 * Get all features that are currently "new" for this user.
 */
export function getNewFeatures(
  manifest: FeatureManifest,
  storage: StorageAdapter,
  now: Date = new Date(),
): FeatureEntry[] {
  const watermark = storage.getWatermark();
  const dismissedIds = storage.getDismissedIds();
  return manifest.filter((f) => isNew(f, watermark, dismissedIds, now));
}

/**
 * Get the count of new features.
 */
export function getNewFeatureCount(
  manifest: FeatureManifest,
  storage: StorageAdapter,
  now: Date = new Date(),
): number {
  return getNewFeatures(manifest, storage, now).length;
}

/**
 * Check if a specific sidebar key has a new feature.
 */
export function hasNewFeature(
  manifest: FeatureManifest,
  sidebarKey: string,
  storage: StorageAdapter,
  now: Date = new Date(),
): boolean {
  const watermark = storage.getWatermark();
  const dismissedIds = storage.getDismissedIds();
  return manifest.some(
    (f) => f.sidebarKey === sidebarKey && isNew(f, watermark, dismissedIds, now),
  );
}

/**
 * Get all features sorted by priority (critical first) then by release date (newest first).
 */
export function getNewFeaturesSorted(
  manifest: FeatureManifest,
  storage: StorageAdapter,
  now: Date = new Date(),
): FeatureEntry[] {
  const priorityOrder = { critical: 0, normal: 1, low: 2 };
  return getNewFeatures(manifest, storage, now).sort((a, b) => {
    const pa = priorityOrder[a.priority ?? "normal"];
    const pb = priorityOrder[b.priority ?? "normal"];
    if (pa !== pb) return pa - pb;
    return new Date(b.releasedAt).getTime() - new Date(a.releasedAt).getTime();
  });
}
