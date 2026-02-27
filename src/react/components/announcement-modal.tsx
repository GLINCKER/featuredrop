import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import type { FeatureCTA, FeatureEntry } from "../../types";
import { parseDescription } from "../../markdown";
import {
  ensureFeatureDropAnimationStyles,
  getAnimationDurationMs,
  getEnterAnimation,
  getExitAnimation,
} from "../../animation";
import { FeatureDropContext } from "../context";

export interface AnnouncementSlide {
  id?: string;
  title: string;
  description?: string;
  image?: string;
  videoUrl?: string;
  primaryCta?: FeatureCTA;
  secondaryCta?: FeatureCTA;
}

export interface AnnouncementModalRenderProps {
  isOpen: boolean;
  currentSlide: AnnouncementSlide | null;
  currentSlideIndex: number;
  totalSlides: number;
  open: () => void;
  close: () => void;
  nextSlide: () => void;
  prevSlide: () => void;
  dismiss: () => void;
}

export interface AnnouncementModalProps {
  id?: string;
  featureId?: string;
  feature?: FeatureEntry;
  trigger?: "auto" | "manual";
  defaultOpen?: boolean;
  slides?: AnnouncementSlide[];
  frequency?: "once" | "every-session" | "always";
  dismissible?: boolean;
  mobileBreakpoint?: number;
  onOpen?: () => void;
  onDismiss?: () => void;
  onPrimaryCtaClick?: (slide: AnnouncementSlide, index: number) => void;
  onSecondaryCtaClick?: (slide: AnnouncementSlide, index: number) => void;
  className?: string;
  style?: CSSProperties;
  children?: (props: AnnouncementModalRenderProps) => ReactNode;
}

const sessionDismissed = new Set<string>();

const overlayStyles: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(17, 24, 39, 0.62)",
  zIndex: "var(--featuredrop-modal-overlay-z-index, 10020)" as unknown as number,
};

const desktopModalStyles: CSSProperties = {
  position: "fixed",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: "min(92vw, 680px)",
  maxHeight: "85vh",
  overflowY: "auto",
  borderRadius: "16px",
  border: "1px solid #e5e7eb",
  background: "#fff",
  boxShadow: "0 24px 80px rgba(0,0,0,0.24)",
  zIndex: "var(--featuredrop-modal-z-index, 10021)" as unknown as number,
};

const mobileModalStyles: CSSProperties = {
  position: "fixed",
  inset: 0,
  borderRadius: 0,
  width: "100vw",
  height: "100vh",
  maxHeight: "100vh",
  overflowY: "auto",
  border: "none",
  background: "#fff",
  zIndex: "var(--featuredrop-modal-z-index, 10021)" as unknown as number,
};

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const nodes = container.querySelectorAll<HTMLElement>(
    [
      "a[href]",
      "button:not([disabled])",
      "textarea:not([disabled])",
      "input:not([disabled])",
      "select:not([disabled])",
      "[tabindex]:not([tabindex='-1'])",
    ].join(","),
  );

  return Array.from(nodes).filter(
    (node) => !node.hasAttribute("disabled") && node.getAttribute("aria-hidden") !== "true",
  );
}

function onceStorageKey(id: string): string {
  return `featuredrop:announcement:${id}:dismissed`;
}

function isDismissedOnce(id: string): boolean {
  const storage = globalThis.localStorage as unknown as {
    getItem?: (key: string) => string | null;
  };
  if (!storage || typeof storage.getItem !== "function") return false;
  try {
    return storage.getItem(onceStorageKey(id)) === "1";
  } catch {
    return false;
  }
}

function setDismissedOnce(id: string): void {
  const storage = globalThis.localStorage as unknown as {
    setItem?: (key: string, value: string) => void;
  };
  if (!storage || typeof storage.setItem !== "function") return;
  try {
    storage.setItem(onceStorageKey(id), "1");
  } catch {
    // noop
  }
}

function toEmbedUrl(videoUrl?: string): string | null {
  if (!videoUrl) return null;
  const trimmed = videoUrl.trim();
  const youtubeMatch =
    trimmed.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{6,})/) ??
    trimmed.match(/youtube\.com\/embed\/([\w-]{6,})/);
  if (youtubeMatch?.[1]) {
    return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
  }
  const vimeoMatch =
    trimmed.match(/vimeo\.com\/(\d{6,})/) ??
    trimmed.match(/player\.vimeo\.com\/video\/(\d{6,})/);
  if (vimeoMatch?.[1]) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }
  return null;
}

