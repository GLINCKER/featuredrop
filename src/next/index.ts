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
import { createElement } from "react";

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
 * and calls the core `getNewFeatures` function. Safe to use in React Server
 * Components, `generateStaticParams`, or any server context.
 *
 * @param manifest  The feature manifest array.
 * @param dismissedIds  IDs already dismissed by this user (from your session/DB).
 * @param options  Optional targeting overrides.
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
 * Same as `getNewFeaturesServer` but returns the count only.
 *
 * @param manifest  The feature manifest array.
 * @param dismissedIds  IDs already dismissed by this user (from your session/DB).
 * @param options  Optional targeting overrides.
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

/** Props for FeatureDropScript */
export interface FeatureDropScriptProps {
  manifest: FeatureEntry[];
  dismissedIds?: string[];
}

/**
 * Injects manifest + dismissed IDs into the page as a JSON script tag.
 *
 * Place this in your root layout (server component) so the client-side
 * `FeatureDropProvider` can read the data on first render without a
 * flash-of-no-content (0 new features → real count).
 *
 * Client-side usage:
 * ```ts
 * const el = document.getElementById("__FEATUREDROP_DATA__");
 * const { manifest, dismissedIds } = JSON.parse(el?.textContent ?? "{}");
 * ```
 */
export function FeatureDropScript({ manifest, dismissedIds }: FeatureDropScriptProps) {
  const data = JSON.stringify({ manifest, dismissedIds: dismissedIds ?? [] });
  return createElement("script", {
    id: "__FEATUREDROP_DATA__",
    type: "application/json",
    dangerouslySetInnerHTML: { __html: data },
  });
}
