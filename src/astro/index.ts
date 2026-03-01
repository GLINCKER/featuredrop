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

export type { FeatureEntry, FeatureManifest };

/** Options shared by both server helpers */
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
 * Server-side helper: get new features without browser storage.
 *
 * Creates a temporary MemoryAdapter pre-seeded with the provided dismissed IDs
 * and calls the core `getNewFeatures` function. Safe to use in Astro page
 * frontmatter, API routes, or any server context.
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
 * Server-side helper: get new feature count.
 *
 * Same as `getNewFeaturesServer` but returns the count only. Useful for
 * rendering badge numbers in Astro page frontmatter.
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
 * Returns a raw HTML `<script>` tag string carrying manifest + dismissed IDs.
 *
 * Inject into your Astro layout via `set:html` so that client-side islands can
 * read the pre-computed data on first render without a flash-of-no-content.
 *
 * Usage in an Astro component:
 * ```astro
 * ---
 * import { getManifestScript } from "featuredrop/astro";
 * const script = getManifestScript(manifest, dismissedIds);
 * ---
 * <Fragment set:html={script} />
 * ```
 *
 * Client-side retrieval:
 * ```ts
 * const el = document.getElementById("__FEATUREDROP_DATA__");
 * const { manifest, dismissedIds } = JSON.parse(el?.textContent ?? "{}");
 * ```
 *
 * @param manifest     The feature manifest array.
 * @param dismissedIds IDs already dismissed by this user (from your session/DB).
 */
export function getManifestScript(
  manifest: FeatureEntry[],
  dismissedIds?: string[],
): string {
  const data = JSON.stringify({ manifest, dismissedIds: dismissedIds ?? [] });
  // Escape </script> in JSON to prevent XSS / premature tag close
  const safe = data.replace(/<\/script/gi, "<\\/script");
  return `<script id="__FEATUREDROP_DATA__" type="application/json">${safe}</script>`;
}
