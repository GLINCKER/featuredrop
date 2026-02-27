import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { FeatureEntry } from "../types";
import { AnnouncementModal } from "../react/components/announcement-modal";

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

function createFeature(priority: FeatureEntry["priority"]): FeatureEntry {
  return {
    id: `feature-${priority ?? "normal"}`,
    label: "Major launch",
    description: "Big upgrade",
    releasedAt: "2026-02-20T00:00:00Z",
    showNewUntil: "2026-03-20T00:00:00Z",
    priority: priority ?? "normal",
  };
}

describe("AnnouncementModal", () => {
  it("auto-opens for critical priority and persists dismissal for once frequency", async () => {
    const feature = createFeature("critical");
    const { unmount } = render(
      <AnnouncementModal id="critical-launch" feature={feature} trigger="auto" frequency="once" />,
    );

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeDefined();
    });
    await userEvent.click(screen.getByText("Got it"));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    unmount();
    render(
      <AnnouncementModal id="critical-launch" feature={feature} trigger="auto" frequency="once" />,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("does not auto-open for non-critical feature", async () => {
    render(
      <AnnouncementModal feature={createFeature("normal")} trigger="auto" frequency="always" />,
    );

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });

  it("renders multi-slide content and supports video embeds", async () => {
    const onPrimaryClick = vi.fn();
    render(
      <AnnouncementModal
        defaultOpen={true}
        frequency="always"
        slides={[
          {
            id: "slide-1",
            title: "Welcome",
            description: "Start here",
            primaryCta: { label: "Try now", url: "#start" },
          },
          {
            id: "slide-2",
            title: "Watch demo",
            description: "See it in action",
            videoUrl: "https://youtu.be/dQw4w9WgXcQ",
          },
        ]}
        onPrimaryCtaClick={onPrimaryClick}
      />,
    );

    expect(screen.getByText("Welcome")).toBeDefined();
    await userEvent.click(screen.getByText("Try now"));
    expect(onPrimaryClick).toHaveBeenCalledOnce();

    await userEvent.click(screen.getByText("Next"));
    expect(screen.getByText("Watch demo")).toBeDefined();

    const frame = screen.getByTitle("Watch demo");
    expect(frame.getAttribute("src")).toContain("youtube.com/embed/");
  });

  it("supports escape-to-dismiss and dialog labeling", async () => {
    render(
      <AnnouncementModal
        defaultOpen={true}
        frequency="always"
        slides={[
          {
            id: "slide-a11y",
            title: "A11y title",
            description: "A11y description",
          },
        ]}
      />,
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.getAttribute("aria-labelledby")).toContain("featuredrop-announcement-");
    expect(dialog.getAttribute("aria-describedby")).toContain("featuredrop-announcement-");

    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });
});
