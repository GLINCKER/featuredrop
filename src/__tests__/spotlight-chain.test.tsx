import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SpotlightChain } from "../react/components/spotlight-chain";

describe("SpotlightChain", () => {
  it("walks through steps and completes", async () => {
    const onComplete = vi.fn();
    render(
      <>
        <button id="target-a">A</button>
        <button id="target-b">B</button>
        <SpotlightChain
          steps={[
            { id: "a", target: "#target-a", title: "Step A", content: "First" },
            { id: "b", target: "#target-b", title: "Step B", content: "Second" },
          ]}
          onComplete={onComplete}
        />
      </>,
    );

    await waitFor(() => {
      expect(screen.getByText("Step A")).toBeDefined();
    });

    await userEvent.click(screen.getByText("Next"));
    await waitFor(() => {
      expect(screen.getByText("Step B")).toBeDefined();
    });

    await userEvent.click(screen.getByText("Got it"));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it("skips missing targets and opens next available step", async () => {
    render(
      <>
        <button id="target-b">B</button>
        <SpotlightChain
          steps={[
            { id: "missing", target: "#does-not-exist", title: "Missing", content: "Skip me" },
            { id: "present", target: "#target-b", title: "Present", content: "Visible" },
          ]}
        />
      </>,
    );

    await waitFor(() => {
      expect(screen.getByText("Present")).toBeDefined();
    });
  });

  it("auto-advances when enabled", async () => {
    render(
      <>
        <button id="target-c">C</button>
        <button id="target-d">D</button>
        <SpotlightChain
          autoAdvance={true}
          autoAdvanceMs={20}
          steps={[
            { id: "c", target: "#target-c", title: "One", content: "First" },
            { id: "d", target: "#target-d", title: "Two", content: "Second" },
          ]}
        />
      </>,
    );

    await waitFor(() => {
      expect(screen.getByText("One")).toBeDefined();
    });
    await waitFor(() => {
      expect(screen.getByText("Two")).toBeDefined();
    });
  });

  it("supports Escape keyboard close for active dialog", async () => {
    render(
      <>
        <button id="target-e">E</button>
        <SpotlightChain
          steps={[
            { id: "e", target: "#target-e", title: "Step E", content: "Escape me" },
          ]}
        />
      </>,
    );

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeDefined();
    });
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });
});
