import {
  useEffect,
  useContext,
  useMemo,
  useRef,
  useState,
  useCallback,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import { ensureFeatureDropAnimationStyles, getEnterAnimation } from "../../animation";
import {
  registerTourController,
  type TourController,
  type TourSnapshot,
} from "../tour-registry";
import { FeatureDropContext } from "../context";

export interface TourStep {
  id: string;
  target: string | RefObject<HTMLElement | null>;
  title: string;
  content: string | ReactNode;
  placement?: "top" | "bottom" | "left" | "right" | "auto";
  action?: "click" | "input" | "custom";
  advanceOn?: { selector: string; event: string };
  highlightTarget?: boolean;
  beforeStep?: () => Promise<void>;
  afterStep?: () => Promise<void>;
  skipable?: boolean;
}

export interface TourRenderProps {
  isActive: boolean;
  step: TourStep | null;
  stepIndex: number;
  totalSteps: number;
  startTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTour: () => void;
  closeTour: () => void;
}

export interface TourProps {
  id: string;
  steps: TourStep[];
  onComplete?: () => void;
  onSkip?: (stepId: string) => void;
  onTourStarted?: () => void;
  onTourCompleted?: () => void;
  onTourSkipped?: (stepId: string) => void;
  onStepViewed?: (step: TourStep, index: number) => void;
  overlay?: boolean;
  showProgress?: boolean;
  keyboard?: boolean;
  persistence?: boolean;
  children?: (props: TourRenderProps) => ReactNode;
}

const tourBoxStyles: CSSProperties = {
  position: "fixed",
  zIndex: "var(--featuredrop-tour-z-index, 10002)" as unknown as number,
  width: "min(92vw, 360px)",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  background: "#ffffff",
  boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
  padding: "14px",
};

const overlayStyles: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: "var(--featuredrop-tour-overlay-z-index, 10000)" as unknown as number,
  background: "rgba(17, 24, 39, 0.54)",
};

