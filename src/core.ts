import type {
  AudienceMatchFn,
  AudienceRule,
  FeatureEntry,
  FeatureManifest,
  StorageAdapter,
  UserContext,
  FeatureDependencyState,
  FeatureFlagBridge,
  TriggerContext,
} from "./types";
import { compareSemver, satisfiesRange } from "./semver";
import { isTriggerMatch } from "./triggers";

/**
 * Default audience matching logic.
 *
 * For each specified field (plan, role, region), checks if the user's
 * value is included in the allowed list. Fields use AND logic between them,
 * OR logic within each field's array. The `custom` field is ignored by
 * the default matcher — use a custom `AudienceMatchFn` for that.
 */
export function matchesAudience(
  audience: AudienceRule,
  userContext: UserContext,
): boolean {
  if (audience.plan && audience.plan.length > 0) {
    if (!userContext.plan || !audience.plan.includes(userContext.plan)) {
      return false;
    }
  }
  if (audience.role && audience.role.length > 0) {
    if (!userContext.role || !audience.role.includes(userContext.role)) {
      return false;
    }
  }
  if (audience.region && audience.region.length > 0) {
    if (!userContext.region || !audience.region.includes(userContext.region)) {
      return false;
    }
  }
  return true;
}

/**
 * Check if a feature's audience allows the given user context.
 *
 * - No `audience` field → visible to all
 * - Empty `audience` ({}) → visible to all
 * - `audience` specified but no `userContext` → hidden (safe default)
 * - Otherwise, delegate to `matchFn` (or default `matchesAudience`)
 */
function isAudienceMatch(
  feature: FeatureEntry,
  userContext?: UserContext,
  matchFn?: AudienceMatchFn,
): boolean {
  // No audience restriction → show to everyone
  if (!feature.audience) return true;

  // Check if audience is empty (no fields with values)
  const { plan, role, region, custom } = feature.audience;
  const hasRules =
    (plan && plan.length > 0) ||
    (role && role.length > 0) ||
    (region && region.length > 0) ||
    (custom && Object.keys(custom).length > 0);
  if (!hasRules) return true;

  // Audience specified but no user context → hidden (safe default)
  if (!userContext) return false;

  // Use custom matcher if provided, otherwise default
  if (matchFn) return matchFn(feature.audience, userContext);
  return matchesAudience(feature.audience, userContext);
}

function isVersionMatch(feature: FeatureEntry, appVersion?: string): boolean {
  const v = feature.version;
  if (!v || typeof v === "string") return true; // string = display only
  if (!appVersion) return false; // Safe default when constraints exist
  if (!v.introduced && !v.showNewUntil && !v.deprecatedAt && !v.showIn) return true;

  // Range check
  if (v.showIn && !satisfiesRange(appVersion, v.showIn)) return false;

  if (v.introduced && compareSemver(appVersion, v.introduced) < 0) return false;
  if (v.deprecatedAt && compareSemver(appVersion, v.deprecatedAt) >= 0) return false;

  // showNewUntil gates "new" state only
  if (v.showNewUntil && compareSemver(appVersion, v.showNewUntil) >= 0) return false;

  return true;
}

function isFlagMatch(
  feature: FeatureEntry,
  flagBridge?: FeatureFlagBridge,
  userContext?: UserContext,
): boolean {
  if (!feature.flagKey) return true;
  if (!flagBridge) return false;
  try {
    return flagBridge.isEnabled(feature.flagKey, userContext);
  } catch {
    return false;
  }
}

function isProductMatch(feature: FeatureEntry, product?: string): boolean {
  if (!feature.product || feature.product === "*") return true;
  if (!product) return false;
  return feature.product === product;
}

function isDependencyMatch(
  feature: FeatureEntry,
  dismissedIds: ReadonlySet<string>,
  dependencyState?: FeatureDependencyState,
): boolean {
  const dependsOn = feature.dependsOn;
  if (!dependsOn) return true;

  const seenIds = dependencyState?.seenIds;
  const clickedIds = dependencyState?.clickedIds;
  const dismissedDependencyIds = dependencyState?.dismissedIds ?? dismissedIds;

  if (dependsOn.seen && dependsOn.seen.length > 0) {
    for (const id of dependsOn.seen) {
      const seen = seenIds?.has(id) ?? false;
      if (!seen && !dismissedDependencyIds.has(id)) return false;
    }
  }

  if (dependsOn.clicked && dependsOn.clicked.length > 0) {
    for (const id of dependsOn.clicked) {
      if (!(clickedIds?.has(id) ?? false)) return false;
    }
  }

  if (dependsOn.dismissed && dependsOn.dismissed.length > 0) {
    for (const id of dependsOn.dismissed) {
      if (!dismissedDependencyIds.has(id)) return false;
    }
  }

  return true;
}

