import { useContext } from "react";
import { FeatureDropContext } from "../context";
import type { FeatureDropContextValue } from "../context";

/**
 * Access the full feature discovery context.
 *
 * Returns: `{ newFeatures, newCount, isNew, dismiss, dismissAll, getFeature }`
 *
 * @throws Error if used outside of `<FeatureDropProvider>`
 */
export function useFeatureDrop(): FeatureDropContextValue {
  const context = useContext(FeatureDropContext);
  if (!context) {
    throw new Error(
      "useFeatureDrop must be used within a <FeatureDropProvider>",
    );
  }
  return context;
}
