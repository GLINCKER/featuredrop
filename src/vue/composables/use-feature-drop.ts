import { inject } from "vue";
import { FeatureDropVueContextKey, type FeatureDropVueContextValue } from "../context";

export function useFeatureDrop(): FeatureDropVueContextValue {
  const context = inject(FeatureDropVueContextKey, null);
  if (!context) {
    throw new Error("useFeatureDrop must be used within a <FeatureDropProvider>");
  }
  return context;
}
