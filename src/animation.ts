import type { FeatureDropAnimationPreset } from "./types";

export const FEATUREDROP_ANIMATION_PRESETS = [
  "none",
  "subtle",
  "normal",
  "playful",
] as const satisfies readonly FeatureDropAnimationPreset[];

let injectedAnimationStyles = false;

export function ensureFeatureDropAnimationStyles(): void {
  if (injectedAnimationStyles || typeof document === "undefined") return;
  injectedAnimationStyles = true;

  const style = document.createElement("style");
  style.setAttribute("data-featuredrop-animations", "true");
  style.textContent = `
    @keyframes featuredrop-enter-fade-up {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes featuredrop-enter-scale {
      from { opacity: 0; transform: scale(0.96); }
      to { opacity: 1; transform: scale(1); }
    }
    @keyframes featuredrop-enter-panel {
      from { opacity: 0; transform: translateX(14px); }
      to { opacity: 1; transform: translateX(0); }
    }
    @keyframes featuredrop-enter-pop {
      0% { opacity: 0; transform: translateY(12px) scale(0.94); }
      70% { opacity: 1; transform: translateY(-2px) scale(1.02); }
      100% { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes featuredrop-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.55; }
    }
    @keyframes featuredrop-pulse-playful {
      0%, 100% { opacity: 1; transform: scale(1); }
      40% { opacity: 0.7; transform: scale(1.08); }
      70% { opacity: 0.9; transform: scale(0.96); }
    }
    @keyframes featuredrop-beacon-pulse {
      0%, 100% { transform: scale(1); opacity: 0.65; }
      50% { transform: scale(1.5); opacity: 0; }
    }
    @keyframes featuredrop-beacon-pop-pulse {
      0%, 100% { transform: scale(1); opacity: 0.72; }
      45% { transform: scale(1.65); opacity: 0.08; }
      75% { transform: scale(0.95); opacity: 0.28; }
    }
    @keyframes featuredrop-exit-fade-down {
      from { opacity: 1; transform: translateY(0); }
      to { opacity: 0; transform: translateY(8px); }
    }
    @keyframes featuredrop-exit-scale {
      from { opacity: 1; transform: scale(1); }
      to { opacity: 0; transform: scale(0.96); }
    }
    @keyframes featuredrop-exit-panel {
      from { opacity: 1; transform: translateX(0); }
      to { opacity: 0; transform: translateX(14px); }
    }
    @keyframes featuredrop-exit-pop {
      from { opacity: 1; transform: translateY(0) scale(1); }
      to { opacity: 0; transform: translateY(10px) scale(0.96); }
    }
  `;
  document.head.appendChild(style);
}

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function resolveAnimationPreset(
  preset: FeatureDropAnimationPreset = "normal",
  options?: { reducedMotion?: boolean },
): FeatureDropAnimationPreset {
  if (options?.reducedMotion) return "none";
  return preset;
}

type AnimationSurface = "toast" | "panel" | "modal" | "popover";
type AnimationPhase = "enter" | "exit";
type PulseSurface = "dot" | "beacon";

export function getEnterAnimation(
  preset: FeatureDropAnimationPreset,
  surface: AnimationSurface,
): string | undefined {
  if (preset === "none") return undefined;

  if (preset === "subtle") {
    if (surface === "panel") return "featuredrop-enter-panel 180ms ease-out";
    if (surface === "modal") return "featuredrop-enter-scale 180ms ease-out";
    return "featuredrop-enter-fade-up 170ms ease-out";
  }

  if (preset === "playful") {
    if (surface === "panel") return "featuredrop-enter-panel 320ms cubic-bezier(0.2, 0.9, 0.2, 1)";
    return "featuredrop-enter-pop 300ms cubic-bezier(0.22, 1.4, 0.36, 1)";
  }

  if (surface === "panel") return "featuredrop-enter-panel 240ms cubic-bezier(0.2, 0.9, 0.2, 1)";
  if (surface === "modal") return "featuredrop-enter-scale 220ms cubic-bezier(0.2, 0.9, 0.2, 1)";
  return "featuredrop-enter-fade-up 210ms cubic-bezier(0.2, 0.9, 0.2, 1)";
}

export function getExitAnimation(
  preset: FeatureDropAnimationPreset,
  surface: AnimationSurface,
): string | undefined {
  if (preset === "none") return undefined;

  if (preset === "subtle") {
    if (surface === "panel") return "featuredrop-exit-panel 150ms ease-in forwards";
    if (surface === "modal") return "featuredrop-exit-scale 150ms ease-in forwards";
    return "featuredrop-exit-fade-down 140ms ease-in forwards";
  }

  if (preset === "playful") {
    if (surface === "panel") return "featuredrop-exit-panel 260ms ease-in forwards";
    return "featuredrop-exit-pop 240ms ease-in forwards";
  }

  if (surface === "panel") return "featuredrop-exit-panel 200ms ease-in forwards";
  if (surface === "modal") return "featuredrop-exit-scale 190ms ease-in forwards";
  return "featuredrop-exit-fade-down 180ms ease-in forwards";
}

export function getPulseAnimation(
  preset: FeatureDropAnimationPreset,
  surface: PulseSurface = "beacon",
): string | undefined {
  if (preset === "none") return undefined;

  if (surface === "dot") {
    if (preset === "subtle") return "featuredrop-pulse 2.6s ease-in-out infinite";
    if (preset === "playful") {
      return "featuredrop-pulse-playful 1.8s cubic-bezier(0.22, 1.4, 0.36, 1) infinite";
    }
    return "featuredrop-pulse 2s ease-in-out infinite";
  }

  if (preset === "subtle") return "featuredrop-beacon-pulse 2.6s ease-in-out infinite";
  if (preset === "playful") {
    return "featuredrop-beacon-pop-pulse 1.8s cubic-bezier(0.22, 1.4, 0.36, 1) infinite";
  }
  return "featuredrop-beacon-pulse 2s ease-in-out infinite";
}

export function getAnimationDurationMs(
  preset: FeatureDropAnimationPreset,
  surface: AnimationSurface,
  phase: AnimationPhase,
): number {
  if (preset === "none") return 0;
  const animation = phase === "enter"
    ? getEnterAnimation(preset, surface)
    : getExitAnimation(preset, surface);
  if (!animation) return 0;

  const msMatch = animation.match(/(\d+)ms/);
  if (msMatch?.[1]) return Number(msMatch[1]);

  const sMatch = animation.match(/(\d+(?:\.\d+)?)s/);
  if (sMatch?.[1]) return Math.round(Number(sMatch[1]) * 1000);

  return 0;
}
