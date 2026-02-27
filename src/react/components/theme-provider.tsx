import type { CSSProperties, ReactNode } from "react";
import type { FeatureDropThemeInput } from "../../theme";
import { useThemeVariables } from "../theme";

export interface ThemeProviderProps {
  /** Theme preset ("light" | "dark" | "auto" | "minimal" | "vibrant") or custom theme overrides */
  theme?: FeatureDropThemeInput;
  /** Optional CSS class for the wrapper element */
  className?: string;
  /** Optional inline style merged after theme CSS variables */
  style?: CSSProperties;
  children: ReactNode;
}

/**
 * Applies FeatureDrop theme tokens as CSS custom properties to a subtree.
 *
 * All featuredrop components inside this provider inherit the resolved theme.
 */
export function ThemeProvider({
  theme = "light",
  className,
  style,
  children,
}: ThemeProviderProps) {
  const themeVariables = useThemeVariables(theme);

  return (
    <div
      data-featuredrop-theme-provider
      className={className}
      style={{ ...themeVariables, ...style }}
    >
      {children}
    </div>
  );
}