function toFeatureSlide(feature?: FeatureEntry): AnnouncementSlide[] {
  if (!feature) return [];
  return [
    {
      id: feature.id,
      title: feature.label,
      description: feature.description,
      image: feature.image,
      primaryCta: feature.cta,
    },
  ];
}

export function AnnouncementModal({
  id,
  featureId,
  feature,
  trigger = "manual",
  defaultOpen = false,
  slides,
  frequency = "once",
  dismissible = true,
  mobileBreakpoint = 768,
  onOpen,
  onDismiss,
  onPrimaryCtaClick,
  onSecondaryCtaClick,
  className,
  style,
  children,
}: AnnouncementModalProps) {
  const context = useContext(FeatureDropContext);
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [isClosing, setIsClosing] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);
  const [blockedByFrequency, setBlockedByFrequency] = useState(false);
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth <= mobileBreakpoint : false,
  );
  const modalRef = useRef<HTMLElement>(null);
  const lastFocusedElementRef = useRef<HTMLElement | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const instanceIdRef = useRef(`featuredrop-announcement-${Math.random().toString(36).slice(2, 10)}`);

  const resolvedFeature = useMemo(() => {
    if (feature) return feature;
    if (!featureId) return undefined;
    return (
      context?.newFeatures.find((item) => item.id === featureId) ??
      context?.manifest.find((item) => item.id === featureId)
    );
  }, [context?.manifest, context?.newFeatures, feature, featureId]);

  const modalId = id ?? resolvedFeature?.id ?? featureId ?? "announcement-modal";
  const titleId = `${instanceIdRef.current}-title`;
  const descriptionId = `${instanceIdRef.current}-description`;
  const resolvedSlides = useMemo(
    () => (slides && slides.length > 0 ? slides : toFeatureSlide(resolvedFeature)),
    [resolvedFeature, slides],
  );

  const currentSlide = resolvedSlides[slideIndex] ?? null;
  const t = context?.translations;
  const enterAnimation = getEnterAnimation(context?.animation ?? "normal", "modal");
  const exitAnimation = getExitAnimation(context?.animation ?? "normal", "modal");

  const open = useCallback(() => {
    if (blockedByFrequency || resolvedSlides.length === 0) return;
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setIsClosing(false);
    if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
      lastFocusedElementRef.current = document.activeElement;
    }
    const priority = resolvedFeature?.priority;
    if (context && !context.canShowModal(priority)) return;
    setSlideIndex((current) =>
      current >= resolvedSlides.length ? resolvedSlides.length - 1 : current,
    );
    setIsOpen(true);
    context?.markModalShown();
    context?.trackAdoptionEvent({
      type: "announcement_shown",
      featureId: resolvedFeature?.id,
      metadata: { modalId },
    });
    onOpen?.();
  }, [blockedByFrequency, context, modalId, onOpen, resolvedFeature?.id, resolvedFeature?.priority, resolvedSlides.length]);

  useEffect(() => {
    if (!defaultOpen) return;
    open();
  }, [defaultOpen, open]);

  const close = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setIsOpen(false);
    const animationPreset = context?.animation ?? "normal";
    const exitDuration = getAnimationDurationMs(animationPreset, "modal", "exit");
    if (exitDuration > 0) {
      setIsClosing(true);
      closeTimerRef.current = setTimeout(() => {
        setIsClosing(false);
        closeTimerRef.current = null;
      }, exitDuration);
    } else {
      setIsClosing(false);
    }
    const returnTarget = lastFocusedElementRef.current;
    if (returnTarget) {
      if (typeof requestAnimationFrame === "function") {
        requestAnimationFrame(() => returnTarget.focus());
      } else {
        returnTarget.focus();
      }
    }
  }, [context?.animation]);

  const dismiss = useCallback(() => {
    setBlockedByFrequency(true);
    close();
    if (frequency === "once") {
      setDismissedOnce(modalId);
    } else if (frequency === "every-session") {
      sessionDismissed.add(modalId);
    }
    onDismiss?.();
  }, [close, frequency, modalId, onDismiss]);

  const nextSlide = useCallback(() => {
    setSlideIndex((current) => {
      if (current >= resolvedSlides.length - 1) {
        dismiss();
        return current;
      }
      return current + 1;
    });
  }, [dismiss, resolvedSlides.length]);

  const prevSlide = useCallback(() => {
    setSlideIndex((current) => (current <= 0 ? 0 : current - 1));
  }, []);

  useEffect(() => {
    if (frequency === "once") {
      setBlockedByFrequency(isDismissedOnce(modalId));
      return;
    }
    if (frequency === "every-session") {
      setBlockedByFrequency(sessionDismissed.has(modalId));
      return;
    }
    setBlockedByFrequency(false);
  }, [frequency, modalId]);

  useEffect(() => {
    if (trigger !== "auto") return;
    if (blockedByFrequency || isOpen || isClosing || resolvedSlides.length === 0) return;
    if (frequency === "once" && isDismissedOnce(modalId)) return;
    if (frequency === "every-session" && sessionDismissed.has(modalId)) return;
    if (resolvedFeature && resolvedFeature.priority !== "critical") return;
    open();
  }, [
    frequency,
    blockedByFrequency,
    isClosing,
    isOpen,
    modalId,
    open,
    resolvedFeature,
    resolvedSlides.length,
    trigger,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const updateViewportMode = () => {
      setIsMobile(window.innerWidth <= mobileBreakpoint);
    };
    updateViewportMode();
    window.addEventListener("resize", updateViewportMode);
    return () => {
      window.removeEventListener("resize", updateViewportMode);
    };
  }, [mobileBreakpoint]);

  useEffect(() => {
    ensureFeatureDropAnimationStyles();
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const modalEl = modalRef.current;
    if (!modalEl) return;

    const focusable = getFocusableElements(modalEl);
    const first = focusable[0] ?? modalEl;
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => first.focus());
    } else {
      first.focus();
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Tab") {
        const items = getFocusableElements(modalEl);
        if (items.length === 0) {
          event.preventDefault();
          modalEl.focus();
          return;
        }

        const firstItem = items[0];
        const lastItem = items[items.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (event.shiftKey) {
          if (active === firstItem || active === modalEl) {
            event.preventDefault();
            lastItem.focus();
          }
          return;
        }
        if (active === lastItem) {
          event.preventDefault();
          firstItem.focus();
        }
        return;
      }

      if (event.key === "Escape" && dismissible) {
        event.preventDefault();
        dismiss();
        return;
      }

      if (event.key === "ArrowRight" && resolvedSlides.length > 1) {
        event.preventDefault();
        nextSlide();
      } else if (event.key === "ArrowLeft" && resolvedSlides.length > 1) {
        event.preventDefault();
        prevSlide();
      }
    };

    modalEl.addEventListener("keydown", handleKeyDown);
    return () => {
      modalEl.removeEventListener("keydown", handleKeyDown);
    };
  }, [dismiss, dismissible, isOpen, nextSlide, prevSlide, resolvedSlides.length]);

  const renderProps: AnnouncementModalRenderProps = {
    isOpen,
    currentSlide,
    currentSlideIndex: slideIndex,
    totalSlides: resolvedSlides.length,
    open,
    close,
    nextSlide,
    prevSlide,
    dismiss,
  };

  if (children) {
    return <>{children(renderProps)}</>;
  }

  if (!(isOpen || isClosing) || !currentSlide) return null;

  const embeddedVideo = toEmbedUrl(currentSlide.videoUrl);
  const descriptionHtml = currentSlide.description
    ? parseDescription(currentSlide.description)
    : null;
  const totalSlides = resolvedSlides.length;
  const primaryCta = currentSlide.primaryCta;
  const secondaryCta = currentSlide.secondaryCta;

  return (
    <>
      <div
        data-featuredrop-announcement-overlay
        style={overlayStyles}
        onClick={dismissible ? dismiss : undefined}
        aria-hidden="true"
      />
      <section
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={currentSlide.description ? descriptionId : undefined}
        data-featuredrop-announcement-modal={modalId}
        className={className}
        dir={context?.direction}
        tabIndex={-1}
        style={{
          ...(isMobile ? mobileModalStyles : desktopModalStyles),
          animation: isClosing ? exitAnimation : enterAnimation,
          ...style,
        }}
      >
        <div style={{ padding: isMobile ? "16px" : "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
            <p style={{ margin: 0, fontSize: "12px", color: "#6b7280", letterSpacing: 0.2 }}>
              {t?.announcement ?? "Announcement"}
            </p>
            {dismissible && (
              <button
                type="button"
                aria-label={t?.close ?? "Close"}
                onClick={dismiss}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "#6b7280",
                  fontSize: "18px",
                  cursor: "pointer",
                  lineHeight: 1,
                }}
              >
                x
              </button>
            )}
          </div>

          {(currentSlide.image || embeddedVideo) && (
            <div style={{ marginTop: "12px", borderRadius: "12px", overflow: "hidden", border: "1px solid #e5e7eb" }}>
              {embeddedVideo ? (
                <iframe
                  title={currentSlide.title}
                  src={embeddedVideo}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{ width: "100%", height: isMobile ? "220px" : "320px", border: 0 }}
                />
              ) : (
                <img
                  src={currentSlide.image}
                  alt={currentSlide.title}
                  style={{ width: "100%", display: "block", objectFit: "cover" }}
                />
              )}
            </div>
          )}

          <h2
            id={titleId}
            style={{ margin: "14px 0 8px", fontSize: isMobile ? "22px" : "24px", lineHeight: 1.2 }}
          >
            {currentSlide.title}
          </h2>
          {descriptionHtml && (
            <div
              id={descriptionId}
              style={{ fontSize: "14px", color: "#4b5563", lineHeight: 1.6 }}
              dangerouslySetInnerHTML={{ __html: descriptionHtml }}
            />
          )}

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "14px" }}>
            {primaryCta && (
              <a
                href={primaryCta.url}
                onClick={() => {
                  context?.trackAdoptionEvent({
                    type: "cta_clicked",
                    featureId: resolvedFeature?.id,
                    metadata: { modalId, slideIndex, cta: "primary" },
                  });
                  onPrimaryCtaClick?.(currentSlide, slideIndex);
                }}
                style={{
                  textDecoration: "none",
                  border: "none",
                  borderRadius: "10px",
                  padding: "9px 12px",
                  background: "#111827",
                  color: "#fff",
                  fontWeight: 600,
                }}
              >
                {primaryCta.label}
              </a>
            )}
            {secondaryCta && (
              <a
                href={secondaryCta.url}
                onClick={() => {
                  context?.trackAdoptionEvent({
                    type: "cta_clicked",
                    featureId: resolvedFeature?.id,
                    metadata: { modalId, slideIndex, cta: "secondary" },
                  });
                  onSecondaryCtaClick?.(currentSlide, slideIndex);
                }}
                style={{
                  textDecoration: "none",
                  border: "1px solid #d1d5db",
                  borderRadius: "10px",
                  padding: "9px 12px",
                  background: "#fff",
                  color: "#111827",
                  fontWeight: 600,
                }}
              >
                {secondaryCta.label}
              </a>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", marginTop: "16px" }}>
            {totalSlides > 1 ? (
              <div style={{ display: "flex", gap: "6px" }}>
                {resolvedSlides.map((slide, index) => (
                  <span
                    key={slide.id ?? `${slide.title}-${index}`}
                    aria-hidden="true"
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "999px",
                      background: index === slideIndex ? "#111827" : "#d1d5db",
                    }}
                  />
                ))}
              </div>
            ) : <span />}
            <div style={{ display: "flex", gap: "8px" }}>
              {totalSlides > 1 && (
                <button
                  type="button"
                  onClick={prevSlide}
                  disabled={slideIndex <= 0}
                  style={{
                    border: "1px solid #d1d5db",
                    background: "#fff",
                    borderRadius: "8px",
                    padding: "6px 10px",
                    cursor: slideIndex <= 0 ? "not-allowed" : "pointer",
                    opacity: slideIndex <= 0 ? 0.5 : 1,
                  }}
                >
                  {t?.back ?? "Back"}
                </button>
              )}
              <button
                type="button"
                onClick={nextSlide}
                style={{
                  border: "none",
                  background: "#111827",
                  color: "#fff",
                  borderRadius: "8px",
                  padding: "6px 10px",
                  cursor: "pointer",
                }}
              >
                {slideIndex >= totalSlides - 1 ? (t?.gotIt ?? "Got it") : (t?.next ?? "Next")}
              </button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
