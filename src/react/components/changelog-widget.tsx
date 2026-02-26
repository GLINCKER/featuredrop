import {
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
  type CSSProperties,
} from "react";
import type { FeatureEntry, AnalyticsCallbacks } from "../../types";
import { useFeatureDrop } from "../hooks/use-feature-drop";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ChangelogEntryRenderProps {
  feature: FeatureEntry;
  dismiss: () => void;
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
  /** Analytics callbacks */
  analytics?: AnalyticsCallbacks;
  /** Additional CSS class for the container */
  className?: string;
  /** Additional inline styles for the container */
  style?: CSSProperties;
  /** Render prop for full customization — receives widget state */
  children?: (props: ChangelogWidgetRenderProps) => ReactNode;
  /** Custom render for each entry — receives feature + dismiss callback */
  renderEntry?: (props: ChangelogEntryRenderProps) => ReactNode;
  /** Custom render for the trigger button */
  renderTrigger?: (props: { count: number; onClick: () => void }) => ReactNode;
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

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const TYPE_COLORS: Record<string, { color: string; bg: string }> = {
  feature: { color: "#065f46", bg: "rgba(16, 185, 129, 0.15)" },
  improvement: { color: "#1e40af", bg: "rgba(59, 130, 246, 0.15)" },
  fix: { color: "#92400e", bg: "rgba(245, 158, 11, 0.15)" },
  breaking: { color: "#991b1b", bg: "rgba(239, 68, 68, 0.15)" },
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/* ------------------------------------------------------------------ */
/*  Default Entry Renderer                                             */
/* ------------------------------------------------------------------ */

function DefaultEntry({ feature, dismiss }: ChangelogEntryRenderProps) {
  const typeStyle = feature.type
    ? TYPE_COLORS[feature.type] ?? TYPE_COLORS.feature
    : null;

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
      {feature.description && (
        <p style={entryDescriptionStyles}>{feature.description}</p>
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
        <span>{formatDate(feature.releasedAt)}</span>
        {feature.version && <span>v{feature.version}</span>}
      </div>
      {feature.cta && (
        <a
          href={feature.cta.url}
          style={ctaButtonStyles}
          target="_blank"
          rel="noopener noreferrer"
        >
          {feature.cta.label}
        </a>
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
  title = "What's New",
  triggerLabel = "What's New",
  showCount = true,
  markAllLabel = "Mark all as read",
  showMarkAll = true,
  emptyLabel = "You're all caught up!",
  maxHeight = "400px",
  analytics,
  className,
  style,
  children,
  renderEntry,
  renderTrigger,
}: ChangelogWidgetProps) {
  const { newFeaturesSorted, newCount, dismiss, dismissAll } = useFeatureDrop();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const open = useCallback(() => {
    setIsOpen(true);
    analytics?.onWidgetOpened?.();
  }, [analytics]);

  const close = useCallback(() => {
    setIsOpen(false);
    analytics?.onWidgetClosed?.();
  }, [analytics]);

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

  const containerStyles =
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
      style={{ position: "relative", display: "inline-block", ...style }}
    >
      {/* Trigger */}
      {renderTrigger ? (
        renderTrigger({ count: newCount, onClick: toggle })
      ) : (
        <button
          onClick={toggle}
          style={triggerButtonStyles}
          data-featuredrop-trigger
          aria-label={`${triggerLabel}${newCount > 0 ? ` — ${newCount} new` : ""}`}
        >
          {triggerLabel}
          {showCount && newCount > 0 && (
            <span style={triggerBadgeStyles} data-featuredrop-trigger-badge>
              {newCount}
            </span>
          )}
        </button>
      )}

      {/* Widget body */}
      {isOpen && (
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
            style={containerStyles}
            data-featuredrop-container={variant}
            role="dialog"
            aria-label={title}
          >
            {/* Header */}
            <div style={headerStyles} data-featuredrop-header>
              <h2 style={titleStyles}>{title}</h2>
              <button
                onClick={close}
                style={closeButtonStyles}
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            {/* Feed */}
            <div style={{ ...feedStyles, maxHeight }} data-featuredrop-feed>
              {newFeaturesSorted.length === 0 ? (
                <div style={emptyStyles} data-featuredrop-empty>
                  {emptyLabel}
                </div>
              ) : (
                newFeaturesSorted.map((feature) =>
                  renderEntry ? (
                    <div key={feature.id}>
                      {renderEntry({
                        feature,
                        dismiss: () => handleDismiss(feature.id),
                      })}
                    </div>
                  ) : (
                    <DefaultEntry
                      key={feature.id}
                      feature={feature}
                      dismiss={() => handleDismiss(feature.id)}
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
                  {markAllLabel}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