/**
 * Check if a single feature should show as "new".
 *
 * A feature is "new" when ALL of these are true:
 * 1. Current time is before `showNewUntil`
 * 2. Feature was released after the watermark (or no watermark exists)
 * 3. Feature has not been individually dismissed
 * 4. If `publishAt` is set, current time must be after it (scheduled publishing)
 * 5. If `audience` is set, user must match the targeting rules
 * 6. If `flagKey` is set, the flag bridge must resolve it as enabled
 * 7. If `product` is set, it must match the current product scope
 */
export function isNew(
  feature: FeatureEntry,
  watermark: string | null,
  dismissedIds: ReadonlySet<string>,
  now: Date = new Date(),
  userContext?: UserContext,
  matchAudience?: AudienceMatchFn,
  appVersion?: string,
  dependencyState?: FeatureDependencyState,
  triggerContext?: TriggerContext,
  flagBridge?: FeatureFlagBridge,
  product?: string,
): boolean {
  // Already dismissed by the user on this device
  if (dismissedIds.has(feature.id)) return false;

  // Audience targeting — check before time-based checks
  if (!isAudienceMatch(feature, userContext, matchAudience)) return false;

  // Dependency targeting — defer features until prerequisites are satisfied
  if (!isDependencyMatch(feature, dismissedIds, dependencyState)) return false;

  // Version targeting — requires appVersion when constraints exist
  if (!isVersionMatch(feature, appVersion)) return false;

  // Feature flag targeting — hide flagged entries unless enabled
  if (!isFlagMatch(feature, flagBridge, userContext)) return false;

  // Multi-product targeting — hide entries for other product scopes
  if (!isProductMatch(feature, product)) return false;

  // Contextual trigger rules — show only when trigger condition is satisfied.
  if (!isTriggerMatch(feature.trigger, triggerContext)) return false;

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
  userContext?: UserContext,
  matchAudience?: AudienceMatchFn,
  appVersion?: string,
  dependencyState?: FeatureDependencyState,
  triggerContext?: TriggerContext,
  flagBridge?: FeatureFlagBridge,
  product?: string,
): FeatureEntry[] {
  const watermark = storage.getWatermark();
  const dismissedIds = storage.getDismissedIds();
  return manifest.filter((f) =>
    isNew(
      f,
      watermark,
      dismissedIds,
      now,
      userContext,
      matchAudience,
      appVersion,
      dependencyState,
      triggerContext,
      flagBridge,
      product,
    ),
  );
}

/**
 * Get the count of new features.
 */
export function getNewFeatureCount(
  manifest: FeatureManifest,
  storage: StorageAdapter,
  now: Date = new Date(),
  userContext?: UserContext,
  matchAudience?: AudienceMatchFn,
  appVersion?: string,
  dependencyState?: FeatureDependencyState,
  triggerContext?: TriggerContext,
  flagBridge?: FeatureFlagBridge,
  product?: string,
): number {
  return getNewFeatures(
    manifest,
    storage,
    now,
    userContext,
    matchAudience,
    appVersion,
    dependencyState,
    triggerContext,
    flagBridge,
    product,
  ).length;
}

/**
 * Check if a specific sidebar key has a new feature.
 */
export function hasNewFeature(
  manifest: FeatureManifest,
  sidebarKey: string,
  storage: StorageAdapter,
  now: Date = new Date(),
  userContext?: UserContext,
  matchAudience?: AudienceMatchFn,
  appVersion?: string,
  dependencyState?: FeatureDependencyState,
  triggerContext?: TriggerContext,
  flagBridge?: FeatureFlagBridge,
  product?: string,
): boolean {
  const watermark = storage.getWatermark();
  const dismissedIds = storage.getDismissedIds();
  return manifest.some(
    (f) =>
      f.sidebarKey === sidebarKey &&
      isNew(
        f,
        watermark,
        dismissedIds,
        now,
        userContext,
        matchAudience,
        appVersion,
        dependencyState,
        triggerContext,
        flagBridge,
        product,
      ),
  );
}

/**
 * Get all features sorted by priority (critical first) then by release date (newest first).
 */
export function getNewFeaturesSorted(
  manifest: FeatureManifest,
  storage: StorageAdapter,
  now: Date = new Date(),
  userContext?: UserContext,
  matchAudience?: AudienceMatchFn,
  appVersion?: string,
  dependencyState?: FeatureDependencyState,
  triggerContext?: TriggerContext,
  flagBridge?: FeatureFlagBridge,
  product?: string,
): FeatureEntry[] {
  const priorityOrder = { critical: 0, normal: 1, low: 2 };
  return getNewFeatures(
    manifest,
    storage,
    now,
    userContext,
    matchAudience,
    appVersion,
    dependencyState,
    triggerContext,
    flagBridge,
    product,
  ).sort(
    (a, b) => {
      const pa = priorityOrder[a.priority ?? "normal"];
      const pb = priorityOrder[b.priority ?? "normal"];
      if (pa !== pb) return pa - pb;
      return (
        new Date(b.releasedAt).getTime() - new Date(a.releasedAt).getTime()
      );
    },
  );
}
