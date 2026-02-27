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
  registerChecklistController,
  type ChecklistController,
  type ChecklistSnapshot,
} from "../checklist-registry";
import { getTourController } from "../tour-registry";
import { FeatureDropContext } from "../context";

export interface ChecklistTask {
  id: string;
  title: string;
  description?: string;
  completed?: boolean;
  completionEvent?: string;
  action?: {
    type: "tour" | "link" | "callback";
    target: string;
  };
  icon?: ReactNode;
  estimatedTime?: string;
}

export interface ChecklistRenderProps {
  tasks: ChecklistTask[];
  completedIds: Set<string>;
  completeTask: (taskId: string) => void;
  resetChecklist: () => void;
  dismissChecklist: () => void;
  isComplete: boolean;
  progress: { completed: number; total: number; percent: number };
  collapsed: boolean;
  toggleCollapsed: () => void;
}

export interface ChecklistProps {
  id: string;
  tasks: ChecklistTask[];
  position?:
    | "bottom-right"
    | "bottom-left"
    | "top-right"
    | "top-left"
    | "inline";
  collapsible?: boolean;
  showProgress?: boolean;
  onComplete?: () => void;
  dismissible?: boolean;
  actionHandlers?: Record<string, () => void>;
  children?: (props: ChecklistRenderProps) => ReactNode;
}

interface PersistedChecklistState {
  completedIds: string[];
  dismissed: boolean;
  collapsed: boolean;
}

const containerBaseStyles: CSSProperties = {
  width: "min(92vw, 360px)",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  background: "#ffffff",
  boxShadow: "0 10px 28px rgba(0,0,0,0.12)",
  padding: "12px",
  zIndex: "var(--featuredrop-checklist-z-index, 10000)" as unknown as number,
};

const positionStyles: Record<NonNullable<ChecklistProps["position"]>, CSSProperties> = {
  "bottom-right": { position: "fixed", right: "16px", bottom: "16px" },
  "bottom-left": { position: "fixed", left: "16px", bottom: "16px" },
  "top-right": { position: "fixed", right: "16px", top: "16px" },
  "top-left": { position: "fixed", left: "16px", top: "16px" },
  inline: {},
};

function getStorageKey(id: string): string {
  return `featuredrop:checklist:${id}:state`;
}

function readPersistedState(id: string): PersistedChecklistState | null {
  const storage = globalThis.localStorage as unknown as {
    getItem?: (key: string) => string | null;
  };
  if (!storage || typeof storage.getItem !== "function") return null;
  try {
    const raw = storage.getItem(getStorageKey(id));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedChecklistState;
    if (!parsed || typeof parsed !== "object") return null;
    if (!Array.isArray(parsed.completedIds)) return null;
    return {
      completedIds: parsed.completedIds.filter((value): value is string => typeof value === "string"),
      dismissed: !!parsed.dismissed,
      collapsed: !!parsed.collapsed,
    };
  } catch {
    return null;
  }
}

function writePersistedState(id: string, state: PersistedChecklistState): void {
  const storage = globalThis.localStorage as unknown as {
    setItem?: (key: string, value: string) => void;
  };
  if (!storage || typeof storage.setItem !== "function") return;
  try {
    storage.setItem(getStorageKey(id), JSON.stringify(state));
  } catch {
    // noop
  }
}

function parseCompletionEvent(value: string): { selector: string; event: string } | null {
  const parts = value.split(":");
  if (parts.length < 2) return null;
  const selector = parts.slice(0, -1).join(":").trim();
  const event = parts[parts.length - 1].trim();
  if (!selector || !event) return null;
  return { selector, event };
}

