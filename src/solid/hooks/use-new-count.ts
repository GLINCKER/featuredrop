import type { Accessor } from "solid-js";
import { useFeatureDrop } from "./use-feature-drop";

export function useNewCount(): Accessor<number> {
  const { newCount } = useFeatureDrop();
  return newCount;
}
