import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Checklist } from "../react/components/checklist";
import { useChecklist } from "../react/hooks/use-checklist";

function ChecklistHarness({ id }: { id: string }) {
  const {
    completeTask,
    resetChecklist,
    isComplete,
    progress,
    dismissed,
    collapsed,
  } = useChecklist(id);

  return (
    <div>
      <button onClick={() => completeTask("task-2")}>complete-task-2</button>
      <button onClick={resetChecklist}>reset</button>
      <span data-testid="checklist-complete">{isComplete ? "yes" : "no"}</span>
      <span data-testid="checklist-progress">
        {progress.completed}/{progress.total}
      </span>
      <span data-testid="checklist-dismissed">{dismissed ? "yes" : "no"}</span>
      <span data-testid="checklist-collapsed">{collapsed ? "yes" : "no"}</span>
    </div>
  );
}

beforeEach(() => {
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Checklist + useChecklist", () => {
  it("tracks progress and completes tasks", async () => {
    const onComplete = vi.fn();
    render(
      <>
        <ChecklistHarness id="getting-started" />
        <Checklist
          id="getting-started"
          tasks={[
            { id: "task-1", title: "Create profile" },
            { id: "task-2", title: "Invite teammate" },
          ]}
          onComplete={onComplete}
        />
      </>,
    );

    expect(screen.getByTestId("checklist-progress").textContent).toBe("0/2");
    await userEvent.click(screen.getByText("Create profile"));
    expect(screen.getByTestId("checklist-progress").textContent).toBe("1/2");

    await userEvent.click(screen.getByText("complete-task-2"));
    expect(screen.getByTestId("checklist-progress").textContent).toBe("2/2");
    expect(screen.getByTestId("checklist-complete").textContent).toBe("yes");
    expect(onComplete).toHaveBeenCalled();
  });

  it("dismisses and collapses checklist", async () => {
    render(
      <>
        <ChecklistHarness id="dismiss-checklist" />
        <Checklist
          id="dismiss-checklist"
          tasks={[{ id: "task-1", title: "Create profile" }]}
        />
      </>,
    );

    await userEvent.click(screen.getByLabelText("Collapse checklist"));
    expect(screen.getByTestId("checklist-collapsed").textContent).toBe("yes");
    await userEvent.click(screen.getByLabelText("Dismiss checklist"));
    expect(screen.queryByText("Create profile")).toBeNull();
    expect(screen.getByTestId("checklist-dismissed").textContent).toBe("yes");
  });

  it("persists completed state across remount", async () => {
    const { unmount } = render(
      <Checklist
        id="persist-checklist"
        tasks={[
          { id: "task-1", title: "Create profile" },
          { id: "task-2", title: "Invite teammate" },
        ]}
      />,
    );

    await userEvent.click(screen.getByText("Create profile"));
    unmount();

    render(
      <Checklist
        id="persist-checklist"
        tasks={[
          { id: "task-1", title: "Create profile" },
          { id: "task-2", title: "Invite teammate" },
        ]}
      />,
    );

    const doneTask = screen.getByText("Create profile").closest("button");
    expect(doneTask?.textContent).toContain("✓");
  });
});
