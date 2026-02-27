import {
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
  type CSSProperties,
  useMemo,
} from "react";
import { parseDescription } from "../../markdown";
import { formatDateForLocale, formatRelativeTimeForLocale } from "../../i18n";
import {
  ensureFeatureDropAnimationStyles,
  getAnimationDurationMs,
  getEnterAnimation,
  getExitAnimation,
} from "../../animation";
import type { FeatureDropThemeInput } from "../../theme";
import type { FeatureEntry, AnalyticsCallbacks } from "../../types";
import { useFeatureDrop } from "../hooks/use-feature-drop";
import { useThemeVariables } from "../theme";
import {
  DEFAULT_REACTIONS,
  getReactionCounts,
  getUserReaction,
  reactToEntry,
  type ReactionCounts,
} from "../reactions-store";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ChangelogEntryRenderProps {
  feature: FeatureEntry;
  dismiss: () => void;
  onFeatureClick?: () => void;
  reactions?: ReactionCounts;
  userReaction?: string | null;
  canReact?: boolean;
  react?: (reaction: string) => void;
}

export interface ChangelogWidgetRenderProps {
  /** Whether the widget is currently open */
  isOpen: boolean;
  /** Open the widget */
  open: () => void;
  /** Close the widget */
  close: () => void;
  /** Toggle open/close */
  toggle: () => void;
  /** Current new feature count */
  count: number;
  /** Sorted features to display */
  features: FeatureEntry[];
  /** Dismiss a single feature */
  dismiss: (id: string) => void;
  /** Dismiss all features */
  dismissAll: () => Promise<void>;
}

export interface ChangelogWidgetProps {
  /** Display variant */
  variant?: "panel" | "modal" | "popover";
  /** Title shown in the widget header. Default: "What's New" */
  title?: string;
  /** Text for the trigger button. Default: "What's New" */
  triggerLabel?: string;
  /** Show trigger badge count. Default: true */
  showCount?: boolean;
  /** Text for the "mark all as read" button. Default: "Mark all as read" */
  markAllLabel?: string;
  /** Whether to show the mark-all button. Default: true */
  showMarkAll?: boolean;
  /** Text shown when no new features exist. Default: "You're all caught up!" */
  emptyLabel?: string;
  /** Max height for the feed area. Default: "400px" */
  maxHeight?: string;
  /** Date display mode for entry metadata. Default: "absolute" */
  dateFormat?: "absolute" | "relative";
  /** Analytics callbacks */
  analytics?: AnalyticsCallbacks;
  /** Additional CSS class for the container */
  className?: string;
  /** Additional inline styles for the container */
  style?: CSSProperties;
  /** Optional component-scoped theme preset or overrides */
  theme?: FeatureDropThemeInput;
  /** Render prop for full customization — receives widget state */
  children?: (props: ChangelogWidgetRenderProps) => ReactNode;
  /** Custom render for each entry — receives feature + dismiss callback */
  renderEntry?: (props: ChangelogEntryRenderProps) => ReactNode;
  /** Custom render for the trigger button */
  renderTrigger?: (props: { count: number; onClick: () => void }) => ReactNode;
  /** Show reaction controls on each entry. Default: false */
  showReactions?: boolean;
  /** Reaction options. Default: 👍 ❤️ 🎉 👀 👎 */
  reactions?: string[];
  /** Callback fired when a reaction is persisted */
  onReaction?: (feature: FeatureEntry, reaction: string, counts: ReactionCounts) => void;
}

/* ------------------------------------------------------------------ */
/*  Default Styles (CSS custom properties)                             */
/* ------------------------------------------------------------------ */

const overlayStyles: CSSProperties = {
  position: "fixed",
  inset: 0,
  backgroundColor: "var(--featuredrop-overlay-bg, rgba(0, 0, 0, 0.4))",
  zIndex: "var(--featuredrop-z-index, 9998)" as unknown as number,
};

