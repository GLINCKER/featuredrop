import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { ensureFeatureDropAnimationStyles, getEnterAnimation } from "../../animation";
import { useFeatureDrop } from "../hooks/use-feature-drop";

export type FeedbackEmoji =
  | "thumbs-up"
  | "thumbs-down"
  | "heart"
  | "thinking"
  | "fire";

export interface FeedbackPayload {
  featureId?: string;
  text: string;
  category?: string;
  emoji?: FeedbackEmoji;
  screenshot?: Blob;
  url: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export type FeedbackRateLimit = "none" | "1-per-feature" | "1-per-session";

export interface FeedbackWidgetRenderProps {
  isOpen: boolean;
  isSubmitting: boolean;
  isRateLimited: boolean;
  submitted: boolean;
  text: string;
  category: string;
  emoji: FeedbackEmoji | null;
  screenshot: Blob | null;
  error: string | null;
  open: () => void;
  close: () => void;
  setText: (value: string) => void;
  setCategory: (value: string) => void;
  setEmoji: (value: FeedbackEmoji | null) => void;
  captureScreenshot: () => Promise<void>;
  submit: () => Promise<void>;
}

export interface FeedbackWidgetProps {
  featureId?: string;
  onSubmit: (payload: FeedbackPayload) => Promise<void> | void;
  showScreenshot?: boolean;
  showEmoji?: boolean;
  rateLimit?: FeedbackRateLimit;
  categories?: string[];
  metadata?: Record<string, unknown>;
  screenshotCapture?: () => Promise<Blob | null | undefined>;
  triggerLabel?: string;
  title?: string;
  className?: string;
  style?: CSSProperties;
  children?: (props: FeedbackWidgetRenderProps) => ReactNode;
}

const sessionSubmitted = new Set<string>();
const defaultCategories = ["bug", "suggestion", "praise", "other"];
const emojiOptions: FeedbackEmoji[] = [
  "thumbs-up",
  "thumbs-down",
  "heart",
  "thinking",
  "fire",
];

const panelStyles: CSSProperties = {
  width: "min(92vw, 360px)",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  background: "#fff",
  boxShadow: "0 10px 28px rgba(0,0,0,0.14)",
  padding: "12px",
};

function getRateLimitKey(featureId?: string): string {
  return `featuredrop:feedback:${featureId ?? "__global__"}:submitted`;
}

function readSubmitted(key: string): boolean {
  const storage = globalThis.localStorage as unknown as {
    getItem?: (storageKey: string) => string | null;
  };
  if (!storage || typeof storage.getItem !== "function") return false;
  try {
    return storage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function writeSubmitted(key: string): void {
  const storage = globalThis.localStorage as unknown as {
    setItem?: (storageKey: string, value: string) => void;
  };
  if (!storage || typeof storage.setItem !== "function") return;
  try {
    storage.setItem(key, "1");
  } catch {
    // noop
  }
}

async function captureViaHtml2Canvas(): Promise<Blob | null> {
  const html2canvasFn = (
    globalThis as unknown as {
      html2canvas?: (target: HTMLElement) => Promise<HTMLCanvasElement>;
    }
  ).html2canvas;
  if (!html2canvasFn || typeof document === "undefined") return null;
  const canvas = await html2canvasFn(document.body);
  if (typeof canvas.toBlob !== "function") return null;
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}

export function FeedbackWidget({
  featureId,
  onSubmit,
  showScreenshot = false,
  showEmoji = true,
  rateLimit = "none",
  categories = defaultCategories,
  metadata,
  screenshotCapture,
  triggerLabel,
  title,
  className,
  style,
  children,
}: FeedbackWidgetProps) {
  const { trackAdoptionEvent, direction, animation, translations } = useFeatureDrop();
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState("");
  const [category, setCategory] = useState(categories[0] ?? "other");
  const [emoji, setEmoji] = useState<FeedbackEmoji | null>(null);
  const [screenshot, setScreenshot] = useState<Blob | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const lastFocusedElementRef = useRef<HTMLElement | null>(null);
  const instanceIdRef = useRef(`featuredrop-feedback-${Math.random().toString(36).slice(2, 10)}`);

  const rateLimitKey = useMemo(() => getRateLimitKey(featureId), [featureId]);
  const panelAnimation = useMemo(() => getEnterAnimation(animation, "popover"), [animation]);
  const resolvedTriggerLabel = triggerLabel ?? translations.feedbackTrigger;
  const resolvedTitle = title ?? translations.feedbackTitle;
  const isRateLimited = useMemo(() => {
    if (rateLimit === "none") return false;
    if (rateLimit === "1-per-session") return sessionSubmitted.has(rateLimitKey);
    return readSubmitted(rateLimitKey);
  }, [rateLimit, rateLimitKey, submitted]);

  const open = useCallback(() => {
    if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
      lastFocusedElementRef.current = document.activeElement;
    }
    setIsOpen(true);
  }, []);
  const close = useCallback(() => {
    setIsOpen(false);
    const returnTarget = triggerRef.current ?? lastFocusedElementRef.current;
    if (returnTarget) {
      if (typeof requestAnimationFrame === "function") {
        requestAnimationFrame(() => returnTarget.focus());
      } else {
        returnTarget.focus();
      }
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [close, isOpen]);

  useEffect(() => {
    ensureFeatureDropAnimationStyles();
  }, []);

  const captureScreenshot = useCallback(async () => {
    if (!showScreenshot) return;
    try {
      const captured = screenshotCapture
        ? await screenshotCapture()
        : await captureViaHtml2Canvas();
      if (captured) setScreenshot(captured);
    } catch {
      // ignore capture errors in UI flow
    }
  }, [screenshotCapture, showScreenshot]);

  const submit = useCallback(async () => {
    if (isSubmitting || isRateLimited) return;
    const trimmed = text.trim();
    if (!trimmed) {
      setError("Please add feedback details.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    const payload: FeedbackPayload = {
      featureId,
      text: trimmed,
      category,
      emoji: emoji ?? undefined,
      screenshot: screenshot ?? undefined,
      url: typeof window === "undefined" ? "" : window.location.href,
      timestamp: new Date().toISOString(),
      metadata,
    };
    try {
      await onSubmit(payload);
      setSubmitted(true);
      if (rateLimit === "1-per-session") {
        sessionSubmitted.add(rateLimitKey);
      } else if (rateLimit === "1-per-feature") {
        writeSubmitted(rateLimitKey);
      }
      trackAdoptionEvent({
        type: "feedback_submitted",
        featureId,
        metadata: {
          category,
          emoji: emoji ?? undefined,
          hasScreenshot: !!screenshot,
        },
      });
      setText("");
      setScreenshot(null);
      setEmoji(null);
    } catch {
      setError("Failed to submit feedback. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    category,
    emoji,
    featureId,
    isRateLimited,
    isSubmitting,
    metadata,
    onSubmit,
    rateLimit,
    rateLimitKey,
    screenshot,
    text,
    trackAdoptionEvent,
  ]);

  const renderProps: FeedbackWidgetRenderProps = {
    isOpen,
    isSubmitting,
    isRateLimited,
    submitted,
    text,
    category,
    emoji,
    screenshot,
    error,
    open,
    close,
    setText,
    setCategory,
    setEmoji,
    captureScreenshot,
    submit,
  };

  if (children) {
    return <>{children(renderProps)}</>;
  }

  if (!isOpen) {
    return (
      <button
        ref={triggerRef}
        type="button"
        onClick={open}
        data-featuredrop-feedback-trigger
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={`${instanceIdRef.current}-panel`}
        style={{
          border: "1px solid #d1d5db",
          background: "#fff",
          borderRadius: "10px",
          padding: "8px 12px",
          cursor: "pointer",
          fontWeight: 600,
        }}
      >
        {resolvedTriggerLabel}
      </button>
    );
  }

  const titleId = `${instanceIdRef.current}-title`;
  const textareaId = `${instanceIdRef.current}-textarea`;

  return (
    <div
      ref={panelRef}
      id={`${instanceIdRef.current}-panel`}
      data-featuredrop-feedback-widget
      className={className}
      style={{ ...panelStyles, animation: panelAnimation, ...style }}
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      dir={direction}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
        <strong id={titleId}>{resolvedTitle}</strong>
        <button
          type="button"
          onClick={close}
          style={{ border: "none", background: "transparent", cursor: "pointer" }}
          aria-label={translations.close}
        >
          x
        </button>
      </div>

      {isRateLimited && (
        <p style={{ margin: "8px 0 0", fontSize: "12px", color: "#6b7280" }}>
          Feedback already submitted.
        </p>
      )}

      <textarea
        id={textareaId}
        aria-label="Feedback details"
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Tell us what worked, what did not, and what would help."
        rows={4}
        disabled={isRateLimited || isSubmitting}
        style={{
          width: "100%",
          marginTop: "8px",
          border: "1px solid #d1d5db",
          borderRadius: "8px",
          padding: "8px",
          resize: "vertical",
        }}
      />

      <div style={{ display: "flex", gap: "8px", marginTop: "8px", flexWrap: "wrap" }}>
        <select
          aria-label="Feedback category"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          disabled={isRateLimited || isSubmitting}
          style={{ border: "1px solid #d1d5db", borderRadius: "8px", padding: "6px 8px" }}
        >
          {categories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        {showEmoji && (
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {emojiOptions.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setEmoji(item)}
                disabled={isRateLimited || isSubmitting}
                aria-pressed={emoji === item}
                style={{
                  border: "1px solid #d1d5db",
                  background: emoji === item ? "#111827" : "#fff",
                  color: emoji === item ? "#fff" : "#111827",
                  borderRadius: "999px",
                  fontSize: "11px",
                  padding: "4px 8px",
                  cursor: "pointer",
                }}
              >
                {item}
              </button>
            ))}
          </div>
        )}
      </div>

      {showScreenshot && (
        <div style={{ marginTop: "8px" }}>
          <button
            type="button"
            onClick={() => void captureScreenshot()}
            disabled={isRateLimited || isSubmitting}
            style={{
              border: "1px solid #d1d5db",
              background: "#fff",
              borderRadius: "8px",
              padding: "6px 8px",
              cursor: "pointer",
            }}
          >
            Capture screenshot
          </button>
          {screenshot && (
            <span style={{ marginLeft: "8px", fontSize: "12px", color: "#6b7280" }}>
              Screenshot attached
            </span>
          )}
        </div>
      )}

      {error && (
        <p role="alert" style={{ margin: "8px 0 0", fontSize: "12px", color: "#b91c1c" }}>{error}</p>
      )}
      {submitted && !error && (
        <p role="status" aria-live="polite" style={{ margin: "8px 0 0", fontSize: "12px", color: "#166534" }}>
          {translations.feedbackSubmitted}
        </p>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "10px" }}>
        <button
          type="button"
          onClick={close}
          style={{
            border: "1px solid #d1d5db",
            background: "#fff",
            borderRadius: "8px",
            padding: "6px 10px",
            cursor: "pointer",
          }}
        >
          {translations.cancel}
        </button>
        <button
          type="button"
          onClick={() => void submit()}
          disabled={isRateLimited || isSubmitting || !text.trim()}
          style={{
            border: "none",
            background: "#111827",
            color: "#fff",
            borderRadius: "8px",
            padding: "6px 10px",
            cursor: "pointer",
            opacity: isRateLimited || isSubmitting || !text.trim() ? 0.5 : 1,
          }}
        >
          {isSubmitting ? "Submitting..." : translations.submit}
        </button>
      </div>
    </div>
  );
}
