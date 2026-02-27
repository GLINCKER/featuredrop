import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
  type CSSProperties,
} from "react";
import type { FeatureEntry, AnalyticsCallbacks } from "../../types";
import { useFeatureDrop } from "../hooks/use-feature-drop";
import { parseDescription } from "../../markdown";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ToastRenderProps {
  /** Features currently showing as toasts */
  toasts: FeatureEntry[];
  /** Dismiss a specific toast */
  dismiss: (id: string) => void;
  /** Dismiss all toasts */
  dismissAll: () => void;
}

export interface ToastProps {
  /** Feature IDs to show as toasts. If omitted, shows all new features. */
  featureIds?: string[];
  /** Max number of visible toasts at once. Default: 3 */
  maxVisible?: number;
  /** Auto-dismiss delay in ms. Default: 8000. Set to 0 to disable. */
  autoDismissMs?: number;
  /** Position on screen. Default: "bottom-right" */
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left" | "top-center" | "bottom-center";
  /** Analytics callbacks */
  analytics?: AnalyticsCallbacks;
  /** Additional CSS class for the container */
  className?: string;
  /** Additional inline styles for the container */
  style?: CSSProperties;
  /** Render prop for full customization */
  children?: (props: ToastRenderProps) => ReactNode;
  /** Custom render for each toast */
  renderToast?: (props: { feature: FeatureEntry; dismiss: () => void }) => ReactNode;
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const POSITION_STYLES: Record<string, CSSProperties> = {
  "top-right": { top: 16, right: 16 },
  "top-left": { top: 16, left: 16 },
  "bottom-right": { bottom: 16, right: 16 },
  "bottom-left": { bottom: 16, left: 16 },
  "top-center": { top: 16, left: "50%", transform: "translateX(-50%)" },
  "bottom-center": { bottom: 16, left: "50%", transform: "translateX(-50%)" },
};

const containerStyles: CSSProperties = {
  position: "fixed",
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  zIndex: "var(--featuredrop-toast-z-index, 10000)" as unknown as number,
  pointerEvents: "none",
};

const toastStyles: CSSProperties = {
  pointerEvents: "auto",
  display: "flex",
  alignItems: "flex-start",
  gap: "12px",
  padding: "var(--featuredrop-toast-padding, 12px 16px)",
  backgroundColor: "var(--featuredrop-toast-bg, #ffffff)",
  borderRadius: "var(--featuredrop-toast-radius, 10px)",
  boxShadow: "var(--featuredrop-toast-shadow, 0 4px 20px rgba(0, 0, 0, 0.12))",
  border: "1px solid var(--featuredrop-toast-border, #e5e7eb)",
  width: "var(--featuredrop-toast-width, 340px)",
  maxWidth: "calc(100vw - 32px)",
  fontFamily: "var(--featuredrop-font-family, inherit)",
  animation: "featuredrop-toast-enter 0.3s ease-out",
};

const toastBodyStyles: CSSProperties = {
  flex: 1,
  minWidth: 0,
};

const toastTitleStyles: CSSProperties = {
  margin: "0 0 2px",
  fontSize: "var(--featuredrop-toast-title-size, 14px)",
  fontWeight: 600,
  color: "var(--featuredrop-toast-title-color, #111827)",
};

const toastDescStyles: CSSProperties = {
  margin: 0,
  fontSize: "var(--featuredrop-toast-desc-size, 13px)",
  color: "var(--featuredrop-toast-desc-color, #6b7280)",
  lineHeight: 1.4,
  overflow: "hidden",
  textOverflow: "ellipsis",
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical" as const,
};

const toastCloseStyles: CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: "2px",
  fontSize: "16px",
  color: "var(--featuredrop-toast-close-color, #9ca3af)",
  lineHeight: 1,
  flexShrink: 0,
};

const toastCtaStyles: CSSProperties = {
  display: "inline-block",
  marginTop: "6px",
  fontSize: "13px",
  fontWeight: 600,
  color: "var(--featuredrop-toast-cta-color, #3b82f6)",
  textDecoration: "none",
};

const TYPE_INDICATORS: Record<string, { color: string; icon: string }> = {
  feature: { color: "#10b981", icon: "\u2728" },
  improvement: { color: "#3b82f6", icon: "\uD83D\uDCC8" },
  fix: { color: "#f59e0b", icon: "\uD83D\uDD27" },
  breaking: { color: "#ef4444", icon: "\u26A0\uFE0F" },
};

/* ------------------------------------------------------------------ */
/*  Keyframes                                                          */
/* ------------------------------------------------------------------ */