const panelContainerStyles: CSSProperties = {
  position: "fixed",
  top: 0,
  right: 0,
  bottom: 0,
  width: "var(--featuredrop-panel-width, 380px)",
  maxWidth: "100vw",
  backgroundColor: "var(--featuredrop-widget-bg, #ffffff)",
  boxShadow: "var(--featuredrop-widget-shadow, -4px 0 24px rgba(0, 0, 0, 0.12))",
  zIndex: "var(--featuredrop-z-index, 9999)" as unknown as number,
  display: "flex",
  flexDirection: "column",
  fontFamily: "var(--featuredrop-font-family, inherit)",
};

const modalContainerStyles: CSSProperties = {
  position: "fixed",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: "var(--featuredrop-modal-width, 480px)",
  maxWidth: "90vw",
  maxHeight: "80vh",
  backgroundColor: "var(--featuredrop-widget-bg, #ffffff)",
  borderRadius: "var(--featuredrop-widget-radius, 12px)",
  boxShadow: "var(--featuredrop-widget-shadow, 0 20px 60px rgba(0, 0, 0, 0.15))",
  zIndex: "var(--featuredrop-z-index, 9999)" as unknown as number,
  display: "flex",
  flexDirection: "column",
  fontFamily: "var(--featuredrop-font-family, inherit)",
};

const popoverContainerStyles: CSSProperties = {
  position: "absolute",
  top: "100%",
  right: 0,
  marginTop: "8px",
  width: "var(--featuredrop-popover-width, 340px)",
  maxWidth: "90vw",
  backgroundColor: "var(--featuredrop-widget-bg, #ffffff)",
  borderRadius: "var(--featuredrop-widget-radius, 12px)",
  boxShadow: "var(--featuredrop-widget-shadow, 0 8px 30px rgba(0, 0, 0, 0.12))",
  zIndex: "var(--featuredrop-z-index, 9999)" as unknown as number,
  display: "flex",
  flexDirection: "column",
  fontFamily: "var(--featuredrop-font-family, inherit)",
};

const headerStyles: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "var(--featuredrop-widget-padding, 16px)",
  borderBottom: "1px solid var(--featuredrop-border-color, #e5e7eb)",
};

const titleStyles: CSSProperties = {
  margin: 0,
  fontSize: "var(--featuredrop-title-size, 16px)",
  fontWeight: 600,
  color: "var(--featuredrop-title-color, #111827)",
};

const closeButtonStyles: CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: "4px",
  fontSize: "18px",
  color: "var(--featuredrop-close-color, #6b7280)",
  lineHeight: 1,
};

const feedStyles: CSSProperties = {
  flex: 1,
  overflowY: "auto",
  padding: "var(--featuredrop-widget-padding, 16px)",
};

const entryStyles: CSSProperties = {
  padding: "12px 0",
  borderBottom: "1px solid var(--featuredrop-border-color, #e5e7eb)",
};

const entryTitleStyles: CSSProperties = {
  fontSize: "var(--featuredrop-entry-title-size, 14px)",
  fontWeight: 600,
  color: "var(--featuredrop-entry-title-color, #111827)",
  margin: "0 0 4px",
};

const entryDescriptionStyles: CSSProperties = {
  fontSize: "var(--featuredrop-entry-desc-size, 13px)",
  color: "var(--featuredrop-entry-desc-color, #6b7280)",
  margin: "0 0 6px",
  lineHeight: 1.5,
};

const entryMetaStyles: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  fontSize: "12px",
  color: "var(--featuredrop-entry-meta-color, #9ca3af)",
};

const typeTagStyles: CSSProperties = {
  display: "inline-block",
  padding: "1px 6px",
  borderRadius: "4px",
  fontSize: "11px",
  fontWeight: 600,
  textTransform: "uppercase" as const,
};

const ctaButtonStyles: CSSProperties = {
  display: "inline-block",
  marginTop: "8px",
  padding: "6px 12px",
  borderRadius: "var(--featuredrop-cta-radius, 6px)",
  fontSize: "13px",
  fontWeight: 600,
  color: "var(--featuredrop-cta-color, #ffffff)",
  backgroundColor: "var(--featuredrop-cta-bg, #3b82f6)",
  textDecoration: "none",
  border: "none",
  cursor: "pointer",
};

