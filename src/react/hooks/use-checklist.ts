import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getChecklistController,
  subscribeChecklistRegistry,
  type ChecklistSnapshot,
} from "../checklist-registry";

const EMPTY_SNAPSHOT: ChecklistSnapshot = {
  exists: false,
  tasks: [],
  progress: { completed: 0, total: 0, percent: 0 },
  isComplete: false,
  dismissed: false,
  collapsed: false,
};

export interface UseChecklistResult {
  completeTask: (taskId: string) => void;
  resetChecklist: () => void;
  dismissChecklist: () => void;
  toggleCollapsed: () => void;
  isComplete: boolean;
  progress: { completed: number; total: number; percent: number };
  tasks: Array<{ id: string; completed: boolean }>;
  dismissed: boolean;
  collapsed: boolean;
}

function readSnapshot(id: string): ChecklistSnapshot {
  const controller = getChecklistController(id);
  if (!controller) return EMPTY_SNAPSHOT;
  return controller.getSnapshot();
}

export function useChecklist(id: string): UseChecklistResult {
  const [snapshot, setSnapshot] = useState<ChecklistSnapshot>(() => readSnapshot(id));

  useEffect(() => {
    let unsubscribeController: (() => void) | null = null;

    const bind = (): void => {
      if (unsubscribeController) {
        unsubscribeController();
        unsubscribeController = null;
      }
      const controller = getChecklistController(id);
      if (!controller) {
        setSnapshot(EMPTY_SNAPSHOT);
        return;
      }
      setSnapshot(controller.getSnapshot());
      unsubscribeController = controller.subscribe(() => {
        setSnapshot(controller.getSnapshot());
      });
    };

    bind();
    const unsubscribeRegistry = subscribeChecklistRegistry(id, bind);
    return () => {
      unsubscribeRegistry();
      if (unsubscribeController) unsubscribeController();
    };
  }, [id]);

  const invoke = useCallback((method: "completeTask" | "resetChecklist" | "dismissChecklist" | "toggleCollapsed", arg?: string) => {
    const controller = getChecklistController(id);
    if (!controller) return;
    if (method === "completeTask") {
      controller.completeTask(arg ?? "");
      return;
    }
    controller[method]();
  }, [id]);

  return useMemo(
    () => ({
      completeTask: (taskId: string) => invoke("completeTask", taskId),
      resetChecklist: () => invoke("resetChecklist"),
      dismissChecklist: () => invoke("dismissChecklist"),
      toggleCollapsed: () => invoke("toggleCollapsed"),
      isComplete: snapshot.isComplete,
      progress: snapshot.progress,
      tasks: snapshot.tasks,
      dismissed: snapshot.dismissed,
      collapsed: snapshot.collapsed,
    }),
    [invoke, snapshot],
  );
}
