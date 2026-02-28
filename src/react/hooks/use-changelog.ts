import { useCallback, useMemo } from "react";
import { useFeatureDrop } from "./use-feature-drop";
import type { FeatureEntry } from "../../types";

export interface UseChangelogResult {
  /** All features from the manifest (including non-new) */
  features: readonly FeatureEntry[];
  /** Only features that are currently "new" (unread) */
  newFeatures: readonly FeatureEntry[];
  /** Count of new/unread features */
  newCount: number;
  /** Sorted new features (critical first, then by date) */
  newFeaturesSorted: readonly FeatureEntry[];
  /** Dismiss a single feature by ID */
  dismiss: (id: string) => void;
  /** Dismiss all features at once */
  dismissAll: () => void;
  /** Check if a specific feature is new */
  isNew: (sidebarKey: string) => boolean;
  /** Mark all currently visible features as seen (advances watermark) */
  markAllSeen: () => void;
  /** Get features filtered by category */
  getByCategory: (category: string) => readonly FeatureEntry[];
}

export function useChangelog(): UseChangelogResult {
  const ctx = useFeatureDrop();

  const markAllSeen = useCallback(() => {
    void ctx.dismissAll();
  }, [ctx]);

  const getByCategory = useCallback(
    (category: string): readonly FeatureEntry[] => {
      return ctx.newFeatures.filter((f) => f.category === category);
    },
    [ctx.newFeatures],
  );

  return useMemo(
    () => ({
      features: ctx.manifest,
      newFeatures: ctx.newFeatures,
      newCount: ctx.newCount,
      newFeaturesSorted: ctx.newFeaturesSorted,
      dismiss: ctx.dismiss,
      dismissAll: () => void ctx.dismissAll(),
      isNew: ctx.isNew,
      markAllSeen,
      getByCategory,
    }),
    [ctx.manifest, ctx.newFeatures, ctx.newCount, ctx.newFeaturesSorted, ctx.dismiss, ctx.dismissAll, ctx.isNew, markAllSeen, getByCategory],
  );
}
