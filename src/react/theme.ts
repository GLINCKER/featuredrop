import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  resolveTheme,
  themeToCSSVariables,
  type FeatureDropThemeInput,
} from "../theme";

const PREFERS_DARK_MEDIA_QUERY = "(prefers-color-scheme: dark)";

function getPrefersDarkFromSystem(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia(PREFERS_DARK_MEDIA_QUERY).matches;
}

function usePrefersDark(shouldTrack: boolean): boolean {
  const [prefersDark, setPrefersDark] = useState<boolean>(() => getPrefersDarkFromSystem());

  useEffect(() => {
    if (!shouldTrack || typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia(PREFERS_DARK_MEDIA_QUERY);
    setPrefersDark(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersDark(event.matches);
    };

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, [shouldTrack]);

  if (!shouldTrack) {
    return getPrefersDarkFromSystem();
  }

  return prefersDark;
}

export function useThemeVariables(theme?: FeatureDropThemeInput): CSSProperties | undefined {
  const prefersDark = usePrefersDark(theme === "auto");

  return useMemo(() => {
    if (!theme) return undefined;
    return themeToCSSVariables(resolveTheme(theme, { prefersDark })) as CSSProperties;
  }, [theme, prefersDark]);
}
