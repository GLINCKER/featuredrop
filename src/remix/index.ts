/**
 * featuredrop — Remix integration
 *
 * Server-side loader helpers for computing new feature state from session data.
 *
 * Typical usage in a Remix loader:
 *
 * ```ts
 * import { getNewFeaturesServer, createFeatureDropHeaders } from "featuredrop/remix";
 * import { manifest } from "~/features/manifest";
 *
 * export async function loader({ request }: LoaderFunctionArgs) {
 *   const session = await getSession(request.headers.get("Cookie"));
 *   const dismissedIds: string[] = session.get("fd_dismissed") ?? [];
 *
 *   const newFeatures = getNewFeaturesServer(manifest, dismissedIds);
 *   const headers = createFeatureDropHeaders(manifest, dismissedIds);
 *
 *   return json({ newFeatures }, { headers });
 * }
 * ```
 *
 * All helpers are pure functions — they create a transient MemoryAdapter
 * internally so there are no shared global state concerns between requests.
 */

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

// Re-export types for downstream convenience
export type { FeatureEntry, FeatureManifest };

/**
 * Options bag for server-side newness checks.
 *
 * Mirrors the optional parameters of the core `getNewFeatures` function.
 * All fields are optional — omit what you don't use.
 */
export interface IsNewOptions {
  /** Override the current timestamp (defaults to `new Date()`). */
  now?: Date;
  /**
   * User context for audience targeting rules.
   * Required when any manifest entry has an `audience` field.
   */
  userContext?: UserContext;
  /**
   * Custom audience matching function.
   * Replaces the built-in plan/role/region matcher when provided.
   */
  matchAudience?: AudienceMatchFn;
  /**
   * Current app version string (e.g. `"2.5.0"`).
   * Required when any manifest entry uses semver `version` constraints.
   */
  appVersion?: string;
  /** Runtime dependency state for progressive feature discovery. */
  dependencyState?: FeatureDependencyState;
  /**
   * Trigger context for contextual display rules.
   * On the server you typically omit this (triggers are client-side).
   */
  triggerContext?: TriggerContext;
  /** Feature flag bridge for evaluating `flagKey` entries. */
  flagBridge?: FeatureFlagBridge;
  /**
   * Product scope filter.
   * Use when your manifest covers multiple products and you want to
   * surface only entries for the current product.
   */
  product?: string;
}

// ---------------------------------------------------------------------------
// Internal helper — builds a populated MemoryAdapter from an array of IDs
// ---------------------------------------------------------------------------

function buildAdapter(dismissedIds: readonly string[] = []): MemoryAdapter {
  const adapter = new MemoryAdapter();
  for (const id of dismissedIds) {
    adapter.dismiss(id);
  }
  return adapter;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Return all features that are currently "new" for the given user.
 *
 * Creates a short-lived `MemoryAdapter` seeded with the provided
 * `dismissedIds`, then delegates to `getNewFeatures` from core.
 *
 * @param manifest   The full feature manifest.
 * @param dismissedIds  IDs the user has already dismissed (from session/DB).
 * @param options    Optional targeting overrides.
 * @returns          Array of `FeatureEntry` objects considered new.
 *
 * @example
 * ```ts
 * // In a Remix loader
 * const dismissed: string[] = session.get("fd_dismissed") ?? [];
 * const newFeatures = getNewFeaturesServer(manifest, dismissed, {
 *   userContext: { plan: "pro" },
 * });
 * return json({ newFeatures });
 * ```
 */
export function getNewFeaturesServer(
  manifest: FeatureManifest,
  dismissedIds: readonly string[] = [],
  options: IsNewOptions = {},
): FeatureEntry[] {
  const adapter = buildAdapter(dismissedIds);
  return getNewFeatures(
    manifest,
    adapter,
    options.now,
    options.userContext,
    options.matchAudience,
    options.appVersion,
    options.dependencyState,
    options.triggerContext,
    options.flagBridge,
    options.product,
  );
}

/**
 * Return the count of features that are currently "new" for the given user.
 *
 * Lightweight alternative to `getNewFeaturesServer` when you only need the
 * number — avoids allocating the full result array on the caller's side.
 *
 * @param manifest     The full feature manifest.
 * @param dismissedIds IDs the user has already dismissed.
 * @param options      Optional targeting overrides.
 * @returns            Integer count of new features.
 *
 * @example
 * ```ts
 * const count = getNewCountServer(manifest, session.get("fd_dismissed") ?? []);
 * // Pass count to the client as a header or in the JSON payload
 * ```
 */
export function getNewCountServer(
  manifest: FeatureManifest,
  dismissedIds: readonly string[] = [],
  options: IsNewOptions = {},
): number {
  const adapter = buildAdapter(dismissedIds);
  return getNewFeatureCount(
    manifest,
    adapter,
    options.now,
    options.userContext,
    options.matchAudience,
    options.appVersion,
    options.dependencyState,
    options.triggerContext,
    options.flagBridge,
    options.product,
  );
}

/**
 * Build a `Headers` object carrying the new-feature count.
 *
 * Useful when you want the client to know about the badge count without
 * serialising the entire feature list into the JSON response body.
 *
 * The header `X-FD-New-Count` is set to the string representation of the
 * count. Clients can read it via `useFetcher` or a custom hook.
 *
 * @param manifest     The full feature manifest.
 * @param dismissedIds IDs the user has already dismissed.
 * @param options      Optional targeting overrides.
 * @returns            A `Headers` instance with `X-FD-New-Count` set.
 *
 * @example
 * ```ts
 * export async function loader({ request }: LoaderFunctionArgs) {
 *   const dismissed: string[] = session.get("fd_dismissed") ?? [];
 *   const headers = createFeatureDropHeaders(manifest, dismissed);
 *   return json({ ok: true }, { headers });
 * }
 * ```
 */
export function createFeatureDropHeaders(
  manifest: FeatureManifest,
  dismissedIds: readonly string[] = [],
  options: IsNewOptions = {},
): Headers {
  const count = getNewCountServer(manifest, dismissedIds, options);
  const headers = new Headers();
  headers.set("X-FD-New-Count", String(count));
  return headers;
}
