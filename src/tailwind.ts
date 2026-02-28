/**
 * FeatureDrop Tailwind CSS Plugin
 *
 * Registers design tokens, animations, and utility classes for FeatureDrop components.
 *
 * @example
 * ```ts
 * // tailwind.config.ts
 * import { featureDropPlugin } from 'featuredrop/tailwind'
 *
 * export default {
 *   plugins: [featureDropPlugin()],
 * }
 * ```
 */

export interface FeatureDropPluginOptions {
  /** Prefix for utility classes (default: "fd") */
  prefix?: string;
}

type CSSValue = string | Record<string, string>;
type CSSRuleBlock = Record<string, CSSValue>;

interface PluginAPI {
  addBase: (styles: Record<string, CSSRuleBlock>) => void;
  addUtilities: (utilities: Record<string, Record<string, string>>) => void;
  matchUtilities: (
    utilities: Record<string, (value: string) => Record<string, string>>,
    options?: { values: Record<string, string> }
  ) => void;
  theme: (path: string) => unknown;
}

interface PluginCreator {
  (options?: FeatureDropPluginOptions): {
    handler: (api: PluginAPI) => void;
    config: Record<string, unknown>;
  };
}

export const featureDropPlugin: PluginCreator = (options = {}) => {
  const prefix = options.prefix ?? "fd";

  return {
    handler({ addBase, addUtilities }) {
      // CSS custom properties for theming
      addBase({
        ":root": {
          // Badge colors
          [`--${prefix}-new`]: "#3b82f6",
          [`--${prefix}-new-hover`]: "#2563eb",
          [`--${prefix}-new-dot`]: "#ef4444",
          [`--${prefix}-dismiss`]: "#6b7280",
          [`--${prefix}-success`]: "#10b981",

          // Changelog colors
          [`--${prefix}-changelog-bg`]: "#ffffff",
          [`--${prefix}-changelog-border`]: "#e5e7eb",
          [`--${prefix}-changelog-text`]: "#111827",
          [`--${prefix}-changelog-muted`]: "#6b7280",

          // Spotlight/overlay
          [`--${prefix}-overlay`]: "rgba(0, 0, 0, 0.5)",
          [`--${prefix}-spotlight-ring`]: "#3b82f6",

          // Tour
          [`--${prefix}-tour-bg`]: "#ffffff",
          [`--${prefix}-tour-shadow`]:
            "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)",

          // Transitions
          [`--${prefix}-duration`]: "200ms",
          [`--${prefix}-easing`]: "cubic-bezier(0.4, 0, 0.2, 1)",
        },
        // Dark mode overrides
        ".dark, [data-theme='dark']": {
          [`--${prefix}-new`]: "#60a5fa",
          [`--${prefix}-new-hover`]: "#93c5fd",
          [`--${prefix}-changelog-bg`]: "#1f2937",
          [`--${prefix}-changelog-border`]: "#374151",
          [`--${prefix}-changelog-text`]: "#f9fafb",
          [`--${prefix}-changelog-muted`]: "#9ca3af",
          [`--${prefix}-tour-bg`]: "#1f2937",
          [`--${prefix}-tour-shadow`]:
            "0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -2px rgba(0, 0, 0, 0.2)",
        },
        // Keyframe animations
        "@keyframes fd-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        "@keyframes fd-fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "@keyframes fd-slide-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "@keyframes fd-scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "@keyframes fd-spotlight-glow": {
          "0%, 100%": { boxShadow: `0 0 0 4px var(--${prefix}-spotlight-ring)` },
          "50%": { boxShadow: `0 0 0 8px var(--${prefix}-spotlight-ring)` },
        },
        // Reduced motion
        "@media (prefers-reduced-motion: reduce)": {
          "*": {
            "animation-duration": "0.01ms !important",
            "animation-iteration-count": "1 !important",
          },
        },
      });

      // Utility classes
      addUtilities({
        // Badge variants
        [`.${prefix}-badge`]: {
          display: "inline-flex",
          "align-items": "center",
          "justify-content": "center",
          "font-size": "0.75rem",
          "font-weight": "500",
          "line-height": "1",
          "border-radius": "9999px",
          "background-color": `var(--${prefix}-new)`,
          color: "#ffffff",
          "padding-left": "0.5rem",
          "padding-right": "0.5rem",
          "padding-top": "0.125rem",
          "padding-bottom": "0.125rem",
        },
        [`.${prefix}-badge-dot`]: {
          display: "inline-block",
          width: "0.5rem",
          height: "0.5rem",
          "border-radius": "9999px",
          "background-color": `var(--${prefix}-new-dot)`,
        },
        [`.${prefix}-badge-count`]: {
          display: "inline-flex",
          "align-items": "center",
          "justify-content": "center",
          "min-width": "1.25rem",
          height: "1.25rem",
          "font-size": "0.6875rem",
          "font-weight": "600",
          "line-height": "1",
          "border-radius": "9999px",
          "background-color": `var(--${prefix}-new-dot)`,
          color: "#ffffff",
          "padding-left": "0.375rem",
          "padding-right": "0.375rem",
        },
        // Animation utilities
        [`.${prefix}-animate-pulse`]: {
          animation: "fd-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        },
        [`.${prefix}-animate-fade-in`]: {
          animation: `fd-fade-in var(--${prefix}-duration) var(--${prefix}-easing) forwards`,
        },
        [`.${prefix}-animate-slide-up`]: {
          animation: `fd-slide-up var(--${prefix}-duration) var(--${prefix}-easing) forwards`,
        },
        [`.${prefix}-animate-scale-in`]: {
          animation: `fd-scale-in var(--${prefix}-duration) var(--${prefix}-easing) forwards`,
        },
        [`.${prefix}-animate-spotlight`]: {
          animation: "fd-spotlight-glow 2s ease-in-out infinite",
        },
      });
    },
    config: {
      theme: {
        extend: {
          colors: {
            [prefix]: {
              new: `var(--${prefix}-new)`,
              "new-hover": `var(--${prefix}-new-hover)`,
              dot: `var(--${prefix}-new-dot)`,
              dismiss: `var(--${prefix}-dismiss)`,
              success: `var(--${prefix}-success)`,
            },
          },
        },
      },
    },
  };
};
