import {
  useEffect,
  useRef,
  type ReactNode,
  type CSSProperties,
} from "react";
import type { DisplayFormat, FeatureEntry } from "../../types";
import { useSmartFeature } from "../hooks/use-smart-feature";
import { useFeatureDrop } from "../hooks/use-feature-drop";
import { parseDescription } from "../../markdown";
import {
  ensureFeatureDropAnimationStyles,
  getEnterAnimation,
} from "../../animation";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface SmartAnnouncementRenderProps {
  /** Whether the engine recommends showing now */
  show: boolean;
  /** Recommended display format */
  format: DisplayFormat;
  /** Fallback format */
  fallbackFormat: DisplayFormat;
  /** The feature entry */
  feature: FeatureEntry | undefined;
  /** Dismiss callback (tracks in engine + provider) */
  dismiss: () => void;
  /** Engine confidence in the timing decision (0-1) */
  confidence: number;
  /** Reason for the decision */
  reason: string;
}

export interface SmartAnnouncementProps {
  /** Feature ID to display */
  id: string;
  /** Override the engine's format recommendation */
  format?: DisplayFormat;
  /** Additional CSS class for the container */
  className?: string;
  /** Additional inline styles */
  style?: CSSProperties;
  /** Render prop for full customization */
  children?: (props: SmartAnnouncementRenderProps) => ReactNode;
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const badgeStyles: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "2px 6px",
  borderRadius: "9999px",
  fontSize: "var(--featuredrop-font-size, 10px)",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  lineHeight: 1,
  color: "var(--featuredrop-color, #b45309)",
  backgroundColor: "var(--featuredrop-bg, rgba(245, 158, 11, 0.15))",
  fontFamily: "inherit",
};

const toastStyles: CSSProperties = {
  position: "fixed",
  bottom: 16,
  right: 16,
  zIndex: 9999,
  maxWidth: 360,
  padding: "12px 16px",
  borderRadius: "var(--featuredrop-toast-radius, 8px)",
  backgroundColor: "var(--featuredrop-toast-bg, white)",
  color: "var(--featuredrop-toast-color, #1f2937)",
  boxShadow:
    "var(--featuredrop-toast-shadow, 0 4px 12px rgba(0, 0, 0, 0.15))",
  border: "1px solid var(--featuredrop-toast-border, #e5e7eb)",
  fontFamily: "inherit",
  fontSize: 14,
  lineHeight: 1.5,
};