const highlightStyles: CSSProperties = {
  position: "fixed",
  pointerEvents: "none",
  zIndex: "var(--featuredrop-tour-highlight-z-index, 10001)" as unknown as number,
  borderRadius: "8px",
  boxShadow: "0 0 0 2px #f59e0b, 0 0 0 9999px rgba(17, 24, 39, 0.54)",
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

function getTargetElement(target: TourStep["target"]): HTMLElement | null {
  if (typeof target === "string") {
    return document.querySelector(target);
  }
  return target.current;
}

function getStorageKey(id: string): string {
  return `featuredrop:tour:${id}:step`;
}

function readPersistedStep(id: string): string | null {
  if (typeof window === "undefined") return null;
  const storage = globalThis.localStorage as unknown as {
    getItem?: (key: string) => string | null;
  };
  if (!storage || typeof storage.getItem !== "function") return null;
  try {
    return storage.getItem(getStorageKey(id));
  } catch {
    return null;
  }
}

function writePersistedStep(id: string, stepIndex: number): void {
  if (typeof window === "undefined") return;
  const storage = globalThis.localStorage as unknown as {
    setItem?: (key: string, value: string) => void;
  };
  if (!storage || typeof storage.setItem !== "function") return;
  try {
    storage.setItem(getStorageKey(id), String(stepIndex));
  } catch {
    // noop
  }
}

function clearPersistedStep(id: string): void {
  if (typeof window === "undefined") return;
  const storage = globalThis.localStorage as unknown as {
    removeItem?: (key: string) => void;
  };
  if (!storage || typeof storage.removeItem !== "function") return;
  try {
    storage.removeItem(getStorageKey(id));
  } catch {
    // noop
  }
}

function resolvePosition(
  rect: DOMRect,
  placement: TourStep["placement"],
): { top: number; left: number } {
  const margin = 12;
  const width = 360;
  const height = 180;
  const viewportWidth = typeof window === "undefined" ? 1200 : window.innerWidth;
  const viewportHeight = typeof window === "undefined" ? 800 : window.innerHeight;

  const chosen = placement === "auto"
    ? rect.top > height + margin
      ? "top"
      : "bottom"
    : placement ?? "bottom";

  if (chosen === "top") {
    return {
      top: Math.max(margin, rect.top - height - margin),
      left: Math.min(viewportWidth - width - margin, Math.max(margin, rect.left)),
    };
  }
  if (chosen === "left") {
    return {
      top: Math.min(viewportHeight - height - margin, Math.max(margin, rect.top)),
      left: Math.max(margin, rect.left - width - margin),
    };
  }
  if (chosen === "right") {
    return {
      top: Math.min(viewportHeight - height - margin, Math.max(margin, rect.top)),
      left: Math.min(viewportWidth - width - margin, rect.right + margin),
    };
  }
  return {
    top: Math.min(viewportHeight - height - margin, rect.bottom + margin),
    left: Math.min(viewportWidth - width - margin, Math.max(margin, rect.left)),
  };
}

export function Tour({
  id,
  steps,
  onComplete,
  onSkip,
  onTourStarted,
  onTourCompleted,
  onTourSkipped,
  onStepViewed,
  overlay = true,
  showProgress = true,
  keyboard = true,
  persistence = true,
  children,
}: TourProps) {
  const context = useContext(FeatureDropContext);
  const dialogAnimation = useMemo(
    () => getEnterAnimation(context?.animation ?? "normal", "popover"),
    [context?.animation],
  );
  const [isActive, setIsActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(-1);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const listenersRef = useRef(new Set<() => void>());
  const dialogRef = useRef<HTMLDivElement>(null);
  const lastFocusedElementRef = useRef<HTMLElement | null>(null);
  const instanceIdRef = useRef(`featuredrop-tour-${Math.random().toString(36).slice(2, 10)}`);

  const step = stepIndex >= 0 ? steps[stepIndex] ?? null : null;

  const emit = useCallback(() => {
    for (const listener of listenersRef.current) listener();
  }, []);

  const snapshot = useCallback((): TourSnapshot => ({
    isActive,
    currentStepIndex: stepIndex,
    currentStep: step,
    totalSteps: steps.length,
  }), [isActive, stepIndex, step, steps.length]);

  const findValidStep = useCallback((fromIndex: number, direction: 1 | -1): number | null => {
    for (
      let i = fromIndex;
      i >= 0 && i < steps.length;
      i += direction
    ) {
      const targetEl = getTargetElement(steps[i].target);
      if (targetEl) return i;
      // eslint-disable-next-line no-console
      console.warn(`[featuredrop] Tour "${id}" step "${steps[i].id}" target not found, skipping.`);
    }
    return null;
  }, [id, steps]);

  const runAfterCurrentStep = useCallback(async () => {
    if (!step?.afterStep) return;
    try {
      await step.afterStep();
    } catch {
      // ignore callback failures to keep tour flow moving
    }
  }, [step]);

  const openStep = useCallback(async (index: number) => {
    const current = steps[index];
    if (!current) return;
    try {
      await current.beforeStep?.();
    } catch {
      // ignore callback failures to keep tour flow moving
    }

    const el = getTargetElement(current.target);
    if (!el) return;
    const scrollable = el as HTMLElement & {
      scrollIntoView?: (options?: ScrollIntoViewOptions) => void;
    };
    if (typeof scrollable.scrollIntoView === "function") {
      scrollable.scrollIntoView({ block: "center", behavior: "smooth" });
    }
    setStepIndex(index);
    setIsActive(true);
    onStepViewed?.(current, index);
  }, [onStepViewed, steps]);

  const closeTour = useCallback(async () => {
    await runAfterCurrentStep();
    setIsActive(false);
    setStepIndex(-1);
    if (persistence) clearPersistedStep(id);
    const returnTarget = lastFocusedElementRef.current;
    if (returnTarget) {
      if (typeof requestAnimationFrame === "function") {
        requestAnimationFrame(() => returnTarget.focus());
      } else {
        returnTarget.focus();
      }
    }
  }, [id, persistence, runAfterCurrentStep]);

  const startTour = useCallback(async () => {
    if (context && !context.canShowTour()) return;
    if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
      lastFocusedElementRef.current = document.activeElement;
    }
    const next = findValidStep(0, 1);
    if (next === null) return;
    context?.trackAdoptionEvent({ type: "tour_started", tourId: id });
    onTourStarted?.();
    await openStep(next);
    context?.markTourShown();
  }, [context, findValidStep, id, onTourStarted, openStep]);

  const nextStep = useCallback(async () => {
    await runAfterCurrentStep();
    const next = findValidStep(stepIndex + 1, 1);
    if (next === null) {
      context?.trackAdoptionEvent({ type: "tour_completed", tourId: id });
      onComplete?.();
      onTourCompleted?.();
      await closeTour();
      return;
    }
    await openStep(next);
  }, [closeTour, context, findValidStep, id, onComplete, onTourCompleted, openStep, runAfterCurrentStep, stepIndex]);

  const prevStep = useCallback(async () => {
    await runAfterCurrentStep();
    const prev = findValidStep(stepIndex - 1, -1);
    if (prev === null) return;
    await openStep(prev);
  }, [findValidStep, openStep, runAfterCurrentStep, stepIndex]);

  const skipTour = useCallback(async () => {
    const stepId = step?.id ?? "";
    context?.trackAdoptionEvent({ type: "tour_skipped", tourId: id, metadata: { stepId } });
    onSkip?.(stepId);
    onTourSkipped?.(stepId);
    await closeTour();
  }, [closeTour, context, id, onSkip, onTourSkipped, step]);

  useEffect(() => {
    if (!persistence) return;
    if (context && !context.canShowTour()) return;
    const raw = readPersistedStep(id);
    if (!raw) return;
    const persisted = Number(raw);
    if (!Number.isInteger(persisted) || persisted < 0) return;
    const next = findValidStep(persisted, 1);
    if (next === null) return;
    void openStep(next);
    context?.markTourShown();
  }, [context, findValidStep, id, openStep, persistence]);

  useEffect(() => {
    ensureFeatureDropAnimationStyles();
  }, []);

  useEffect(() => {
    if (!isActive || !step) return;
    const updateRect = () => {
      const el = getTargetElement(step.target);
      if (!el) return;
      setTargetRect(el.getBoundingClientRect());
    };
    updateRect();
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);
    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [isActive, step]);

  useEffect(() => {
    const advanceOn = step?.advanceOn;
    if (!isActive || !advanceOn) return;
    const el = document.querySelector(advanceOn.selector);
    if (!el) return;
    const handler = () => {
      void nextStep();
    };
    el.addEventListener(advanceOn.event, handler);
    return () => {
      el.removeEventListener(advanceOn.event, handler);
    };
  }, [isActive, nextStep, step]);

  useEffect(() => {
    if (!keyboard || !isActive) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        void nextStep();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        void prevStep();
      } else if (event.key === "Escape") {
        event.preventDefault();
        void skipTour();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isActive, keyboard, nextStep, prevStep, skipTour]);

  useEffect(() => {
    if (!isActive) return;
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
  }, [isActive, stepIndex]);

  useEffect(() => {
    emit();
  }, [emit, isActive, step, stepIndex]);

  useEffect(() => {
    if (!persistence || !isActive || stepIndex < 0) return;
    writePersistedStep(id, stepIndex);
  }, [id, isActive, persistence, stepIndex]);

  useEffect(() => {
    const controller: TourController = {
      startTour: () => void startTour(),
      nextStep: () => void nextStep(),
      prevStep: () => void prevStep(),
      skipTour: () => void skipTour(),
      closeTour: () => void closeTour(),
      getSnapshot: snapshot,
      subscribe: (listener) => {
        listenersRef.current.add(listener);
        return () => {
          listenersRef.current.delete(listener);
        };
      },
    };
    return registerTourController(id, controller);
  }, [closeTour, id, nextStep, prevStep, skipTour, snapshot, startTour]);

  const renderProps: TourRenderProps = useMemo(() => ({
    isActive,
    step,
    stepIndex,
    totalSteps: steps.length,
    startTour: () => void startTour(),
    nextStep: () => void nextStep(),
    prevStep: () => void prevStep(),
    skipTour: () => void skipTour(),
    closeTour: () => void closeTour(),
  }), [closeTour, isActive, nextStep, prevStep, skipTour, startTour, step, stepIndex, steps.length]);

  if (children) {
    return <>{children(renderProps)}</>;
  }

  if (!isActive || !step || !targetRect) return null;

  const tooltipPos = resolvePosition(targetRect, step.placement ?? "auto");
  const canSkip = step.skipable !== false;
  const titleId = `${instanceIdRef.current}-title`;
  const contentId = `${instanceIdRef.current}-content`;
  const progressId = `${instanceIdRef.current}-progress`;
  const t = context?.translations;

  return (
    <>
      {overlay && <div data-featuredrop-tour-overlay style={overlayStyles} aria-hidden="true" />}
      {(step.highlightTarget ?? true) && (
        <div
          data-featuredrop-tour-highlight
          style={{
            ...highlightStyles,
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
          }}
        />
      )}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal={overlay ? true : undefined}
        aria-labelledby={titleId}
        aria-describedby={showProgress ? `${contentId} ${progressId}` : contentId}
        data-featuredrop-tour={id}
        dir={context?.direction}
        tabIndex={-1}
        style={{
          ...tourBoxStyles,
          animation: dialogAnimation,
          top: tooltipPos.top,
          left: tooltipPos.left,
        }}
      >
        <p id={titleId} style={{ margin: "0 0 8px", fontSize: "16px", fontWeight: 700 }}>
          {step.title}
        </p>
        <div
          id={contentId}
          style={{ margin: "0 0 10px", fontSize: "14px", lineHeight: 1.5, color: "#4b5563" }}
        >
          {typeof step.content === "string" ? step.content : step.content}
        </div>
        {showProgress && (
          <p
            id={progressId}
            style={{ margin: "0 0 10px", fontSize: "12px", color: "#6b7280" }}
            aria-live="polite"
          >
            {t ? t.stepOf(stepIndex + 1, steps.length) : `Step ${stepIndex + 1} of ${steps.length}`}
          </p>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
          <button
            type="button"
            onClick={() => void prevStep()}
            disabled={stepIndex <= 0}
            style={{
              border: "1px solid #e5e7eb",
              background: "#fff",
              borderRadius: "8px",
              padding: "6px 10px",
              cursor: stepIndex <= 0 ? "not-allowed" : "pointer",
              opacity: stepIndex <= 0 ? 0.5 : 1,
            }}
          >
            {t?.back ?? "Back"}
          </button>
          <div style={{ display: "flex", gap: "8px" }}>
            {canSkip && (
              <button
                type="button"
                onClick={() => void skipTour()}
                style={{
                  border: "1px solid #e5e7eb",
                  background: "#fff",
                  borderRadius: "8px",
                  padding: "6px 10px",
                  cursor: "pointer",
                }}
              >
                {t?.skip ?? "Skip"}
              </button>
            )}
            <button
              type="button"
              onClick={() => void nextStep()}
              style={{
                border: "none",
                background: "#111827",
                color: "#fff",
                borderRadius: "8px",
                padding: "6px 10px",
                cursor: "pointer",
              }}
            >
              {stepIndex >= steps.length - 1 ? (t?.finish ?? "Finish") : (t?.next ?? "Next")}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
