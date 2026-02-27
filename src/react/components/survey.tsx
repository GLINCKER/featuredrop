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
import { ensureFeatureDropAnimationStyles, getEnterAnimation } from "../../animation";
import { FeatureDropContext } from "../context";
import {
  registerSurveyController,
  type SurveyController,
  type SurveySnapshot,
} from "../survey-registry";

export type SurveyType = "nps" | "csat" | "ces" | "custom";
export type SurveyQuestionType = "single-choice" | "multi-choice" | "text";

export interface SurveyQuestion {
  id: string;
  type: SurveyQuestionType;
  prompt: string;
  options?: string[];
  required?: boolean;
}

export interface SurveyTriggerRules {
  signupAt?: string | Date;
  minDaysSinceSignup?: number;
  featureUsageIds?: string[];
  pageMatch?: string | RegExp | ((path: string) => boolean);
  sampleRate?: number;
  maxFrequencyDays?: number;
  askLaterCooldownDays?: number;
}

export interface SurveyPayload {
  id: string;
  type: SurveyType;
  prompt?: string;
  score?: number;
  responses?: Record<string, unknown>;
  feedback?: string;
  timestamp: string;
  url: string;
  featureId?: string;
  metadata?: Record<string, unknown>;
}

export interface SurveyRenderProps {
  isOpen: boolean;
  isSubmitting: boolean;
  submitted: boolean;
  canShow: boolean;
  error: string | null;
  type: SurveyType;
  score: number | null;
  feedback: string;
  responses: Record<string, unknown>;
  show: (options?: { force?: boolean }) => boolean;
  hide: () => void;
  askLater: () => void;
  setScore: (value: number | null) => void;
  setFeedback: (value: string) => void;
  setResponse: (questionId: string, value: unknown) => void;
  submit: () => Promise<boolean>;
}

export interface SurveyProps {
  id: string;
  type: SurveyType;
  prompt?: string;
  featureId?: string;
  questions?: SurveyQuestion[];
  trigger?: "auto" | "manual";
  triggerRules?: SurveyTriggerRules;
  defaultOpen?: boolean;
  showAskLater?: boolean;
  submitLabel?: string;
  askLaterLabel?: string;
  closeLabel?: string;
  title?: string;
  metadata?: Record<string, unknown>;
  onSubmit: (payload: SurveyPayload) => Promise<void> | void;
  onAskLater?: () => void;
  onDismiss?: () => void;
  className?: string;
  style?: CSSProperties;
  children?: (props: SurveyRenderProps) => ReactNode;
}

const panelStyles: CSSProperties = {
  width: "min(92vw, 420px)",
  border: "1px solid #e5e7eb",
  borderRadius: "14px",
  background: "#fff",
  boxShadow: "0 16px 48px rgba(0,0,0,0.16)",
  padding: "14px",
};

const questionBlockStyles: CSSProperties = {
  marginTop: "10px",
  padding: "10px",
  border: "1px solid #e5e7eb",
  borderRadius: "10px",
};

const SEEN_FEATURES_STORAGE_KEY = "featuredrop:seen-features";
const CLICKED_FEATURES_STORAGE_KEY = "featuredrop:clicked-features";
const DEFAULT_MAX_FREQUENCY_DAYS = 30;
const DEFAULT_ASK_LATER_DAYS = 7;

function submittedStorageKey(id: string): string {
  return `featuredrop:survey:${id}:submitted-at`;
}

function cooldownStorageKey(id: string): string {
  return `featuredrop:survey:${id}:cooldown-until`;
}

function sampleBucketStorageKey(id: string): string {
  return `featuredrop:survey:${id}:sample-bucket`;
}

