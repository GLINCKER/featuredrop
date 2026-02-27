export interface ChecklistSnapshot {
  exists: boolean;
  tasks: Array<{ id: string; completed: boolean }>;
  progress: { completed: number; total: number; percent: number };
  isComplete: boolean;
  dismissed: boolean;
  collapsed: boolean;
}

export interface ChecklistController {
  completeTask: (taskId: string) => void;
  resetChecklist: () => void;
  dismissChecklist: () => void;
  toggleCollapsed: () => void;
  getSnapshot: () => ChecklistSnapshot;
  subscribe: (listener: () => void) => () => void;
}

const controllers = new Map<string, ChecklistController>();
const registryListeners = new Map<string, Set<() => void>>();

function emitRegistry(id: string): void {
  const listeners = registryListeners.get(id);
  if (!listeners) return;
  for (const listener of listeners) listener();
}

export function registerChecklistController(id: string, controller: ChecklistController): () => void {
  controllers.set(id, controller);
  emitRegistry(id);
  return () => {
    if (controllers.get(id) === controller) {
      controllers.delete(id);
      emitRegistry(id);
    }
  };
}

export function getChecklistController(id: string): ChecklistController | undefined {
  return controllers.get(id);
}

export function subscribeChecklistRegistry(id: string, listener: () => void): () => void {
  const listeners = registryListeners.get(id) ?? new Set<() => void>();
  listeners.add(listener);
  registryListeners.set(id, listeners);
  return () => {
    const current = registryListeners.get(id);
    if (!current) return;
    current.delete(listener);
    if (current.size === 0) registryListeners.delete(id);
  };
}
