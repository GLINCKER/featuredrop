import { useEffect, useRef } from "react";
import { useFeatureDrop } from "./use-feature-drop";

export interface UseTabNotificationOptions {
  /** Whether tab notifications are enabled. Default: true */
  enabled?: boolean;
  /** Template string. `{count}` is replaced with the number. Default: "({count}) {title}" */
  template?: string;
  /** Enable flashing/blinking pattern for attention. Default: false */
  flash?: boolean;
  /** Flash interval in ms. Default: 1500 */
  flashInterval?: number;
}

/**
 * Updates the browser tab title with the unread feature count.
 *
 * Shows "(3) My App" when there are new features, restores the original
 * title when all features are read. Optional flash/blink pattern for attention.
 *
 * @example
 * ```tsx
 * function App() {
 *   useTabNotification();
 *   return <div>...</div>;
 * }
 * ```
 *
 * @example With flash
 * ```tsx
 * useTabNotification({ flash: true, template: "[{count} new] {title}" });
 * ```
 */
export function useTabNotification(options: UseTabNotificationOptions = {}): void {
  const {
    enabled = true,
    template = "({count}) {title}",
    flash = false,
    flashInterval = 1500,
  } = options;

  const { newCount } = useFeatureDrop();
  const originalTitleRef = useRef<string>("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (typeof document === "undefined") return;

    // Capture original title once
    if (!originalTitleRef.current) {
      originalTitleRef.current = document.title;
    }
    const originalTitle = originalTitleRef.current;

    if (!enabled || newCount === 0) {
      // Restore original title
      document.title = originalTitle;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const notificationTitle = template
      .replace("{count}", String(newCount))
      .replace("{title}", originalTitle);

    if (flash) {
      // Alternate between notification and original title
      let showNotification = true;
      document.title = notificationTitle;
      intervalRef.current = setInterval(() => {
        showNotification = !showNotification;
        document.title = showNotification ? notificationTitle : originalTitle;
      }, flashInterval);
    } else {
      document.title = notificationTitle;
    }

    return () => {
      document.title = originalTitle;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, newCount, template, flash, flashInterval]);
}
