import type { TourStep } from "./components/tour";

export interface TourSnapshot {
  isActive: boolean;
  currentStepIndex: number;
  currentStep: TourStep | null;
  totalSteps: number;
}

export interface TourController {
  startTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTour: () => void;
  closeTour: () => void;
  getSnapshot: () => TourSnapshot;
  subscribe: (listener: () => void) => () => void;
}

const controllers = new Map<string, TourController>();
const registryListeners = new Map<string, Set<() => void>>();

function emitRegistry(id: string): void {
  const listeners = registryListeners.get(id);
  if (!listeners) return;
  for (const listener of listeners) listener();
}

export function registerTourController(id: string, controller: TourController): () => void {
  controllers.set(id, controller);
  emitRegistry(id);
  return () => {
    if (controllers.get(id) === controller) {
      controllers.delete(id);
      emitRegistry(id);
    }
  };
}

export function getTourController(id: string): TourController | undefined {
  return controllers.get(id);
}

export function subscribeTourRegistry(id: string, listener: () => void): () => void {
  const listeners = registryListeners.get(id) ?? new Set<() => void>();
  listeners.add(listener);
  registryListeners.set(id, listeners);
  return () => {
    const current = registryListeners.get(id);
    if (!current) return;
    current.delete(listener);
    if (current.size === 0) {
      registryListeners.delete(id);
    }
  };
}
