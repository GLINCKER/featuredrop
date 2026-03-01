import { getNewFeatures, getNewFeatureCount } from "../core";
import { MemoryAdapter } from "../adapters/memory";
import type {
  FeatureEntry,
  FeatureManifest,
  UserContext,
  AudienceMatchFn,
  FeatureDependencyState,
  TriggerContext,
  FeatureFlagBridge,
} from "../types";

export type {
  FeatureEntry,
  FeatureManifest,
  UserContext,
  AudienceMatchFn,
  FeatureDependencyState,
  TriggerContext,
  FeatureFlagBridge,
};

/** Options shared by server helpers */
export interface ServerOptions {
  /** Current date override (defaults to `new Date()`) */
  now?: Date;
  /** User context for audience targeting */
  userContext?: UserContext;
  /** Custom audience matcher */
  matchAudience?: AudienceMatchFn;
  /** Current app semver string for version targeting */
  appVersion?: string;
  /** Dependency state for progressive disclosure */
  dependencyState?: FeatureDependencyState;
  /** Trigger context for contextual rules */
  triggerContext?: TriggerContext;
  /** Feature flag bridge for flag-gated entries */
  flagBridge?: FeatureFlagBridge;
  /** Product scope for multi-product manifests */
  product?: string;
}

/**
 * Server-safe helper: get new features without browser storage.
 *
 * Creates a temporary MemoryAdapter pre-seeded with the provided dismissed IDs
 * and calls the core `getNewFeatures` function. Safe to use in Nuxt server
 * routes, `useAsyncData`, or `useFetch` server-side handlers.
 *
 * @param manifest     The feature manifest array.
 * @param dismissedIds IDs already dismissed by this user (from your session/DB).
 * @param options      Optional targeting overrides.
 */
export function getNewFeaturesServer(
  manifest: FeatureManifest,
  dismissedIds?: string[],
  options?: ServerOptions,
): FeatureEntry[] {
  const storage = new MemoryAdapter();
  if (dismissedIds) {
    for (const id of dismissedIds) {
      storage.dismiss(id);
    }
  }
  return getNewFeatures(
    manifest,
    storage,
    options?.now,
    options?.userContext,
    options?.matchAudience,
    options?.appVersion,
    options?.dependencyState,
    options?.triggerContext,
    options?.flagBridge,
    options?.product,
  );
}

/**
 * Server-safe helper: get new feature count.
 *
 * Same as `getNewFeaturesServer` but returns the count only. Useful when you
 * only need the badge number and want to avoid serialising the full manifest.
 *
 * @param manifest     The feature manifest array.
 * @param dismissedIds IDs already dismissed by this user (from your session/DB).
 * @param options      Optional targeting overrides.
 */
export function getNewCountServer(
  manifest: FeatureManifest,
  dismissedIds?: string[],
  options?: ServerOptions,
): number {
  const storage = new MemoryAdapter();
  if (dismissedIds) {
    for (const id of dismissedIds) {
      storage.dismiss(id);
    }
  }
  return getNewFeatureCount(
    manifest,
    storage,
    options?.now,
    options?.userContext,
    options?.matchAudience,
    options?.appVersion,
    options?.dependencyState,
    options?.triggerContext,
    options?.flagBridge,
    options?.product,
  );
}

/**
 * Factory that returns a Nitro event handler for a `/api/features` endpoint.
 *
 * The `event` parameter is typed as `unknown` to avoid a hard dependency on
 * `h3` / Nitro — cast it inside `getDismissedIds` to the concrete event type
 * your Nuxt version uses.
 *
 * Usage in `server/api/features.get.ts`:
 * ```ts
 * import { defineFeatureDropEventHandler } from "featuredrop/nuxt";
 * import { manifest } from "~/features/manifest";
 *
 * export default defineFeatureDropEventHandler(
 *   () => manifest,
 *   (event) => {
 *     // pull dismissed IDs from session, cookie, or DB
 *     return useSession(event).dismissed ?? [];
 *   },
 * );
 * ```
 *
 * @param getManifest     Returns (or resolves to) the feature manifest.
 * @param getDismissedIds Optional. Receives the Nitro event and returns the
 *                        dismissed feature IDs for the current user.
 */
export function defineFeatureDropEventHandler(
  getManifest: () => FeatureEntry[] | Promise<FeatureEntry[]>,
  getDismissedIds?: (event: unknown) => string[] | Promise<string[]>,
): (event: unknown) => Promise<{
  manifest: FeatureEntry[];
  newFeatures: FeatureEntry[];
  newCount: number;
}> {
  return async (event: unknown) => {
    const manifest = await getManifest();
    const dismissedIds = getDismissedIds ? await getDismissedIds(event) : [];
    const newFeatures = getNewFeaturesServer(manifest, dismissedIds);
    return {
      manifest,
      newFeatures,
      newCount: newFeatures.length,
    };
  };
}

/**
 * Returns an object suitable for Nuxt's `useHead()` that injects the manifest
 * and dismissed IDs as an inline JSON script tag.
 *
 * This allows the client-side Vue composables (from `featuredrop/vue`) to
 * read server-resolved data on first render, eliminating the flash where
 * the new-feature count momentarily appears as zero.
 *
 * Usage in a page or layout:
 * ```ts
 * import { getHeadScript } from "featuredrop/nuxt";
 * import { manifest } from "~/features/manifest";
 *
 * const { data } = await useAsyncData("features", () =>
 *   $fetch("/api/features"),
 * );
 * useHead(getHeadScript(manifest, data.value?.dismissed));
 * ```
 *
 * Client-side retrieval:
 * ```ts
 * const el = document.getElementById("__FEATUREDROP_DATA__");
 * const { manifest, dismissedIds } = JSON.parse(el?.textContent ?? "{}");
 * ```
 *
 * @param manifest     The feature manifest array.
 * @param dismissedIds IDs already dismissed by this user.
 */
export function getHeadScript(
  manifest: FeatureEntry[],
  dismissedIds?: string[],
): {
  script: Array<{
    id: string;
    type: string;
    innerHTML: string;
  }>;
} {
  return {
    script: [
      {
        id: "__FEATUREDROP_DATA__",
        type: "application/json",
        innerHTML: JSON.stringify({ manifest, dismissedIds: dismissedIds ?? [] }),
      },
    ],
  };
}
