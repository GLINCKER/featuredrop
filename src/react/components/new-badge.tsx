import type { ReactNode, CSSProperties } from "react";

export interface NewBadgeRenderProps {
  /** Whether the feature is currently new */
  isNew: boolean;
}

export interface NewBadgeProps {
  /** Display variant */
  variant?: "pill" | "dot" | "count";
  /** Whether to show the badge (typically from `useNewFeature().isNew`) */
  show?: boolean;
  /** Count to display when variant is "count" */
  count?: number;
  /** Text label for the pill variant. Default: "New" */
  label?: string;
  /** Dismiss callback. If set with `dismissOnClick`, clicking dismisses. */
  onDismiss?: () => void;
  /** Whether clicking the badge should trigger onDismiss */
  dismissOnClick?: boolean;
  /** Additional CSS class */
  className?: string;
  /** Additional inline styles (merged with defaults) */
  style?: CSSProperties;
  /** Render prop for full customization */
  children?: (props: NewBadgeRenderProps) => ReactNode;
}

const baseStyles: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "inherit",
};

const pillStyles: CSSProperties = {
  ...baseStyles,
  padding: "2px 6px",
  borderRadius: "9999px",
  fontSize: "var(--featuredrop-font-size, 10px)",
  fontWeight: 700,
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
  lineHeight: 1,
  color: "var(--featuredrop-color, #b45309)",
  backgroundColor: "var(--featuredrop-bg, rgba(245, 158, 11, 0.15))",
};

const dotStyles: CSSProperties = {
  ...baseStyles,
  width: "var(--featuredrop-dot-size, 8px)",
  height: "var(--featuredrop-dot-size, 8px)",
  borderRadius: "9999px",
  backgroundColor: "var(--featuredrop-color, #f59e0b)",
  boxShadow: "0 0 6px var(--featuredrop-glow, rgba(245, 158, 11, 0.6))",
  animation: "featuredrop-pulse 2s ease-in-out infinite",
};

const countStyles: CSSProperties = {
  ...baseStyles,
  minWidth: "var(--featuredrop-count-size, 18px)",
  height: "var(--featuredrop-count-size, 18px)",
  padding: "0 4px",
  borderRadius: "9999px",
  fontSize: "var(--featuredrop-font-size, 11px)",
  fontWeight: 700,
  lineHeight: 1,
  color: "var(--featuredrop-count-color, white)",
  backgroundColor: "var(--featuredrop-count-bg, #f59e0b)",
};

/**
 * Headless "New" badge component.
 *
 * Styled via CSS custom properties — zero CSS framework dependency:
 * - `--featuredrop-color` — text/dot color
 * - `--featuredrop-bg` — pill background
 * - `--featuredrop-font-size` — font size
 * - `--featuredrop-dot-size` — dot diameter
 * - `--featuredrop-glow` — dot glow color
 * - `--featuredrop-count-size` — count badge size
 * - `--featuredrop-count-color` — count text color
 * - `--featuredrop-count-bg` — count background
 *
 * Use `data-featuredrop` attribute for CSS selector styling.
 */
export function NewBadge({
  variant = "pill",
  show = true,
  count,
  label = "New",
  onDismiss,
  dismissOnClick = false,
  className,
  style,
  children,
}: NewBadgeProps) {
  // Render prop mode
  if (children) {
    return <>{children({ isNew: show })}</>;
  }

  if (!show) return null;

  const handleClick = dismissOnClick && onDismiss ? onDismiss : undefined;
  const reduceMotion =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const variantStyles =
    variant === "dot"
      ? {
          ...dotStyles,
          animation: reduceMotion ? "none" : dotStyles.animation,
        }
      : variant === "count"
        ? countStyles
        : pillStyles;

  const content =
    variant === "dot"
      ? null
      : variant === "count"
        ? (count ?? 0)
        : label;

  const ariaLabel =
    variant === "count"
      ? `${count ?? 0} new features`
      : "New feature";

  return (
    <span
      data-featuredrop={variant}
      className={className}
      style={{ ...variantStyles, ...style }}
      onClick={handleClick}
      role={dismissOnClick ? "button" : undefined}
      tabIndex={dismissOnClick ? 0 : undefined}
      onKeyDown={
        dismissOnClick && onDismiss
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onDismiss();
              }
            }
          : undefined
      }
      aria-label={ariaLabel}
      aria-live={variant === "count" ? "polite" : undefined}
      aria-atomic={variant === "count" ? true : undefined}
    >
      {content}
    </span>
  );
}