export function Checklist({
  id,
  tasks,
  position = "bottom-right",
  collapsible = true,
  showProgress = true,
  onComplete,
  dismissible = true,
  actionHandlers,
  children,
}: ChecklistProps) {
  const context = useContext(FeatureDropContext);
  const persisted = useMemo(() => readPersistedState(id), [id]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    for (const task of tasks) {
      if (task.completed) initial.add(task.id);
    }
    for (const taskId of persisted?.completedIds ?? []) initial.add(taskId);
    return initial;
  });
  const [dismissed, setDismissed] = useState<boolean>(persisted?.dismissed ?? false);
  const [collapsed, setCollapsed] = useState<boolean>(persisted?.collapsed ?? false);
  const listenersRef = useRef(new Set<() => void>());

  const progress = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.reduce(
      (count, task) => count + (completedIds.has(task.id) ? 1 : 0),
      0,
    );
    const percent = total === 0 ? 100 : Math.round((completed / total) * 100);
    return { completed, total, percent };
  }, [completedIds, tasks]);

  const isComplete = progress.total > 0 && progress.completed >= progress.total;

  const emit = useCallback(() => {
    for (const listener of listenersRef.current) listener();
  }, []);

  const persist = useCallback((next?: {
    completedIds?: Set<string>;
    dismissed?: boolean;
    collapsed?: boolean;
  }) => {
    writePersistedState(id, {
      completedIds: Array.from(next?.completedIds ?? completedIds),
      dismissed: next?.dismissed ?? dismissed,
      collapsed: next?.collapsed ?? collapsed,
    });
  }, [collapsed, completedIds, dismissed, id]);

  const completeTask = useCallback((taskId: string) => {
    setCompletedIds((previous) => {
      if (previous.has(taskId)) return previous;
      const next = new Set(previous);
      next.add(taskId);
      persist({ completedIds: next });
      context?.trackAdoptionEvent({
        type: "checklist_task_completed",
        metadata: { checklistId: id, taskId },
      });
      return next;
    });
  }, [context, id, persist]);

  const resetChecklist = useCallback(() => {
    const next = new Set<string>();
    for (const task of tasks) {
      if (task.completed) next.add(task.id);
    }
    setCompletedIds(next);
    setDismissed(false);
    setCollapsed(false);
    persist({ completedIds: next, dismissed: false, collapsed: false });
  }, [persist, tasks]);

  const dismissChecklist = useCallback(() => {
    setDismissed(true);
    persist({ dismissed: true });
  }, [persist]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((previous) => {
      const next = !previous;
      persist({ collapsed: next });
      return next;
    });
  }, [persist]);

  useEffect(() => {
    if (!isComplete) return;
    context?.trackAdoptionEvent({
      type: "checklist_completed",
      metadata: { checklistId: id },
    });
    onComplete?.();
  }, [context, id, isComplete, onComplete]);

  useEffect(() => {
    emit();
  }, [collapsed, completedIds, dismissed, emit, progress.completed, progress.percent, progress.total, isComplete]);

  useEffect(() => {
    const cleanups: Array<() => void> = [];
    for (const task of tasks) {
      if (!task.completionEvent || completedIds.has(task.id)) continue;
      const parsed = parseCompletionEvent(task.completionEvent);
      if (!parsed) continue;
      const target = document.querySelector(parsed.selector);
      if (!target) continue;
      const handler = () => completeTask(task.id);
      target.addEventListener(parsed.event, handler);
      cleanups.push(() => target.removeEventListener(parsed.event, handler));
    }
    return () => {
      for (const cleanup of cleanups) cleanup();
    };
  }, [completeTask, completedIds, tasks]);

  useEffect(() => {
    const controller: ChecklistController = {
      completeTask,
      resetChecklist,
      dismissChecklist,
      toggleCollapsed,
      getSnapshot: (): ChecklistSnapshot => ({
        exists: true,
        tasks: tasks.map((task) => ({
          id: task.id,
          completed: completedIds.has(task.id),
        })),
        progress,
        isComplete,
        dismissed,
        collapsed,
      }),
      subscribe: (listener) => {
        listenersRef.current.add(listener);
        return () => {
          listenersRef.current.delete(listener);
        };
      },
    };
    return registerChecklistController(id, controller);
  }, [collapsed, completeTask, completedIds, dismissChecklist, dismissed, id, isComplete, progress, resetChecklist, tasks, toggleCollapsed]);

  const runTaskAction = (task: ChecklistTask): void => {
    const action = task.action;
    if (!action) return;
    if (action.type === "tour") {
      getTourController(action.target)?.startTour();
      return;
    }
    if (action.type === "link") {
      if (typeof window !== "undefined") {
        window.location.assign(action.target);
      }
      return;
    }
    if (action.type === "callback") {
      actionHandlers?.[action.target]?.();
    }
  };

  const renderProps: ChecklistRenderProps = {
    tasks,
    completedIds,
    completeTask,
    resetChecklist,
    dismissChecklist,
    isComplete,
    progress,
    collapsed,
    toggleCollapsed,
  };

  if (children) {
    return <>{children(renderProps)}</>;
  }

  if (dismissed) return null;

  return (
    <div
      data-featuredrop-checklist={id}
      style={{
        ...containerBaseStyles,
        ...positionStyles[position],
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
        <strong>Getting Started</strong>
        <div style={{ display: "flex", gap: "6px" }}>
          {collapsible && (
            <button
              onClick={toggleCollapsed}
              style={{ border: "none", background: "transparent", cursor: "pointer" }}
              aria-label={collapsed ? "Expand checklist" : "Collapse checklist"}
            >
              {collapsed ? "+" : "-"}
            </button>
          )}
          {dismissible && (
            <button
              onClick={dismissChecklist}
              style={{ border: "none", background: "transparent", cursor: "pointer" }}
              aria-label="Dismiss checklist"
            >
              x
            </button>
          )}
        </div>
      </div>

      {showProgress && (
        <div style={{ marginTop: "8px", marginBottom: collapsed ? 0 : "8px" }}>
          <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>
            {progress.completed} of {progress.total} complete
          </div>
          <div style={{ height: "6px", borderRadius: "999px", background: "#e5e7eb" }}>
            <div
              style={{
                height: "100%",
                width: `${progress.percent}%`,
                borderRadius: "999px",
                background: "#10b981",
                transition: "width 160ms ease",
              }}
            />
          </div>
        </div>
      )}

      {!collapsed && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {tasks.map((task) => {
            const done = completedIds.has(task.id);
            return (
              <button
                key={task.id}
                onClick={() => {
                  completeTask(task.id);
                  runTaskAction(task);
                }}
                style={{
                  textAlign: "left",
                  border: "1px solid #e5e7eb",
                  background: done ? "#ecfdf5" : "#fff",
                  borderRadius: "8px",
                  padding: "8px 10px",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span>{task.icon ?? (done ? "✓" : "○")}</span>
                    <span style={{ fontWeight: 600 }}>{task.title}</span>
                  </div>
                  {task.estimatedTime && (
                    <span style={{ fontSize: "11px", color: "#6b7280" }}>{task.estimatedTime}</span>
                  )}
                </div>
                {task.description && (
                  <p style={{ margin: "4px 0 0 24px", fontSize: "12px", color: "#6b7280" }}>
                    {task.description}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
