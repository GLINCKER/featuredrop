import { computed } from "vue";
import { useFeatureDrop } from "./use-feature-drop";

export function useNewCount() {
  const { newCount } = useFeatureDrop();
  return computed(() => newCount.value);
}