const footerStyles: CSSProperties = {
  padding: "var(--featuredrop-widget-padding, 16px)",
  borderTop: "1px solid var(--featuredrop-border-color, #e5e7eb)",
  textAlign: "center",
};

const markAllButtonStyles: CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  fontSize: "13px",
  fontWeight: 600,
  color: "var(--featuredrop-mark-all-color, #3b82f6)",
  padding: "4px 8px",
};

const triggerButtonStyles: CSSProperties = {
  position: "relative",
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  padding: "8px 14px",
  border: "1px solid var(--featuredrop-trigger-border, #d1d5db)",
  borderRadius: "var(--featuredrop-trigger-radius, 8px)",
  backgroundColor: "var(--featuredrop-trigger-bg, #ffffff)",
  color: "var(--featuredrop-trigger-color, #374151)",
  fontSize: "14px",
  fontWeight: 500,
  cursor: "pointer",
  fontFamily: "inherit",
};

const triggerBadgeStyles: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: "18px",
  height: "18px",
  padding: "0 4px",
  borderRadius: "9999px",
  fontSize: "11px",
  fontWeight: 700,
  color: "var(--featuredrop-badge-color, white)",
  backgroundColor: "var(--featuredrop-badge-bg, #f59e0b)",
};

const emptyStyles: CSSProperties = {
  padding: "32px 16px",
  textAlign: "center",
  fontSize: "14px",
  color: "var(--featuredrop-empty-color, #9ca3af)",
};

const reactionsRowStyles: CSSProperties = {
  display: "flex",
  gap: "6px",
  flexWrap: "wrap",
  marginTop: "8px",
};

const reactionButtonStyles: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  border: "1px solid var(--featuredrop-border-color, #e5e7eb)",
  borderRadius: "999px",
  background: "#fff",
  padding: "3px 8px",
  fontSize: "12px",
  cursor: "pointer",
};

