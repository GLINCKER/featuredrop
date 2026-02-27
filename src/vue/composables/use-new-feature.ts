import { computed } from "vue";
import { useFeatureDrop } from "./use-feature-drop";

export function useNewFeature(sidebarKey: string) {
  const { isNew, getFeature, dismiss } = useFeatureDrop();

  const feature = computed(() => getFeature(sidebarKey));
  const isNewValue = computed(() => isNew(sidebarKey));
  const dismissFeature = (): void => {
    const value = feature.value;
    if (value) {
      dismiss(value.id);
    }
  };

  return {
    feature,
    isNew: isNewValue,
    dismiss: dismissFeature,
  };
}
