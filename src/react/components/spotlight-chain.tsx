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
import {
  ensureFeatureDropAnimationStyles,
  getEnterAnimation,
  getPulseAnimation,
  prefersReducedMotion,
  resolveAnimationPreset,
} from "../../animation";
import { FeatureDropContext } from "../context";

export interface SpotlightChainStep {
  id?: string;
  target: string;
  title?: string;
  content: ReactNode;
  autoAdvanceMs?: number;
}

export interface SpotlightChainRenderProps {
  isActive: boolean;
  currentStep: SpotlightChainStep | null;
  currentStepIndex: number;
  totalSteps: number;
  start: () => void;
  next: () => void;
  skip: () => void;
}

export interface SpotlightChainProps {
  steps: SpotlightChainStep[];
  startOnMount?: boolean;
  autoAdvance?: boolean;
  autoAdvanceMs?: number;
  onComplete?: () => void;
  onStepViewed?: (step: SpotlightChainStep, index: number) => void;
  onSkip?: (step: SpotlightChainStep | null, index: number) => void;
  children?: (props: SpotlightChainRenderProps) => ReactNode;
}

const beaconStyles: CSSProperties = {
  position: "fixed",
  width: "14px",
  height: "14px",
  borderRadius: "999px",
  border: "2px solid #fff",
  background: "#f59e0b",
  boxShadow: "0 0 0 2px rgba(17,24,39,0.12)",
  zIndex: "var(--featuredrop-spotlight-chain-beacon-z-index, 10010)" as unknown as number,
};

