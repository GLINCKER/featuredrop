import { useFeatureDrop } from "./use-feature-drop";

/**
 * Get the count of currently new features.
 *
 * Useful for rendering a badge count on a "What's New" button.
 *
 * @returns The number of new features
 */
export function useNewCount(): number {
  const { newCount } = useFeatureDrop();
  return newCount;
}
