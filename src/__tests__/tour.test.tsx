import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tour } from "../react/components/tour";
import { useTour } from "../react/hooks/use-tour";

function TourHarness({ id }: { id: string }) {
  const {
    startTour,
    nextStep,
    prevStep,
    skipTour,
    currentStepIndex,
    totalSteps,
    isActive,
    currentStep,
  } = useTour(id);

  return (
    <div>
      <button onClick={startTour}>start</button>
      <button onClick={nextStep}>next</button>
      <button onClick={prevStep}>prev</button>
      <button onClick={skipTour}>skip</button>
      <span data-testid="tour-active">{isActive ? "yes" : "no"}</span>
      <span data-testid="tour-index">{currentStepIndex}</span>
      <span data-testid="tour-total">{totalSteps}</span>
      <span data-testid="tour-step">{currentStep?.id ?? "none"}</span>
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

describe("Tour + useTour", () => {
  it("starts, navigates, and completes a tour", async () => {
    const onComplete = vi.fn();
    render(
      <>
        <div id="target-a">A</div>
        <div id="target-b">B</div>
        <TourHarness id="onboarding" />
        <Tour
          id="onboarding"
          steps={[
            { id: "step-a", target: "#target-a", title: "Step A", content: "Alpha" },
            { id: "step-b", target: "#target-b", title: "Step B", content: "Beta" },
          ]}
          onComplete={onComplete}
        />
      </>,
    );

    await userEvent.click(screen.getByText("start"));
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeDefined();
    });
    expect(screen.getByText("Step A")).toBeDefined();
    expect(screen.getByTestId("tour-index").textContent).toBe("0");

    await userEvent.click(screen.getByText("Next"));
    expect(screen.getByText("Step B")).toBeDefined();
    await waitFor(() => {
      expect(screen.getByTestId("tour-index").textContent).toBe("1");
    });

    await userEvent.click(screen.getByText("Finish"));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
    expect(onComplete).toHaveBeenCalledOnce();
    expect(screen.getByTestId("tour-active").textContent).toBe("no");
  });

  it("skips steps with missing target elements", async () => {
    render(
      <>
        <div id="target-b">B</div>
        <TourHarness id="missing-target-tour" />
        <Tour
          id="missing-target-tour"
          steps={[
            { id: "missing", target: "#nope", title: "Missing", content: "No target" },
            { id: "valid", target: "#target-b", title: "Valid", content: "Exists" },
          ]}
        />
      </>,
    );

    await userEvent.click(screen.getByText("start"));
    await waitFor(() => {
      expect(screen.getByText("Valid")).toBeDefined();
    });
    expect(screen.getByTestId("tour-step").textContent).toBe("valid");
  });

  it("handles keyboard escape as skip", async () => {
    const onSkip = vi.fn();
    render(
      <>
        <div id="target-a">A</div>
        <TourHarness id="keyboard-tour" />
        <Tour
          id="keyboard-tour"
          steps={[{ id: "step-a", target: "#target-a", title: "Step A", content: "Alpha" }]}
          onSkip={onSkip}
        />
      </>,
    );

    const startButton = screen.getByText("start");
    await userEvent.click(startButton);
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeDefined();
    });
    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.getAttribute("aria-labelledby")).toContain("featuredrop-tour-");
    expect(dialog.getAttribute("aria-describedby")).toContain("featuredrop-tour-");

    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
    expect(onSkip).toHaveBeenCalledWith("step-a");
    expect(document.activeElement).toBe(startButton);
  });

  it("resumes from persisted step index", async () => {
    localStorage.setItem("featuredrop:tour:persisted:step", "1");
    render(
      <>
        <div id="target-a">A</div>
        <div id="target-b">B</div>
        <Tour
          id="persisted"
          steps={[
            { id: "step-a", target: "#target-a", title: "Step A", content: "Alpha" },
            { id: "step-b", target: "#target-b", title: "Step B", content: "Beta" },
          ]}
        />
      </>,
    );

    await waitFor(() => {
      expect(screen.getByText("Step B")).toBeDefined();
    });
  });
});