const tooltipStyles: CSSProperties = {
  position: "fixed",
  zIndex: "var(--featuredrop-spotlight-chain-z-index, 10011)" as unknown as number,
  border: "1px solid #e5e7eb",
  borderRadius: "10px",
  background: "#fff",
  padding: "12px",
  boxShadow: "0 10px 30px rgba(0,0,0,0.16)",
  width: "min(90vw, 320px)",
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

function resolveTarget(selector: string): HTMLElement | null {
  return document.querySelector(selector);
}

export function SpotlightChain({
  steps,
  startOnMount = true,
  autoAdvance = false,
  autoAdvanceMs = 2500,
  onComplete,
  onStepViewed,
  onSkip,
  children,
}: SpotlightChainProps) {
  const featureDrop = useContext(FeatureDropContext);
  const [isActive, setIsActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(-1);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const animation = useMemo(
    () =>
      resolveAnimationPreset(featureDrop?.animation ?? "normal", {
        reducedMotion: prefersReducedMotion(),
      }),
    [featureDrop?.animation],
  );
  const beaconPulseAnimation = useMemo(
    () => getPulseAnimation(animation, "beacon"),
    [animation],
  );
  const tooltipEnterAnimation = useMemo(
    () => getEnterAnimation(animation, "popover"),
    [animation],
  );
  const instanceIdRef = useRef(`featuredrop-spotlight-chain-${Math.random().toString(36).slice(2, 10)}`);

  const step = stepIndex >= 0 ? steps[stepIndex] ?? null : null;

  const findValidStep = useCallback((start: number): number | null => {
    for (let i = start; i < steps.length; i += 1) {
      if (resolveTarget(steps[i].target)) return i;
      // eslint-disable-next-line no-console
      console.warn(`[featuredrop] SpotlightChain step "${steps[i].id ?? i}" target not found, skipping.`);
    }
    return null;
  }, [steps]);

  const openStep = useCallback((index: number) => {
    const current = steps[index];
    if (!current) return;
    const target = resolveTarget(current.target);
    if (!target) return;
    const scrollable = target as HTMLElement & {
      scrollIntoView?: (options?: ScrollIntoViewOptions) => void;
    };
    if (typeof scrollable.scrollIntoView === "function") {
      scrollable.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    setStepIndex(index);
    setIsActive(true);
    setRect(target.getBoundingClientRect());
    onStepViewed?.(current, index);
  }, [onStepViewed, steps]);

  const finish = useCallback(() => {
    setIsActive(false);
    setStepIndex(-1);
    setRect(null);
    onComplete?.();
  }, [onComplete]);

  const start = useCallback(() => {
    const first = findValidStep(0);
    if (first === null) return;
    openStep(first);
  }, [findValidStep, openStep]);

  const next = useCallback(() => {
    const nextIndex = findValidStep(stepIndex + 1);
    if (nextIndex === null) {
      finish();
      return;
    }
    openStep(nextIndex);
  }, [findValidStep, finish, openStep, stepIndex]);

  const skip = useCallback(() => {
    onSkip?.(step, stepIndex);
    setIsActive(false);
    setStepIndex(-1);
    setRect(null);
  }, [onSkip, step, stepIndex]);

  useEffect(() => {
    ensureFeatureDropAnimationStyles();
  }, []);

  useEffect(() => {
    if (!startOnMount) return;
    start();
  }, [start, startOnMount]);

  useEffect(() => {
    if (!isActive || !step) return;
    const update = () => {
      const target = resolveTarget(step.target);
      if (!target) return;
      setRect(target.getBoundingClientRect());
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [isActive, step]);

  useEffect(() => {
    if (!isActive || !step || !autoAdvance) return;
    const waitMs = step.autoAdvanceMs ?? autoAdvanceMs;
    autoTimerRef.current = setTimeout(() => {
      next();
    }, waitMs);
    return () => {
      if (autoTimerRef.current) {
        clearTimeout(autoTimerRef.current);
        autoTimerRef.current = null;
      }
    };
  }, [autoAdvance, autoAdvanceMs, isActive, next, step]);

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

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        skip();
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        next();
        return;
      }

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

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isActive, next, skip, stepIndex]);

  const renderProps: SpotlightChainRenderProps = useMemo(() => ({
    isActive,
    currentStep: step,
    currentStepIndex: stepIndex,
    totalSteps: steps.length,
    start,
    next,
    skip,
  }), [isActive, next, skip, start, step, stepIndex, steps.length]);

  if (children) {
    return <>{children(renderProps)}</>;
  }

  if (!isActive || !step || !rect) return null;

  const tooltipTop = Math.min(window.innerHeight - 150, rect.bottom + 12);
  const tooltipLeft = Math.min(window.innerWidth - 340, Math.max(10, rect.left));
  const titleId = `${instanceIdRef.current}-title`;
  const contentId = `${instanceIdRef.current}-content`;

  return (
    <>
      <div
        data-featuredrop-spotlight-chain-beacon={step.id ?? stepIndex}
        style={{
          ...beaconStyles,
          animation: beaconPulseAnimation ?? "none",
          top: rect.top - 7,
          left: rect.right - 7,
        }}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="false"
        aria-labelledby={step.title ? titleId : undefined}
        aria-describedby={contentId}
        data-featuredrop-spotlight-chain={step.id ?? stepIndex}
        tabIndex={-1}
        style={{
          ...tooltipStyles,
          top: tooltipTop,
          left: tooltipLeft,
          animation: tooltipEnterAnimation,
        }}
      >
        {step.title && (
          <p id={titleId} style={{ margin: "0 0 6px", fontWeight: 700, fontSize: "15px" }}>
            {step.title}
          </p>
        )}
        <div id={contentId} style={{ margin: "0 0 10px", fontSize: "14px", color: "#4b5563" }}>
          {step.content}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
          <button
            type="button"
            onClick={skip}
            style={{
              border: "1px solid #e5e7eb",
              background: "#fff",
              borderRadius: "8px",
              padding: "6px 10px",
              cursor: "pointer",
            }}
          >
            {featureDrop?.translations.skip ?? "Skip"}
          </button>
          <button
            type="button"
            onClick={next}
            style={{
              border: "none",
              background: "#111827",
              color: "#fff",
              borderRadius: "8px",
              padding: "6px 10px",
              cursor: "pointer",
            }}
          >
            {stepIndex >= steps.length - 1
              ? (featureDrop?.translations.gotIt ?? "Got it")
              : (featureDrop?.translations.next ?? "Next")}
          </button>
        </div>
      </div>
    </>
  );
}
