import { useFeatureDrop } from "./use-feature-drop";
import type { FeatureEntry } from "../../types";

export interface UseNewFeatureResult {
  /** Whether this sidebar key has a new feature */
  isNew: boolean;
  /** The feature entry, if new */
  feature: FeatureEntry | undefined;
  /** Dismiss the feature for this sidebar key */
  dismiss: () => void;
}

/**
 * Check if a single navigation item has a new feature.
 *
 * @param sidebarKey - The key to check (e.g. "/journal", "settings")
 * @returns `{ isNew, feature, dismiss }`
 */
export function useNewFeature(sidebarKey: string): UseNewFeatureResult {
  const { isNew, getFeature, dismiss } = useFeatureDrop();

  const feature = getFeature(sidebarKey);
  const isNewValue = isNew(sidebarKey);

  return {
    isNew: isNewValue,
    feature,
    dismiss: () => {
      if (feature) {
        dismiss(feature.id);
      }
    },
  };
}
