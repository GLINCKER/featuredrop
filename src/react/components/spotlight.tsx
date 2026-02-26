import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
  type CSSProperties,
  type RefObject,
} from "react";
import type { FeatureEntry, AnalyticsCallbacks } from "../../types";
import { useFeatureDrop } from "../hooks/use-feature-drop";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface SpotlightRenderProps {
  /** The feature being spotlighted */
  feature: FeatureEntry | undefined;
  /** Whether the spotlight is active */
  isActive: boolean;
  /** Whether the tooltip is visible */
  isTooltipOpen: boolean;
  /** Show the tooltip */
  openTooltip: () => void;
  /** Hide the tooltip */
  closeTooltip: () => void;
  /** Dismiss this spotlight permanently */
  dismiss: () => void;
}

export interface SpotlightProps {
  /** The feature ID to spotlight */
  featureId: string;
  /** Ref to the target DOM element — beacon will be positioned over it */
  targetRef?: RefObject<HTMLElement | null>;
  /** CSS selector for the target element (alternative to targetRef) */
  targetSelector?: string;
  /** Tooltip placement relative to target */
  placement?: "top" | "bottom" | "left" | "right";
  /** Beacon size in pixels. Default: 12 */
  beaconSize?: number;
  /** Auto-dismiss after the tooltip is seen */
  autoDismiss?: boolean;
  /** Delay before auto-dismiss in ms. Default: 5000 */
  autoDismissDelay?: number;
  /** Analytics callbacks */
  analytics?: AnalyticsCallbacks;
  /** Additional CSS class */
  className?: string;
  /** Custom tooltip content */
  tooltipContent?: ReactNode;
  /** Render prop for full customization */
  children?: (props: SpotlightRenderProps) => ReactNode;
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const beaconStyles: CSSProperties = {
  position: "absolute",
  borderRadius: "50%",
  backgroundColor: "var(--featuredrop-beacon-color, #f59e0b)",
  cursor: "pointer",
  zIndex: "var(--featuredrop-z-index, 9999)" as unknown as number,
};

const beaconPulseStyles: CSSProperties = {
  position: "absolute",
  inset: "-4px",
  borderRadius: "50%",
  border: "2px solid var(--featuredrop-beacon-color, #f59e0b)",
  opacity: 0.6,
  animation: "featuredrop-spotlight-pulse 2s ease-in-out infinite",
};

const tooltipStyles: CSSProperties = {
  position: "absolute",
  padding: "var(--featuredrop-tooltip-padding, 12px 16px)",
  backgroundColor: "var(--featuredrop-tooltip-bg, #ffffff)",
  borderRadius: "var(--featuredrop-tooltip-radius, 8px)",
  boxShadow: "var(--featuredrop-tooltip-shadow, 0 4px 20px rgba(0, 0, 0, 0.12))",
  maxWidth: "var(--featuredrop-tooltip-max-width, 260px)",
  zIndex: "var(--featuredrop-z-index, 10000)" as unknown as number,
  fontFamily: "var(--featuredrop-font-family, inherit)",
};

const tooltipTitleStyles: CSSProperties = {
  margin: "0 0 4px",
  fontSize: "var(--featuredrop-tooltip-title-size, 14px)",
  fontWeight: 600,
  color: "var(--featuredrop-tooltip-title-color, #111827)",
};

const tooltipDescStyles: CSSProperties = {
  margin: 0,
  fontSize: "var(--featuredrop-tooltip-desc-size, 13px)",
  color: "var(--featuredrop-tooltip-desc-color, #6b7280)",
  lineHeight: 1.5,
};

const tooltipDismissStyles: CSSProperties = {
  display: "inline-block",
  marginTop: "8px",
  padding: "4px 10px",
  border: "none",
  borderRadius: "4px",
  fontSize: "12px",
  fontWeight: 600,
  cursor: "pointer",
  backgroundColor: "var(--featuredrop-tooltip-dismiss-bg, #f3f4f6)",
  color: "var(--featuredrop-tooltip-dismiss-color, #374151)",
};

/* ------------------------------------------------------------------ */
/*  CSS keyframes injection                                            */
/* ------------------------------------------------------------------ */

let injectedKeyframes = false;
function injectKeyframes() {
  if (injectedKeyframes || typeof document === "undefined") return;
  injectedKeyframes = true;
  const style = document.createElement("style");
  style.textContent = `
    @keyframes featuredrop-spotlight-pulse {
      0%, 100% { transform: scale(1); opacity: 0.6; }
      50% { transform: scale(1.6); opacity: 0; }
    }
    @keyframes featuredrop-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  `;
  document.head.appendChild(style);
}

/* ------------------------------------------------------------------ */
/*  Spotlight Component                                                */
/* ------------------------------------------------------------------ */

/**
 * Pulsing beacon that attaches to any DOM element to highlight a new feature.
 *
 * Clicking the beacon reveals a tooltip with feature info.
 * After dismissal, the beacon disappears permanently for this user.
 *
 * @example
 * ```tsx
 * const ref = useRef<HTMLButtonElement>(null);
 * <button ref={ref}>Analytics</button>
 * <Spotlight featureId="analytics-v2" targetRef={ref} />
 * ```
 *
 * @example With CSS selector
 * ```tsx
 * <Spotlight featureId="analytics-v2" targetSelector="#analytics-btn" />
 * ```
 */
export function Spotlight({
  featureId,
  targetRef,
  targetSelector,
  placement = "top",
  beaconSize = 12,
  autoDismiss = false,
  autoDismissDelay = 5000,
  analytics,
  className,
  tooltipContent,
  children,
}: SpotlightProps) {
  const { newFeatures, dismiss } = useFeatureDrop();
  const feature = newFeatures.find((f) => f.id === featureId);
  const [isTooltipOpen, setTooltipOpen] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isActive = !!feature;

  useEffect(() => {
    injectKeyframes();
  }, []);

  // Track target position
  useEffect(() => {
    if (!isActive) return;

    const getTarget = (): HTMLElement | null => {
      if (targetRef?.current) return targetRef.current;
      if (targetSelector) return document.querySelector(targetSelector);
      return null;
    };

    const update = () => {
      const el = getTarget();
      if (el) setTargetRect(el.getBoundingClientRect());
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [isActive, targetRef, targetSelector]);

  const openTooltip = useCallback(() => {
    setTooltipOpen(true);
    if (feature) analytics?.onFeatureSeen?.(feature);
    if (autoDismiss) {
      timerRef.current = setTimeout(() => {
        dismiss(featureId);
        if (feature) analytics?.onFeatureDismissed?.(feature);
      }, autoDismissDelay);
    }
  }, [feature, featureId, autoDismiss, autoDismissDelay, dismiss, analytics]);

  const closeTooltip = useCallback(() => {
    setTooltipOpen(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleDismiss = useCallback(() => {
    dismiss(featureId);
    setTooltipOpen(false);
    if (feature) analytics?.onFeatureDismissed?.(feature);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, [featureId, dismiss, feature, analytics]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Render prop mode
  if (children) {
    return (
      <>
        {children({
          feature,
          isActive,
          isTooltipOpen,
          openTooltip,
          closeTooltip,
          dismiss: handleDismiss,
        })}
      </>
    );
  }

  if (!isActive || !targetRect) return null;

  // Compute beacon position
  const beaconLeft = targetRect.right - beaconSize / 2;
  const beaconTop = targetRect.top - beaconSize / 2;

  // Tooltip offset from beacon
  const tooltipOffset = 12;
  const tooltipPosition: CSSProperties = (() => {
    switch (placement) {
      case "bottom":
        return { top: targetRect.bottom + tooltipOffset, left: targetRect.left };
      case "left":
        return { top: targetRect.top, right: `calc(100vw - ${targetRect.left - tooltipOffset}px)` };
      case "right":
        return { top: targetRect.top, left: targetRect.right + tooltipOffset };
      case "top":
      default:
        return { bottom: `calc(100vh - ${targetRect.top - tooltipOffset}px)`, left: targetRect.left };
    }
  })();

  return (
    <>
      {/* Beacon */}
      <div
        data-featuredrop-spotlight={featureId}
        className={className}
        style={{
          ...beaconStyles,
          position: "fixed",
          left: beaconLeft,
          top: beaconTop,
          width: beaconSize,
          height: beaconSize,
        }}
        onClick={isTooltipOpen ? closeTooltip : openTooltip}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            isTooltipOpen ? closeTooltip() : openTooltip();
          }
        }}
        aria-label={`New: ${feature.label}`}
      >
        <span style={beaconPulseStyles} />
      </div>

      {/* Tooltip */}
      {isTooltipOpen && (
        <div
          style={{ ...tooltipStyles, position: "fixed", ...tooltipPosition }}
          data-featuredrop-tooltip
        >
          {tooltipContent ?? (
            <>
              <p style={tooltipTitleStyles}>{feature.label}</p>
              {feature.description && (
                <p style={tooltipDescStyles}>{feature.description}</p>
              )}
              <button
                onClick={handleDismiss}
                style={tooltipDismissStyles}
              >
                Got it
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}
