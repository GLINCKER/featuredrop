import { createMemo, type Accessor } from "solid-js";
import type { FeatureEntry } from "../../types";
import { useFeatureDrop } from "./use-feature-drop";

export interface UseNewFeatureResult {
  feature: Accessor<FeatureEntry | undefined>;
  isNew: Accessor<boolean>;
  dismiss: () => void;
}

export function useNewFeature(sidebarKey: string): UseNewFeatureResult {
  const { isNew, getFeature, dismiss } = useFeatureDrop();

  const feature = createMemo(() => getFeature(sidebarKey));
  const isNewValue = createMemo(() => isNew(sidebarKey));
  const dismissFeature = (): void => {
    const value = feature();
    if (value) dismiss(value.id);
  };

  return {
    feature,
    isNew: isNewValue,
    dismiss: dismissFeature,
  };
}
