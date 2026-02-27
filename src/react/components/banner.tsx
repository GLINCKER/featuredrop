import { useState, useCallback, type ReactNode, type CSSProperties } from "react";
import type { FeatureEntry, AnalyticsCallbacks } from "../../types";
import { useFeatureDrop } from "../hooks/use-feature-drop";
import { parseDescription } from "../../markdown";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type BannerVariant = "info" | "success" | "warning" | "announcement";

export interface BannerRenderProps {
  /** The feature being announced */
  feature: FeatureEntry | undefined;
  /** Whether the banner is active */
  isActive: boolean;
  /** Whether the banner has been dismissed this session */
  isDismissed: boolean;
  /** Dismiss the banner permanently */
  dismiss: () => void;
}

export interface BannerProps {
  /** Feature ID to display as a banner */
  featureId: string;
  /** Banner visual variant. Default: "announcement" */
  variant?: BannerVariant;
  /** Whether the banner is dismissible. Default: true */
  dismissible?: boolean;
  /** Position mode. Default: "sticky" */
  position?: "sticky" | "inline" | "fixed";
  /** Analytics callbacks */
  analytics?: AnalyticsCallbacks;
  /** Additional CSS class */
  className?: string;
  /** Additional inline styles */
  style?: CSSProperties;
  /** Render prop for full customization */
  children?: (props: BannerRenderProps) => ReactNode;
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const VARIANT_STYLES: Record<BannerVariant, { bg: string; border: string; color: string; icon: string }> = {
  info: {
    bg: "var(--featuredrop-banner-info-bg, #eff6ff)",
    border: "var(--featuredrop-banner-info-border, #bfdbfe)",
    color: "var(--featuredrop-banner-info-color, #1e40af)",
    icon: "\u2139\uFE0F",
  },
  success: {
    bg: "var(--featuredrop-banner-success-bg, #f0fdf4)",
    border: "var(--featuredrop-banner-success-border, #bbf7d0)",
    color: "var(--featuredrop-banner-success-color, #166534)",
    icon: "\u2705",
  },
  warning: {
    bg: "var(--featuredrop-banner-warning-bg, #fffbeb)",
    border: "var(--featuredrop-banner-warning-border, #fde68a)",
    color: "var(--featuredrop-banner-warning-color, #92400e)",
    icon: "\u26A0\uFE0F",
  },
  announcement: {
    bg: "var(--featuredrop-banner-announce-bg, #faf5ff)",
    border: "var(--featuredrop-banner-announce-border, #e9d5ff)",
    color: "var(--featuredrop-banner-announce-color, #6b21a8)",
    icon: "\uD83C\uDF89",
  },
};

const baseBannerStyles: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "12px",
  padding: "var(--featuredrop-banner-padding, 10px 16px)",
  fontFamily: "var(--featuredrop-font-family, inherit)",
  fontSize: "var(--featuredrop-banner-font-size, 14px)",
  lineHeight: 1.5,
  borderBottom: "1px solid",
};

const bannerTextStyles: CSSProperties = {
  flex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
};

const bannerLabelStyles: CSSProperties = {
  fontWeight: 600,
};

const bannerDescStyles: CSSProperties = {
  fontWeight: 400,
  opacity: 0.9,
};

const bannerCtaStyles: CSSProperties = {
  display: "inline-block",
  padding: "4px 12px",
  borderRadius: "var(--featuredrop-banner-cta-radius, 6px)",
  fontSize: "13px",
  fontWeight: 600,
  textDecoration: "none",
  border: "1px solid currentColor",
  opacity: 0.9,
  cursor: "pointer",
  backgroundColor: "transparent",
  color: "inherit",
};

const bannerCloseStyles: CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: "4px",
  fontSize: "16px",
  opacity: 0.6,
  color: "inherit",
  lineHeight: 1,
};

/* ------------------------------------------------------------------ */
/*  Banner Component                                                   */
/* ------------------------------------------------------------------ */

/**
 * Announcement banner for major feature launches or important notices.
 *
 * Shows at the top of the page (sticky/fixed) or inline in content.
 * Auto-expires using the same `showNewUntil` logic as badges.
 * Styled via CSS custom properties for each variant.
 *
 * @example
 * ```tsx
 * <Banner featureId="v2-launch" variant="announcement" />
 * ```
 *
 * @example Headless
 * ```tsx
 * <Banner featureId="v2-launch">
 *   {({ feature, dismiss }) => (
 *     <div>New: {feature?.label} <button onClick={dismiss}>x</button></div>
 *   )}
 * </Banner>
 * ```
 */
export function Banner({
  featureId,
  variant = "announcement",
  dismissible = true,
  position = "sticky",
  analytics,
  className,
  style,
  children,
}: BannerProps) {
  const { newFeatures, dismiss, markFeatureClicked, trackAdoptionEvent } = useFeatureDrop();
  const feature = newFeatures.find((f) => f.id === featureId);
  const [sessionDismissed, setSessionDismissed] = useState(false);

  const isActive = !!feature && !sessionDismissed;

  const handleDismiss = useCallback(() => {
    dismiss(featureId);
    setSessionDismissed(true);
    if (feature) analytics?.onFeatureDismissed?.(feature);
  }, [featureId, dismiss, feature, analytics]);

  const handleCtaClick = useCallback(() => {
    if (!feature) return;
    markFeatureClicked(feature.id);
    trackAdoptionEvent({
      type: "cta_clicked",
      featureId: feature.id,
      metadata: { source: "banner" },
    });
    analytics?.onFeatureClicked?.(feature);
  }, [feature, markFeatureClicked, trackAdoptionEvent, analytics]);

  // Headless render prop
  if (children) {
    return (
      <>
        {children({
          feature,
          isActive,
          isDismissed: sessionDismissed,
          dismiss: handleDismiss,
        })}
      </>
    );
  }

  if (!isActive) return null;

  const variantStyle = VARIANT_STYLES[variant];
  const positionStyles: CSSProperties =
    position === "fixed"
      ? { position: "fixed", top: 0, left: 0, right: 0, zIndex: "var(--featuredrop-z-index, 9999)" as unknown as number }
      : position === "sticky"
        ? { position: "sticky", top: 0, zIndex: "var(--featuredrop-z-index, 9999)" as unknown as number }
        : {};

  const descriptionHtml = feature.description
    ? parseDescription(feature.description)
    : null;

  return (
    <div
      data-featuredrop-banner={variant}
      className={className}
      role="alert"
      style={{
        ...baseBannerStyles,
        ...positionStyles,
        backgroundColor: variantStyle.bg,
        borderColor: variantStyle.border,
        color: variantStyle.color,
        ...style,
      }}
    >
      <div style={bannerTextStyles}>
        <span aria-hidden="true">{variantStyle.icon}</span>
        <span style={bannerLabelStyles}>{feature.label}</span>
        {descriptionHtml && (
          <span
            style={bannerDescStyles}
            dangerouslySetInnerHTML={{ __html: `— ${descriptionHtml}` }}
          />
        )}
        {feature.cta && (
          <a
            href={feature.cta.url}
            style={bannerCtaStyles}
            onClick={handleCtaClick}
            target="_blank"
            rel="noopener noreferrer"
          >
            {feature.cta.label}
          </a>
        )}
      </div>
      {dismissible && (
        <button
          onClick={handleDismiss}
          style={bannerCloseStyles}
          aria-label="Dismiss banner"
        >
          &times;
        </button>
      )}
    </div>
  );
}
