import type { SurveyType } from "./components/survey";

export interface SurveySnapshot {
  exists: boolean;
  isOpen: boolean;
  submitted: boolean;
  canShow: boolean;
  type: SurveyType;
}

export interface SurveyController {
  show: (options?: { force?: boolean }) => boolean;
  hide: () => void;
  askLater: () => void;
  getSnapshot: () => SurveySnapshot;
  subscribe: (listener: () => void) => () => void;
}

const controllers = new Map<string, SurveyController>();
const registryListeners = new Map<string, Set<() => void>>();

function emitRegistry(id: string): void {
  const listeners = registryListeners.get(id);
  if (!listeners) return;
  for (const listener of listeners) listener();
}

export function registerSurveyController(id: string, controller: SurveyController): () => void {
  controllers.set(id, controller);
  emitRegistry(id);
  return () => {
    if (controllers.get(id) === controller) {
      controllers.delete(id);
      emitRegistry(id);
    }
  };
}

export function getSurveyController(id: string): SurveyController | undefined {
  return controllers.get(id);
}

export function subscribeSurveyRegistry(id: string, listener: () => void): () => void {
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
