import { useContext } from "solid-js";
import { FeatureDropSolidContext } from "../context";
import type { FeatureDropSolidStore } from "../store";

export function useFeatureDrop(): FeatureDropSolidStore {
  const context = useContext(FeatureDropSolidContext);
  if (!context) {
    throw new Error("useFeatureDrop must be used within a <FeatureDropProvider>");
  }
  return context;
}
