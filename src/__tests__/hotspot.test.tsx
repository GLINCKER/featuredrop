import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryAdapter } from "../adapters/memory";
import { FeatureDropProvider } from "../react/provider";
import { Hotspot, TooltipGroup } from "../react/components/hotspot";

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

describe("Hotspot", () => {
  it("opens tooltip on click", async () => {
    render(
      <>
        <button id="target-a">A</button>
        <Hotspot id="hs-a" target="#target-a" frequency="always">
          Tooltip content
        </Hotspot>
      </>,
    );

    await userEvent.click(screen.getByLabelText("Hotspot hs-a"));
    expect(screen.getByText("Tooltip content")).toBeDefined();
  });

  it("exposes beacon aria linkage and closes tooltip on Escape", async () => {
    render(
      <>
        <button id="target-k">K</button>
        <Hotspot id="hs-k" target="#target-k" frequency="always">
          Tooltip keyboard
        </Hotspot>
      </>,
    );

    const beacon = screen.getByLabelText("Hotspot hs-k");
    expect(beacon.getAttribute("aria-haspopup")).toBe("dialog");
    expect(beacon.getAttribute("aria-expanded")).toBe("false");

    await userEvent.click(beacon);
    expect(beacon.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("dialog")).toBeDefined();

    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
    expect(document.activeElement).toBe(beacon);
  });

  it("respects once frequency across remount", async () => {
    const { unmount } = render(
      <>
        <button id="target-b">B</button>
        <Hotspot id="hs-once" target="#target-b" frequency="once">
          Once tooltip
        </Hotspot>
      </>,
    );

    await userEvent.click(screen.getByLabelText("Hotspot hs-once"));
    await userEvent.click(screen.getByText("Dismiss"));
    expect(screen.queryByLabelText("Hotspot hs-once")).toBeNull();
    unmount();

    render(
      <>
        <button id="target-b">B</button>
        <Hotspot id="hs-once" target="#target-b" frequency="once">
          Once tooltip
        </Hotspot>
      </>,
    );

    expect(screen.queryByLabelText("Hotspot hs-once")).toBeNull();
  });

  it("limits visible tooltips with TooltipGroup", async () => {
    render(
      <>
        <button id="target-c">C</button>
        <button id="target-d">D</button>
        <TooltipGroup maxVisible={1}>
          <Hotspot id="hs-c" target="#target-c" frequency="always">
            Tooltip C
          </Hotspot>
          <Hotspot id="hs-d" target="#target-d" frequency="always">
            Tooltip D
          </Hotspot>
        </TooltipGroup>
      </>,
    );

    await userEvent.click(screen.getByLabelText("Hotspot hs-c"));
    expect(screen.getByText("Tooltip C")).toBeDefined();

    await userEvent.click(screen.getByLabelText("Hotspot hs-d"));
    expect(screen.queryByText("Tooltip D")).toBeNull();
  });

  it("uses provider animation preset for beacon and tooltip transitions", async () => {
    render(
      <FeatureDropProvider manifest={[]} storage={new MemoryAdapter()} animation="none">
        <button id="target-motion">Motion</button>
        <Hotspot id="hs-motion" target="#target-motion" frequency="always">
          Motion tooltip
        </Hotspot>
      </FeatureDropProvider>,
    );

    const beacon = screen.getByLabelText("Hotspot hs-motion") as HTMLElement;
    expect(beacon.style.animation).toBe("none");

    await userEvent.click(beacon);
    expect(screen.getByRole("dialog").style.animation).toBe("");
  });
});