const srOnlyStyles: CSSProperties = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: 0,
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const TYPE_COLORS: Record<string, { color: string; bg: string }> = {
  feature: { color: "#065f46", bg: "rgba(16, 185, 129, 0.15)" },
  improvement: { color: "#1e40af", bg: "rgba(59, 130, 246, 0.15)" },
  fix: { color: "#92400e", bg: "rgba(245, 158, 11, 0.15)" },
  breaking: { color: "#991b1b", bg: "rgba(239, 68, 68, 0.15)" },
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

/* ------------------------------------------------------------------ */
/*  Default Entry Renderer                                             */
/* ------------------------------------------------------------------ */

function DefaultEntry({
  feature,
  dismiss,
  onFeatureClick,
  reactions,
  userReaction,
  canReact,
  react,
  locale,
  dateFormat,
}: ChangelogEntryRenderProps & { locale: string; dateFormat: "absolute" | "relative" }) {
  const typeStyle = feature.type
    ? TYPE_COLORS[feature.type] ?? TYPE_COLORS.feature
    : null;

  const descriptionHtml = feature.description
    ? parseDescription(feature.description)
    : null;

  const versionLabel =
    typeof feature.version === "string"
      ? feature.version
      : feature.version?.introduced ?? feature.version?.showNewUntil ?? null;

  return (
    <div data-featuredrop-entry={feature.id} style={entryStyles}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <p style={entryTitleStyles}>{feature.label}</p>
        <button
          onClick={dismiss}
          style={{ ...closeButtonStyles, fontSize: "14px", flexShrink: 0 }}
          aria-label={`Dismiss ${feature.label}`}
        >
          &times;
        </button>
      </div>
      {descriptionHtml && (
        <div
          style={entryDescriptionStyles}
          dangerouslySetInnerHTML={{ __html: descriptionHtml }}
        />
      )}
      {feature.image && (
        <img
          src={feature.image}
          alt={feature.label}
          style={{
            width: "100%",
            borderRadius: "8px",
            marginBottom: "8px",
          }}
        />
      )}
      <div style={entryMetaStyles}>
        {feature.type && typeStyle && (
          <span
            style={{
              ...typeTagStyles,
              color: typeStyle.color,
              backgroundColor: typeStyle.bg,
            }}
          >
            {feature.type}
          </span>
        )}
        {feature.category && (
          <span>{feature.category}</span>
        )}
        <span>
          {dateFormat === "relative"
            ? formatRelativeTimeForLocale(feature.releasedAt, locale)
            : formatDateForLocale(feature.releasedAt, locale)}
        </span>
        {versionLabel && <span>v{versionLabel}</span>}
      </div>
      {feature.cta && (
        <a
          href={feature.cta.url}
          style={ctaButtonStyles}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onFeatureClick}
        >
          {feature.cta.label}
        </a>
      )}
      {reactions && react && (
        <div style={reactionsRowStyles}>
          {Object.entries(reactions).map(([reaction, count]) => (
            <button
              key={reaction}
              type="button"
              onClick={() => react(reaction)}
              disabled={!canReact}
              style={{
                ...reactionButtonStyles,
                opacity: !canReact && userReaction !== reaction ? 0.55 : 1,
                background: userReaction === reaction ? "rgba(17, 24, 39, 0.08)" : "#fff",
              }}
              aria-label={`React ${reaction} to ${feature.label}`}
            >
              <span>{reaction}</span>
              <span>{count}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ChangelogWidget Component                                          */
/* ------------------------------------------------------------------ */

/**
 * Changelog widget — the #1 feature for feature discovery tools.
 *
 * Renders a trigger button with an unread count badge and a
 * slide-out panel, modal, or popover with the changelog feed.
 *
 * Styled via CSS custom properties — zero framework dependency.
 * Use `children` render prop for full headless control.
 *
 * @example
 * ```tsx
 * <ChangelogWidget variant="panel" />
 * ```
 *
 * @example Headless mode
 * ```tsx
 * <ChangelogWidget>
 *   {({ isOpen, toggle, features, count }) => (
 *     <MyCustomUI ... />
 *   )}
 * </ChangelogWidget>
 * ```
 */
export function ChangelogWidget({
  variant = "panel",
  title,
  triggerLabel,
  showCount = true,
  markAllLabel,
  showMarkAll = true,
  emptyLabel,
  maxHeight = "400px",
  dateFormat = "absolute",
  analytics,
  className,
  style,
  theme,
  children,
  renderEntry,
  renderTrigger,
  showReactions = false,
  reactions = [...DEFAULT_REACTIONS],
  onReaction,
}: ChangelogWidgetProps) {
  const {
    newFeaturesSorted,
    newCount,
    dismiss,
    dismissAll,
    markFeatureSeen,
    markFeatureClicked,
    trackAdoptionEvent,
    locale,
    direction,
    animation,
    translations,
  } = useFeatureDrop();
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [, setReactionVersion] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const lastFocusedElementRef = useRef<HTMLElement | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const widgetIdRef = useRef(`featuredrop-widget-${Math.random().toString(36).slice(2, 10)}`);
  const themeVariables = useThemeVariables(theme);
  const resolvedTitle = title ?? translations.whatsNewTitle;
  const resolvedTriggerLabel = triggerLabel ?? translations.whatsNewTitle;
  const resolvedMarkAllLabel = markAllLabel ?? translations.markAllRead;
  const resolvedEmptyLabel = emptyLabel ?? translations.allCaughtUp;
  const dialogId = `${widgetIdRef.current}-dialog`;
  const titleId = `${widgetIdRef.current}-title`;
  const countLabel = translations.newFeatureCount(newCount);
  const dialogEnterAnimation = useMemo(
    () => getEnterAnimation(animation, variant),
    [animation, variant],
  );
  const dialogExitAnimation = useMemo(
    () => getExitAnimation(animation, variant),
    [animation, variant],
  );

  useEffect(() => {
    ensureFeatureDropAnimationStyles();
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  const open = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setIsClosing(false);
    if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
      lastFocusedElementRef.current = document.activeElement;
    }
    setIsOpen(true);
    analytics?.onWidgetOpened?.();
  }, [analytics]);

  const close = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setIsOpen(false);
    const exitDuration = getAnimationDurationMs(animation, variant, "exit");
    if (exitDuration > 0) {
      setIsClosing(true);
      closeTimerRef.current = setTimeout(() => {
        setIsClosing(false);
        closeTimerRef.current = null;
      }, exitDuration);
    } else {
      setIsClosing(false);
    }
    analytics?.onWidgetClosed?.();
    const returnTarget = triggerRef.current ?? lastFocusedElementRef.current;
    if (returnTarget) {
      if (typeof requestAnimationFrame === "function") {
        requestAnimationFrame(() => {
          returnTarget.focus();
        });
      } else {
        returnTarget.focus();
      }
    }
  }, [animation, analytics, variant]);

  const toggle = useCallback(() => {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }, [isOpen, open, close]);

  const handleDismiss = useCallback(
    (id: string) => {
      const feature = newFeaturesSorted.find((f) => f.id === id);
      dismiss(id);
      if (feature) {
        analytics?.onFeatureDismissed?.(feature);
      }
    },
    [dismiss, newFeaturesSorted, analytics],
  );

  const handleDismissAll = useCallback(async () => {
    await dismissAll();
    analytics?.onAllDismissed?.();
  }, [dismissAll, analytics]);

  const handleFeatureClick = useCallback((feature: FeatureEntry) => {
    markFeatureClicked(feature.id);
    trackAdoptionEvent({
      type: "cta_clicked",
      featureId: feature.id,
      metadata: { source: "changelog" },
    });
    analytics?.onFeatureClicked?.(feature);
  }, [analytics, markFeatureClicked, trackAdoptionEvent]);

  const handleReaction = useCallback((feature: FeatureEntry, reaction: string) => {
    const result = reactToEntry(feature.id, reaction, reactions);
    if (!result.updated) return;
    setReactionVersion((value) => value + 1);
    onReaction?.(feature, reaction, result.counts);
  }, [onReaction, reactions]);

  useEffect(() => {
    if (!isOpen) return;
    for (const feature of newFeaturesSorted) {
      markFeatureSeen(feature.id);
      analytics?.onFeatureSeen?.(feature);
    }
  }, [analytics, isOpen, markFeatureSeen, newFeaturesSorted]);

  // Close on click outside (panel/modal)
  useEffect(() => {
    if (!isOpen || variant === "popover") return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen, variant, close]);

  // Close popover on outside click
  useEffect(() => {
    if (!isOpen || variant !== "popover") return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close();
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [isOpen, variant, close]);

  useEffect(() => {
    if (!isOpen) return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusable = getFocusableElements(dialog);
    const first = focusable[0] ?? dialog;
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => first.focus());
    } else {
      first.focus();
    }

    const handleTab = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const items = getFocusableElements(dialog);
      if (items.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey) {
        if (active === firstItem || active === dialog) {
          event.preventDefault();
          lastItem.focus();
        }
        return;
      }

      if (active === lastItem) {
        event.preventDefault();
        firstItem.focus();
      }
    };

    dialog.addEventListener("keydown", handleTab);
    return () => {
      dialog.removeEventListener("keydown", handleTab);
    };
  }, [isOpen]);

  // Headless render prop mode
  if (children) {
    return (
      <>
        {children({
          isOpen,
          open,
          close,
          toggle,
          count: newCount,
          features: newFeaturesSorted,
          dismiss: handleDismiss,
          dismissAll: handleDismissAll,
        })}
      </>
    );
  }

  const widgetRootStyle = useMemo<CSSProperties>(
    () => ({
      ...(themeVariables ?? {}),
      position: "relative",
      display: "inline-block",
      ...(style ?? {}),
    }),
    [themeVariables, style],
  );

  const dialogContainerStyles =
    variant === "modal"
      ? modalContainerStyles
      : variant === "popover"
        ? popoverContainerStyles
        : panelContainerStyles;

  return (
    <div
      ref={containerRef}
      data-featuredrop-widget
      className={className}
      style={widgetRootStyle}
      dir={direction}
    >
      {/* Trigger */}
      {renderTrigger ? (
        renderTrigger({ count: newCount, onClick: toggle })
      ) : (
        <button
          ref={triggerRef}
          onClick={toggle}
          style={triggerButtonStyles}
          data-featuredrop-trigger
          aria-label={`${resolvedTriggerLabel}${newCount > 0 ? ` — ${countLabel}` : ""}`}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-controls={dialogId}
        >
          {resolvedTriggerLabel}
          {showCount && newCount > 0 && (
            <span style={triggerBadgeStyles} data-featuredrop-trigger-badge>
              {newCount}
            </span>
          )}
        </button>
      )}
      <span style={srOnlyStyles} aria-live="polite" aria-atomic="true">
        {countLabel}
      </span>

      {/* Widget body */}
      {(isOpen || isClosing) && (
        <>
          {/* Overlay for panel/modal */}
          {variant !== "popover" && (
            <div
              style={overlayStyles}
              onClick={close}
              data-featuredrop-overlay
              aria-hidden="true"
            />
          )}

          <div
            id={dialogId}
            ref={dialogRef}
            style={{
              ...dialogContainerStyles,
              animation: isClosing ? dialogExitAnimation : dialogEnterAnimation,
            }}
            data-featuredrop-container={variant}
            role="dialog"
            aria-labelledby={titleId}
            aria-modal={variant === "popover" ? undefined : true}
            tabIndex={-1}
          >
            {/* Header */}
            <div style={headerStyles} data-featuredrop-header>
              <h2 id={titleId} style={titleStyles}>{resolvedTitle}</h2>
              <button
                onClick={close}
                style={closeButtonStyles}
                aria-label={translations.close}
              >
                &times;
              </button>
            </div>

            {/* Feed */}
            <div style={{ ...feedStyles, maxHeight }} data-featuredrop-feed>
              {newFeaturesSorted.length === 0 ? (
                <div style={emptyStyles} data-featuredrop-empty>
                  {resolvedEmptyLabel}
                </div>
              ) : (
                newFeaturesSorted.map((feature) =>
                  renderEntry ? (
                    <div key={feature.id}>
                      {(() => {
                        const counts = showReactions
                          ? getReactionCounts(feature.id, reactions)
                          : undefined;
                        const userReaction = showReactions
                          ? getUserReaction(feature.id)
                          : null;
                        const canReact = showReactions
                          ? !userReaction
                          : false;
                        return renderEntry({
                          feature,
                          dismiss: () => handleDismiss(feature.id),
                          onFeatureClick: () => handleFeatureClick(feature),
                          reactions: counts,
                          userReaction,
                          canReact,
                          react: (reaction) => handleReaction(feature, reaction),
                        });
                      })()}
                    </div>
                  ) : (
                    <DefaultEntry
                      key={feature.id}
                      feature={feature}
                      dismiss={() => handleDismiss(feature.id)}
                      onFeatureClick={() => handleFeatureClick(feature)}
                      locale={locale}
                      dateFormat={dateFormat}
                      reactions={showReactions ? getReactionCounts(feature.id, reactions) : undefined}
                      userReaction={showReactions ? getUserReaction(feature.id) : null}
                      canReact={showReactions ? !getUserReaction(feature.id) : undefined}
                      react={(reaction) => handleReaction(feature, reaction)}
                    />
                  ),
                )
              )}
            </div>

            {/* Footer */}
            {showMarkAll && newFeaturesSorted.length > 0 && (
              <div style={footerStyles} data-featuredrop-footer>
                <button
                  onClick={handleDismissAll}
                  style={markAllButtonStyles}
                  data-featuredrop-mark-all
                >
                  {resolvedMarkAllLabel}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
