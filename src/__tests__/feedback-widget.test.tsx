import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryAdapter } from "../adapters/memory";
import { AnalyticsCollector, CustomAdapter } from "../analytics";
import { FeatureDropProvider } from "../react/provider";
import { FeedbackWidget } from "../react/components/feedback-widget";
import type { FeatureManifest } from "../types";

const MANIFEST: FeatureManifest = [
  {
    id: "ai-journal",
    label: "AI Journal",
    releasedAt: "2026-02-20T00:00:00Z",
    showNewUntil: "2026-03-20T00:00:00Z",
  },
];

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

describe("FeedbackWidget", () => {
  it("opens as dialog with trigger aria linkage and supports Escape close", async () => {
    render(
      <FeatureDropProvider manifest={MANIFEST} storage={new MemoryAdapter()}>
        <FeedbackWidget featureId="ai-journal" onSubmit={async () => {}} />
      </FeatureDropProvider>,
    );

    const trigger = screen.getByText("Feedback");
    expect(trigger.getAttribute("aria-haspopup")).toBe("dialog");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");

    await userEvent.click(trigger);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeDefined();

    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });

  it("submits payload and emits analytics collector event", async () => {
    const onSubmit = vi.fn();
    const trackSpy = vi.fn();
    const collector = new AnalyticsCollector({
      adapter: new CustomAdapter(trackSpy),
      batchSize: 1,
      flushInterval: 0,
    });

    render(
      <FeatureDropProvider manifest={MANIFEST} storage={new MemoryAdapter()} collector={collector}>
        <FeedbackWidget featureId="ai-journal" onSubmit={onSubmit} showEmoji={true} />
      </FeatureDropProvider>,
    );

    await userEvent.click(screen.getByText("Feedback"));
    await userEvent.type(screen.getByRole("textbox"), "Great feature");
    await userEvent.click(screen.getByText("thumbs-up"));
    await userEvent.click(screen.getByText("Submit"));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledOnce();
    });
    const payload = onSubmit.mock.calls[0][0];
    expect(payload).toEqual(
      expect.objectContaining({
        featureId: "ai-journal",
        text: "Great feature",
        emoji: "thumbs-up",
      }),
    );

    await waitFor(() => {
      expect(trackSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "feedback_submitted",
          featureId: "ai-journal",
        }),
      );
    });

    await collector.destroy();
  });

  it("enforces 1-per-feature rate limit across remounts", async () => {
    const onSubmit = vi.fn();
    const first = render(
      <FeatureDropProvider manifest={MANIFEST} storage={new MemoryAdapter()}>
        <FeedbackWidget
          featureId="ai-journal"
          onSubmit={onSubmit}
          rateLimit="1-per-feature"
        />
      </FeatureDropProvider>,
    );

    await userEvent.click(screen.getByText("Feedback"));
    await userEvent.type(screen.getByRole("textbox"), "One-time feedback");
    await userEvent.click(screen.getByText("Submit"));
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledOnce();
    });
    first.unmount();

    render(
      <FeatureDropProvider manifest={MANIFEST} storage={new MemoryAdapter()}>
        <FeedbackWidget
          featureId="ai-journal"
          onSubmit={onSubmit}
          rateLimit="1-per-feature"
        />
      </FeatureDropProvider>,
    );

    await userEvent.click(screen.getByText("Feedback"));
    expect(screen.getByText("Feedback already submitted.")).toBeDefined();
  });

  it("attaches screenshot when capture succeeds", async () => {
    const onSubmit = vi.fn();
    const screenshotBlob = new Blob(["img"], { type: "image/png" });

    render(
      <FeatureDropProvider manifest={MANIFEST} storage={new MemoryAdapter()}>
        <FeedbackWidget
          featureId="ai-journal"
          onSubmit={onSubmit}
          showScreenshot={true}
          screenshotCapture={async () => screenshotBlob}
        />
      </FeatureDropProvider>,
    );

    await userEvent.click(screen.getByText("Feedback"));
    await userEvent.click(screen.getByText("Capture screenshot"));
    expect(screen.getByText("Screenshot attached")).toBeDefined();
    await userEvent.type(screen.getByRole("textbox"), "Screenshot included");
    await userEvent.click(screen.getByText("Submit"));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledOnce();
    });
    expect(onSubmit.mock.calls[0][0].screenshot).toBeInstanceOf(Blob);
  });
});