const bannerStyles: CSSProperties = {
  width: "100%",
  padding: "10px 16px",
  backgroundColor: "var(--featuredrop-banner-bg, #eff6ff)",
  borderBottom: "1px solid var(--featuredrop-banner-border, #bfdbfe)",
  color: "var(--featuredrop-banner-color, #1e40af)",
  fontFamily: "inherit",
  fontSize: 14,
  lineHeight: 1.5,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

const inlineStyles: CSSProperties = {
  display: "inline",
  color: "var(--featuredrop-inline-color, #6b7280)",
  fontFamily: "inherit",
  fontSize: 13,
};

const dismissButtonStyles: CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: "4px",
  fontSize: 16,
  lineHeight: 1,
  color: "inherit",
  opacity: 0.6,
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

/**
 * Engine-powered smart announcement component.
 *
 * Combines the TimingOptimizer and FormatSelector to automatically
 * decide WHEN and HOW to show a feature announcement. Zero config needed.
 *
 * Without an engine, renders as a badge (graceful degradation).
 *
 * @example
 * ```tsx
 * // Zero config — engine decides everything
 * <SmartAnnouncement id="dark-mode" />
 *
 * // Override format
 * <SmartAnnouncement id="dark-mode" format="toast" />
 *
 * // Full customization via render prop
 * <SmartAnnouncement id="dark-mode">
 *   {({ show, format, feature, dismiss }) => {
 *     if (!show) return null
 *     return <MyCustomAnnouncement feature={feature} onDismiss={dismiss} />
 *   }}
 * </SmartAnnouncement>
 * ```
 */
export function SmartAnnouncement({
  id,
  format: formatOverride,
  className,
  style,
  children,
}: SmartAnnouncementProps) {
  const smartFeature = useSmartFeature(id);
  const { engine } = useFeatureDrop();
  const hasTrackedSeen = useRef(false);

  const resolvedFormat = formatOverride ?? smartFeature.format;

  useEffect(() => {
    ensureFeatureDropAnimationStyles();
  }, []);

  // Track 'seen' once when showing
  useEffect(() => {
    if (smartFeature.show && !hasTrackedSeen.current) {
      hasTrackedSeen.current = true;
      engine?.trackInteraction(id, "seen");
    }
  }, [smartFeature.show, engine, id]);

  // Render prop mode
  if (children) {
    return (
      <>
        {children({
          show: smartFeature.show,
          format: resolvedFormat,
          fallbackFormat: smartFeature.fallbackFormat,
          feature: smartFeature.feature,
          dismiss: smartFeature.dismiss,
          confidence: smartFeature.confidence,
          reason: smartFeature.reason,
        })}
      </>
    );
  }

  if (!smartFeature.show || !smartFeature.feature) return null;

  const feature = smartFeature.feature;
  const description = parseDescription(feature.description ?? "");

  switch (resolvedFormat) {
    case "badge":
      return (
        <span
          data-featuredrop="smart-badge"
          className={className}
          style={{ ...badgeStyles, ...style }}
          role="status"
          aria-label={`New: ${feature.label}`}
        >
          New
        </span>
      );

    case "toast":
      return (
        <div
          data-featuredrop="smart-toast"
          className={className}
          style={{
            ...toastStyles,
            animation: getEnterAnimation("normal", "toast") ?? undefined,
            ...style,
          }}
          role="alert"
          aria-live="polite"
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 2 }}>
                {feature.label}
              </div>
              <div
                style={{ fontSize: 13, opacity: 0.8 }}
                dangerouslySetInnerHTML={{ __html: description }}
              />
            </div>
            <button
              onClick={smartFeature.dismiss}
              style={dismissButtonStyles}
              aria-label="Dismiss"
              type="button"
            >
              &times;
            </button>
          </div>
        </div>
      );

    case "banner":
      return (
        <div
          data-featuredrop="smart-banner"
          className={className}
          style={{ ...bannerStyles, ...style }}
          role="alert"
        >
          <span>
            <strong>{feature.label}</strong>
            {feature.description ? ` — ${feature.description}` : ""}
          </span>
          <button
            onClick={smartFeature.dismiss}
            style={dismissButtonStyles}
            aria-label="Dismiss"
            type="button"
          >
            &times;
          </button>
        </div>
      );

    case "inline":
      return (
        <span
          data-featuredrop="smart-inline"
          className={className}
          style={{ ...inlineStyles, ...style }}
        >
          {feature.label}
        </span>
      );

    case "modal":
      // Modal requires portal rendering — use render prop for full modal support
      // Default: fall back to toast format for built-in rendering
      return (
        <div
          data-featuredrop="smart-toast"
          className={className}
          style={{
            ...toastStyles,
            animation: getEnterAnimation("normal", "toast") ?? undefined,
            ...style,
          }}
          role="alert"
          aria-live="polite"
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 2 }}>
                {feature.label}
              </div>
              <div
                style={{ fontSize: 13, opacity: 0.8 }}
                dangerouslySetInnerHTML={{ __html: description }}
              />
            </div>
            <button
              onClick={smartFeature.dismiss}
              style={dismissButtonStyles}
              aria-label="Dismiss"
              type="button"
            >
              &times;
            </button>
          </div>
        </div>
      );

    case "spotlight":
      // Spotlight requires a target element — use render prop for spotlight support
      // Default: fall back to badge
      return (
        <span
          data-featuredrop="smart-badge"
          className={className}
          style={{ ...badgeStyles, ...style }}
          role="status"
          aria-label={`New: ${feature.label}`}
        >
          New
        </span>
      );

    default:
      return (
        <span
          data-featuredrop="smart-badge"
          className={className}
          style={{ ...badgeStyles, ...style }}
          role="status"
          aria-label={`New: ${feature.label}`}
        >
          New
        </span>
      );
  }
}
