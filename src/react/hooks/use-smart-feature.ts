import { useRef, useCallback } from "react";
import { useFeatureDrop } from "./use-feature-drop";
import type { DisplayFormat, FeatureEntry } from "../../types";

export interface UseSmartFeatureResult {
  /** Whether the engine recommends showing this feature now */
  show: boolean;
  /** Recommended display format */
  format: DisplayFormat;
  /** Fallback format if primary component isn't available */
  fallbackFormat: DisplayFormat;
  /** The feature entry from the manifest */
  feature: FeatureEntry | undefined;
  /** Dismiss the feature (also tracks dismissal in engine) */
  dismiss: () => void;
  /** Engine's confidence in this timing decision (0-1) */
  confidence: number;
  /** Reason for the timing decision */
  reason: string;
}

/**
 * Engine-powered smart feature display hook.
 *
 * Combines the TimingOptimizer and FormatSelector to decide
 * whether to show a feature and what format to use.
 *
 * Without an engine, gracefully degrades to always-show with badge format.
 *
 * @param featureId - The feature ID to check
 * @returns `{ show, format, fallbackFormat, feature, dismiss, confidence, reason }`
 *
 * @example
 * ```tsx
 * function MyFeature() {
 *   const { show, format, feature, dismiss } = useSmartFeature('dark-mode')
 *
 *   if (!show) return null
 *
 *   switch (format) {
 *     case 'badge': return <NewBadge id="dark-mode" />
 *     case 'toast': return <Toast feature={feature} onDismiss={dismiss} />
 *     case 'modal': return <AnnouncementModal feature={feature} onDismiss={dismiss} />
 *     default: return <NewBadge id="dark-mode" />
 *   }
 * }
 * ```
 */
export function useSmartFeature(featureId: string): UseSmartFeatureResult {
  const { engine, manifest, dismiss: providerDismiss } = useFeatureDrop();
  const sessionStartRef = useRef(Date.now());

  const feature = (manifest as FeatureEntry[]).find((f) => f.id === featureId);

  const dismiss = useCallback(() => {
    engine?.trackInteraction(featureId, "dismissed");
    providerDismiss(featureId);
  }, [engine, featureId, providerDismiss]);

  // No engine → always show with badge format (graceful degradation)
  if (!engine) {
    return {
      show: !!feature,
      format: "badge",
      fallbackFormat: "inline",
      feature,
      dismiss,
      confidence: 1.0,
      reason: "no_engine",
    };
  }

  const currentPath =
    typeof window !== "undefined" ? window.location.pathname : "/";
  const sessionAge = (Date.now() - sessionStartRef.current) / 1000;

  const timing = engine.shouldShow(featureId, {
    currentPath,
    sessionAge,
    recentDismissals: 0,
    featurePriority: feature?.priority ?? "normal",
  });

  const formatRec = engine.recommendFormat(featureId);

  return {
    show: timing.show,
    format: formatRec.primary,
    fallbackFormat: formatRec.fallback,
    feature,
    dismiss,
    confidence: timing.confidence,
    reason: timing.reason,
  };
}
