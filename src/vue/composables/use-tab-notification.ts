import { onBeforeUnmount, watch } from "vue";
import { useFeatureDrop } from "./use-feature-drop";

export interface UseTabNotificationOptions {
  enabled?: boolean;
  template?: string;
  flash?: boolean;
  flashInterval?: number;
}

export function useTabNotification(options: UseTabNotificationOptions = {}): void {
  const {
    enabled = true,
    template = "({count}) {title}",
    flash = false,
    flashInterval = 1500,
  } = options;

  const { newCount } = useFeatureDrop();
  if (typeof document === "undefined") return;

  const originalTitle = document.title;
  let interval: ReturnType<typeof setInterval> | null = null;

  const stop = watch(
    () => newCount.value,
    (count) => {
      if (!enabled || count === 0) {
        document.title = originalTitle;
        if (interval) {
          clearInterval(interval);
          interval = null;
        }
        return;
      }

      const nextTitle = template
        .replace("{count}", String(count))
        .replace("{title}", originalTitle);

      if (!flash) {
        document.title = nextTitle;
        return;
      }

      let showNotification = true;
      document.title = nextTitle;
      if (interval) clearInterval(interval);
      interval = setInterval(() => {
        showNotification = !showNotification;
        document.title = showNotification ? nextTitle : originalTitle;
      }, flashInterval);
    },
    { immediate: true },
  );

  onBeforeUnmount(() => {
    stop();
    document.title = originalTitle;
    if (interval) {
      clearInterval(interval);
      interval = null;
    }
  });
}