let injectedToastKeyframes = false;
function injectToastKeyframes() {
  if (injectedToastKeyframes || typeof document === "undefined") return;
  injectedToastKeyframes = true;
  const style = document.createElement("style");
  style.textContent = `
    @keyframes featuredrop-toast-enter {
      from { opacity: 0; transform: translateY(8px) scale(0.96); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
  `;
  document.head.appendChild(style);
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/* ------------------------------------------------------------------ */
/*  Toast Component                                                    */
/* ------------------------------------------------------------------ */

/**
 * Toast notification component for feature announcements.
 *
 * Shows brief popups for new features. Auto-dismisses after a timeout.
 * Stacks multiple toasts with configurable max visible count.
 *
 * @example
 * ```tsx
 * <Toast position="bottom-right" maxVisible={3} />
 * ```
 *
 * @example Specific features
 * ```tsx
 * <Toast featureIds={["ai-journal", "analytics-v2"]} />
 * ```
 *
 * @example Headless
 * ```tsx
 * <Toast>
 *   {({ toasts, dismiss }) => toasts.map(t => (
 *     <div key={t.id}>{t.label} <button onClick={() => dismiss(t.id)}>x</button></div>
 *   ))}
 * </Toast>
 * ```
 */
export function Toast({
  featureIds,
  maxVisible = 3,
  autoDismissMs = 8000,
  position = "bottom-right",
  analytics,
  className,
  style,
  children,
  renderToast,
}: ToastProps) {
  const {
    newFeaturesSorted,
    dismiss,
    markFeatureSeen,
    markFeatureClicked,
    trackAdoptionEvent,
    getRemainingToastSlots,
    markToastsShown,
  } = useFeatureDrop();
  const [localDismissed, setLocalDismissed] = useState<Set<string>>(new Set());
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const shownIdsRef = useRef(new Set<string>());
  const reduceMotion = useMemo(() => prefersReducedMotion(), []);

  useEffect(() => {
    injectToastKeyframes();
  }, []);

  // Filter features for toasting
  const toastFeatures = newFeaturesSorted.filter((f) => {
    if (localDismissed.has(f.id)) return false;
    if (featureIds && !featureIds.includes(f.id)) return false;
    return true;
  });

  const remainingSlots = getRemainingToastSlots();
  const baseVisible = toastFeatures.slice(0, maxVisible);
  const visibleToasts = useMemo(() => {
    if (!Number.isFinite(remainingSlots)) return baseVisible;
    let newlyAllowed = 0;
    const limit = Math.max(0, remainingSlots);
    return baseVisible.filter((feature) => {
      if (shownIdsRef.current.has(feature.id)) return true;
      if (newlyAllowed >= limit) return false;
      newlyAllowed += 1;
      return true;
    });
  }, [baseVisible, remainingSlots]);

  const handleDismiss = useCallback(
    (id: string) => {
      setLocalDismissed((prev) => new Set(prev).add(id));
      dismiss(id);
      const feature = newFeaturesSorted.find((f) => f.id === id);
      if (feature) analytics?.onFeatureDismissed?.(feature);
      const timer = timersRef.current.get(id);
      if (timer) {
        clearTimeout(timer);
        timersRef.current.delete(id);
      }
    },
    [dismiss, newFeaturesSorted, analytics],
  );

  const handleDismissAllLocal = useCallback(() => {
    for (const f of visibleToasts) {
      handleDismiss(f.id);
    }
  }, [visibleToasts, handleDismiss]);

  // Auto-dismiss timers
  useEffect(() => {
    if (autoDismissMs <= 0) return;
    for (const f of visibleToasts) {
      if (!timersRef.current.has(f.id)) {
        timersRef.current.set(
          f.id,
          setTimeout(() => handleDismiss(f.id), autoDismissMs),
        );
      }
    }
  }, [visibleToasts, autoDismissMs, handleDismiss]);

  // Fire onFeatureSeen for visible toasts
  useEffect(() => {
    const newlyShownIds: string[] = [];
    for (const feature of visibleToasts) {
      if (shownIdsRef.current.has(feature.id)) continue;
      shownIdsRef.current.add(feature.id);
      newlyShownIds.push(feature.id);
      markFeatureSeen(feature.id);
      analytics?.onFeatureSeen?.(feature);
    }
    markToastsShown(newlyShownIds);
  }, [visibleToasts, analytics, markFeatureSeen, markToastsShown]);

  // Cleanup timers
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
    };
  }, []);

  // Headless render prop
  if (children) {
    return (
      <>
        {children({
          toasts: visibleToasts,
          dismiss: handleDismiss,
          dismissAll: handleDismissAllLocal,
        })}
      </>
    );
  }

  if (visibleToasts.length === 0) return null;

  const posStyles = POSITION_STYLES[position] ?? POSITION_STYLES["bottom-right"];
  const isBottom = position.startsWith("bottom");

  return (
    <div
      data-featuredrop-toast-container
      className={className}
      role="region"
      aria-label="Feature announcements"
      aria-live="polite"
      aria-atomic="false"
      style={{
        ...containerStyles,
        ...posStyles,
        flexDirection: isBottom ? "column-reverse" : "column",
        ...style,
      }}
    >
      {visibleToasts.map((feature) => {
        if (renderToast) {
          return (
            <div key={feature.id}>
              {renderToast({ feature, dismiss: () => handleDismiss(feature.id) })}
            </div>
          );
        }

        const indicator = feature.type
          ? TYPE_INDICATORS[feature.type] ?? TYPE_INDICATORS.feature
          : null;

        const descriptionHtml = feature.description
          ? parseDescription(feature.description)
          : null;

        return (
          <div
            key={feature.id}
            data-featuredrop-toast={feature.id}
            style={{
              ...toastStyles,
              animation: reduceMotion ? "none" : toastStyles.animation,
            }}
            role="status"
          >
            {indicator && (
              <span style={{ fontSize: "20px", lineHeight: 1 }} aria-hidden="true">
                {indicator.icon}
              </span>
            )}
            <div style={toastBodyStyles}>
              <p style={toastTitleStyles}>{feature.label}</p>
              {descriptionHtml && (
                <div
                  style={toastDescStyles}
                  dangerouslySetInnerHTML={{ __html: descriptionHtml }}
                />
              )}
              {feature.cta && (
                <a
                  href={feature.cta.url}
                  style={toastCtaStyles}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    markFeatureClicked(feature.id);
                    trackAdoptionEvent({
                      type: "cta_clicked",
                      featureId: feature.id,
                      metadata: { source: "toast" },
                    });
                    analytics?.onFeatureClicked?.(feature);
                  }}
                >
                  {feature.cta.label} &rarr;
                </a>
              )}
            </div>
            <button
              onClick={() => handleDismiss(feature.id)}
              style={toastCloseStyles}
              aria-label={`Dismiss ${feature.label}`}
            >
              &times;
            </button>
          </div>
        );
      })}
    </div>
  );
}