function readStorageValue(key: string): string | null {
  const storage = globalThis.localStorage as unknown as {
    getItem?: (storageKey: string) => string | null;
  };
  if (!storage || typeof storage.getItem !== "function") return null;
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorageValue(key: string, value: string): void {
  const storage = globalThis.localStorage as unknown as {
    setItem?: (storageKey: string, storageValue: string) => void;
  };
  if (!storage || typeof storage.setItem !== "function") return;
  try {
    storage.setItem(key, value);
  } catch {
    // noop
  }
}

function clearStorageValue(key: string): void {
  const storage = globalThis.localStorage as unknown as {
    removeItem?: (storageKey: string) => void;
  };
  if (!storage || typeof storage.removeItem !== "function") return;
  try {
    storage.removeItem(key);
  } catch {
    // noop
  }
}

function parseIsoTime(value: string | null): number | null {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function readFeatureUsageIds(): Set<string> {
  const seenRaw = readStorageValue(SEEN_FEATURES_STORAGE_KEY);
  const clickedRaw = readStorageValue(CLICKED_FEATURES_STORAGE_KEY);
  const ids = new Set<string>();

  const append = (raw: string | null): void => {
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return;
      for (const item of parsed) {
        if (typeof item === "string") ids.add(item);
      }
    } catch {
      // ignore malformed values
    }
  };

  append(seenRaw);
  append(clickedRaw);
  return ids;
}

function matchesPage(pageMatch: SurveyTriggerRules["pageMatch"]): boolean {
  if (!pageMatch) return true;
  if (typeof window === "undefined") return false;
  const path = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (typeof pageMatch === "string") return path.includes(pageMatch);
  if (pageMatch instanceof RegExp) return pageMatch.test(path);
  try {
    return pageMatch(path);
  } catch {
    return false;
  }
}

function resolveScale(type: SurveyType): { min: number; max: number } | null {
  if (type === "nps") return { min: 0, max: 10 };
  if (type === "csat") return { min: 1, max: 5 };
  if (type === "ces") return { min: 1, max: 7 };
  return null;
}

function defaultTitle(type: SurveyType): string {
  if (type === "nps") return "NPS Survey";
  if (type === "csat") return "CSAT Survey";
  if (type === "ces") return "CES Survey";
  return "Survey";
}

function normalizeSignupAt(signupAt?: string | Date): number | null {
  if (!signupAt) return null;
  if (signupAt instanceof Date) return signupAt.getTime();
  return parseIsoTime(signupAt);
}

function daysToMs(days: number): number {
  return days * 24 * 60 * 60 * 1000;
}

function hasRequiredResponses(
  questions: SurveyQuestion[],
  responses: Record<string, unknown>,
): boolean {
  for (const question of questions) {
    if (!question.required) continue;
    const value = responses[question.id];
    if (question.type === "multi-choice") {
      if (!Array.isArray(value) || value.length === 0) return false;
      continue;
    }
    if (typeof value === "string") {
      if (!value.trim()) return false;
      continue;
    }
    if (value === undefined || value === null) return false;
  }
  return true;
}

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

export function Survey({
  id,
  type,
  prompt,
  featureId,
  questions = [],
  trigger = "auto",
  triggerRules,
  defaultOpen = false,
  showAskLater = true,
  submitLabel,
  askLaterLabel,
  closeLabel,
  title,
  metadata,
  onSubmit,
  onAskLater,
  onDismiss,
  className,
  style,
  children,
}: SurveyProps) {
  const context = useContext(FeatureDropContext);
  const listenersRef = useRef(new Set<() => void>());
  const panelRef = useRef<HTMLElement>(null);
  const lastFocusedElementRef = useRef<HTMLElement | null>(null);
  const instanceIdRef = useRef(`featuredrop-survey-${Math.random().toString(36).slice(2, 10)}`);
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [responses, setResponses] = useState<Record<string, unknown>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshVersion, setRefreshVersion] = useState(0);

  const maxFrequencyDays = triggerRules?.maxFrequencyDays ?? DEFAULT_MAX_FREQUENCY_DAYS;
  const askLaterCooldownDays = triggerRules?.askLaterCooldownDays ?? DEFAULT_ASK_LATER_DAYS;
  const scale = useMemo(() => resolveScale(type), [type]);
  const translations = context?.translations;
  const direction = context?.direction ?? "ltr";
  const panelAnimation = useMemo(
    () => getEnterAnimation(context?.animation ?? "normal", "modal"),
    [context?.animation],
  );

  const canShow = useMemo(() => {
    const now = Date.now();
    const cooldownUntil = parseIsoTime(readStorageValue(cooldownStorageKey(id)));
    if (cooldownUntil && now < cooldownUntil) return false;

    const submittedAt = parseIsoTime(readStorageValue(submittedStorageKey(id)));
    if (submittedAt && maxFrequencyDays > 0) {
      const cutoff = submittedAt + daysToMs(maxFrequencyDays);
      if (now < cutoff) return false;
    }

    const sampleRate = triggerRules?.sampleRate;
    if (typeof sampleRate === "number") {
      if (sampleRate <= 0) return false;
      if (sampleRate < 1) {
        const bucketKey = sampleBucketStorageKey(id);
        const existing = Number(readStorageValue(bucketKey));
        const bucket = Number.isFinite(existing) ? existing : Math.random();
        if (!Number.isFinite(existing)) {
          writeStorageValue(bucketKey, String(bucket));
        }
        if (bucket >= sampleRate) return false;
      }
    }

    const minDaysSinceSignup = triggerRules?.minDaysSinceSignup;
    if (typeof minDaysSinceSignup === "number" && minDaysSinceSignup > 0) {
      const signupAt = normalizeSignupAt(triggerRules?.signupAt);
      if (!signupAt) return false;
      if (now - signupAt < daysToMs(minDaysSinceSignup)) return false;
    }

    const usageIds = triggerRules?.featureUsageIds ?? [];
    if (usageIds.length > 0) {
      const usage = readFeatureUsageIds();
      const hasUsage = usageIds.some((featureUsageId) => usage.has(featureUsageId));
      if (!hasUsage) return false;
    }

    if (!matchesPage(triggerRules?.pageMatch)) return false;
    return true;
  }, [
    id,
    maxFrequencyDays,
    triggerRules?.featureUsageIds,
    triggerRules?.minDaysSinceSignup,
    triggerRules?.pageMatch,
    triggerRules?.sampleRate,
    triggerRules?.signupAt,
    refreshVersion,
  ]);

  const emit = useCallback(() => {
    for (const listener of listenersRef.current) listener();
  }, []);

  useEffect(() => {
    emit();
  }, [canShow, emit, isOpen, submitted, type]);

  const hide = useCallback(() => {
    setIsOpen(false);
    onDismiss?.();
    const returnTarget = lastFocusedElementRef.current;
    if (returnTarget) {
      if (typeof requestAnimationFrame === "function") {
        requestAnimationFrame(() => returnTarget.focus());
      } else {
        returnTarget.focus();
      }
    }
  }, [onDismiss]);

  const show = useCallback((options?: { force?: boolean }): boolean => {
    if (!options?.force && !canShow) return false;
    if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
      lastFocusedElementRef.current = document.activeElement;
    }
    setIsOpen(true);
    setError(null);
    return true;
  }, [canShow]);

  const askLater = useCallback(() => {
    const until = new Date(Date.now() + daysToMs(askLaterCooldownDays)).toISOString();
    writeStorageValue(cooldownStorageKey(id), until);
    setIsOpen(false);
    setRefreshVersion((current) => current + 1);
    onAskLater?.();
  }, [askLaterCooldownDays, id, onAskLater]);

  useEffect(() => {
    if (trigger !== "auto") return;
    if (defaultOpen) return;
    show();
  }, [defaultOpen, show, trigger]);

  useEffect(() => {
    if (!defaultOpen) return;
    show({ force: true });
  }, [defaultOpen, show]);

  useEffect(() => {
    ensureFeatureDropAnimationStyles();
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const panel = panelRef.current;
    if (!panel) return;

    const focusable = getFocusableElements(panel);
    const first = focusable[0] ?? panel;
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => first.focus());
    } else {
      first.focus();
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Tab") {
        const items = getFocusableElements(panel);
        if (items.length === 0) {
          event.preventDefault();
          panel.focus();
          return;
        }
        const firstItem = items[0];
        const lastItem = items[items.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (event.shiftKey) {
          if (active === firstItem || active === panel) {
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

      if (event.key === "Escape") {
        event.preventDefault();
        hide();
      }
    };

    panel.addEventListener("keydown", handleKeyDown);
    return () => {
      panel.removeEventListener("keydown", handleKeyDown);
    };
  }, [hide, isOpen]);

  const setResponse = useCallback((questionId: string, value: unknown) => {
    setResponses((previous) => ({
      ...previous,
      [questionId]: value,
    }));
  }, []);

  const submit = useCallback(async (): Promise<boolean> => {
    if (isSubmitting) return false;
    if (type === "custom") {
      if (!hasRequiredResponses(questions, responses)) {
        setError("Please answer all required questions.");
        return false;
      }
    } else if (scale && score === null) {
      setError("Please select a score.");
      return false;
    }

    setIsSubmitting(true);
    setError(null);
    const timestamp = new Date().toISOString();
    const payload: SurveyPayload = {
      id,
      type,
      prompt,
      score: scale ? score ?? undefined : undefined,
      responses: type === "custom" ? responses : undefined,
      feedback: feedback.trim() ? feedback.trim() : undefined,
      timestamp,
      url: typeof window === "undefined" ? "" : window.location.href,
      featureId,
      metadata,
    };

    try {
      await onSubmit(payload);
      writeStorageValue(submittedStorageKey(id), timestamp);
      clearStorageValue(cooldownStorageKey(id));
      context?.trackAdoptionEvent({
        type: "survey_submitted",
        featureId,
        metadata: {
          surveyId: id,
          surveyType: type,
          score: payload.score,
          questionCount: type === "custom" ? questions.length : 1,
        },
      });
      setSubmitted(true);
      setIsOpen(false);
      setFeedback("");
      setResponses({});
      setScore(null);
      setRefreshVersion((current) => current + 1);
      return true;
    } catch {
      setError("Failed to submit survey. Please try again.");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [
    context,
    featureId,
    feedback,
    id,
    isSubmitting,
    metadata,
    onSubmit,
    prompt,
    questions.length,
    responses,
    scale,
    score,
    type,
  ]);

  useEffect(() => {
    const controller: SurveyController = {
      show,
      hide,
      askLater,
      getSnapshot: (): SurveySnapshot => ({
        exists: true,
        isOpen,
        submitted,
        canShow,
        type,
      }),
      subscribe: (listener) => {
        listenersRef.current.add(listener);
        return () => {
          listenersRef.current.delete(listener);
        };
      },
    };
    return registerSurveyController(id, controller);
  }, [askLater, canShow, hide, id, isOpen, show, submitted, type]);

  const renderProps: SurveyRenderProps = {
    isOpen,
    isSubmitting,
    submitted,
    canShow,
    error,
    type,
    score,
    feedback,
    responses,
    show,
    hide,
    askLater,
    setScore,
    setFeedback,
    setResponse,
    submit,
  };

  if (children) {
    return <>{children(renderProps)}</>;
  }

  if (!isOpen) return null;

  const surveyTitle = title ?? defaultTitle(type);
  const resolvedCloseLabel = closeLabel ?? translations?.close ?? "Close";
  const resolvedAskLaterLabel = askLaterLabel ?? translations?.askLater ?? "Ask me later";
  const resolvedSubmitLabel = submitLabel ?? translations?.submit ?? "Submit";
  const surveyTitleId = `${instanceIdRef.current}-title`;
  const surveyDescriptionId = `${instanceIdRef.current}-description`;
  const scoreRange = scale
    ? Array.from({ length: scale.max - scale.min + 1 }, (_, index) => scale.min + index)
    : [];

  return (
    <section
      ref={panelRef}
      data-featuredrop-survey={id}
      className={className}
      style={{ ...panelStyles, animation: panelAnimation, ...style }}
      role="dialog"
      aria-modal="false"
      aria-labelledby={surveyTitleId}
      aria-describedby={prompt ? surveyDescriptionId : undefined}
      tabIndex={-1}
      dir={direction}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
        <strong id={surveyTitleId}>{surveyTitle}</strong>
        <button
          type="button"
          onClick={hide}
          style={{ border: "none", background: "transparent", cursor: "pointer" }}
          aria-label={resolvedCloseLabel}
        >
          x
        </button>
      </div>

      {prompt && <p id={surveyDescriptionId} style={{ margin: "10px 0 0" }}>{prompt}</p>}

      {scale && (
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "10px" }}>
          {scoreRange.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setScore(value)}
              aria-pressed={score === value}
              style={{
                border: "1px solid #d1d5db",
                background: score === value ? "#111827" : "#fff",
                color: score === value ? "#fff" : "#111827",
                borderRadius: "999px",
                padding: "4px 8px",
                minWidth: "34px",
                cursor: "pointer",
              }}
            >
              {value}
            </button>
          ))}
        </div>
      )}

      {type === "custom" && (
        <div style={{ marginTop: "8px" }}>
          {questions.map((question) => {
            const value = responses[question.id];
            return (
              <div key={question.id} style={questionBlockStyles}>
                <p style={{ margin: 0, fontSize: "13px", fontWeight: 600 }}>
                  {question.prompt}
                  {question.required ? " *" : ""}
                </p>

                {question.type === "text" && (
                  <textarea
                    value={typeof value === "string" ? value : ""}
                    onChange={(event) => setResponse(question.id, event.target.value)}
                    rows={3}
                    style={{
                      width: "100%",
                      marginTop: "8px",
                      border: "1px solid #d1d5db",
                      borderRadius: "8px",
                      padding: "8px",
                      resize: "vertical",
                    }}
                  />
                )}

                {question.type === "single-choice" && (
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "8px" }}>
                    {(question.options ?? []).map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setResponse(question.id, option)}
                        aria-pressed={value === option}
                        style={{
                          border: "1px solid #d1d5db",
                          background: value === option ? "#111827" : "#fff",
                          color: value === option ? "#fff" : "#111827",
                          borderRadius: "999px",
                          padding: "4px 10px",
                          cursor: "pointer",
                        }}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}

                {question.type === "multi-choice" && (
                  <div style={{ display: "grid", gap: "6px", marginTop: "8px" }}>
                    {(question.options ?? []).map((option) => {
                      const selected = Array.isArray(value) ? value.includes(option) : false;
                      return (
                        <label
                          key={option}
                          style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px" }}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={(event) => {
                              const current = Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
                              if (event.target.checked) {
                                setResponse(question.id, [...current, option]);
                              } else {
                                setResponse(question.id, current.filter((item) => item !== option));
                              }
                            }}
                          />
                          {option}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <textarea
        value={feedback}
        onChange={(event) => setFeedback(event.target.value)}
        placeholder="Optional: tell us more"
        rows={3}
        style={{
          width: "100%",
          marginTop: "10px",
          border: "1px solid #d1d5db",
          borderRadius: "8px",
          padding: "8px",
          resize: "vertical",
        }}
      />

      {error && (
        <p style={{ margin: "8px 0 0", fontSize: "12px", color: "#b91c1c" }}>
          {error}
        </p>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", marginTop: "12px" }}>
        {showAskLater ? (
          <button
            type="button"
            onClick={askLater}
            style={{
              border: "1px solid #d1d5db",
              background: "#fff",
              borderRadius: "8px",
              padding: "6px 10px",
              cursor: "pointer",
            }}
          >
            {resolvedAskLaterLabel}
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={() => void submit()}
          disabled={isSubmitting}
          style={{
            border: "none",
            background: "#111827",
            color: "#fff",
            borderRadius: "8px",
            padding: "6px 10px",
            cursor: "pointer",
            opacity: isSubmitting ? 0.5 : 1,
          }}
        >
          {isSubmitting ? "Submitting..." : resolvedSubmitLabel}
        </button>
      </div>
    </section>
  );
}
