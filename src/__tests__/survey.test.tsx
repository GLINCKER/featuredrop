import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryAdapter } from "../adapters/memory";
import { AnalyticsCollector, CustomAdapter } from "../analytics";
import { FeatureDropProvider } from "../react/provider";
import { Survey } from "../react/components/survey";
import { useSurvey } from "../react/hooks/use-survey";
import type { FeatureManifest } from "../types";

const MANIFEST: FeatureManifest = [
  {
    id: "ai-journal",
    label: "AI Journal",
    releasedAt: "2026-02-20T00:00:00Z",
    showNewUntil: "2026-03-20T00:00:00Z",
  },
];

let store = new Map<string, string>();

function readStoreValue(key: string): string | null {
  return store.get(key) ?? null;
}

beforeEach(() => {
  store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => readStoreValue(key),
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

function SurveyControls({ id }: { id: string }) {
  const survey = useSurvey(id);
  return (
    <div>
      <button onClick={() => survey.show()}>Show survey</button>
      <span data-testid="survey-open">{survey.isOpen ? "yes" : "no"}</span>
      <span data-testid="survey-can-show">{survey.canShow ? "yes" : "no"}</span>
    </div>
  );
}

describe("Survey", () => {
  it("supports manual trigger via useSurvey() and emits survey_submitted analytics", async () => {
    const onSubmit = vi.fn();
    const trackSpy = vi.fn();
    const collector = new AnalyticsCollector({
      adapter: new CustomAdapter(trackSpy),
      batchSize: 1,
      flushInterval: 0,
    });

    render(
      <FeatureDropProvider manifest={MANIFEST} storage={new MemoryAdapter()} collector={collector}>
        <Survey
          id="nps-main"
          type="nps"
          prompt="How likely are you to recommend us?"
          trigger="manual"
          featureId="ai-journal"
          onSubmit={onSubmit}
        />
        <SurveyControls id="nps-main" />
      </FeatureDropProvider>,
    );

    expect(screen.getByTestId("survey-open").textContent).toBe("no");
    await userEvent.click(screen.getByText("Show survey"));
    expect(screen.getByText("How likely are you to recommend us?")).toBeDefined();
    await userEvent.click(screen.getByRole("button", { name: "9" }));
    await userEvent.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledOnce();
    });
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "nps-main",
        type: "nps",
        score: 9,
        featureId: "ai-journal",
      }),
    );

    await waitFor(() => {
      expect(trackSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "survey_submitted",
          featureId: "ai-journal",
          metadata: expect.objectContaining({
            surveyId: "nps-main",
            surveyType: "nps",
          }),
        }),
      );
    });

    await collector.destroy();
  });

  it("renders survey panel with dialog semantics and closes on Escape", async () => {
    render(
      <FeatureDropProvider manifest={MANIFEST} storage={new MemoryAdapter()}>
        <Survey
          id="a11y-survey"
          type="nps"
          trigger="manual"
          prompt="Rate your experience"
          onSubmit={async () => {}}
        />
        <SurveyControls id="a11y-survey" />
      </FeatureDropProvider>,
    );

    const showButton = screen.getByText("Show survey");
    await userEvent.click(showButton);
    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-labelledby")).toContain("featuredrop-survey-");
    expect(dialog.getAttribute("aria-describedby")).toContain("featuredrop-survey-");

    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
    expect(document.activeElement).toBe(showButton);
  });

  it("applies feature-usage trigger rules for auto display", async () => {
    const onSubmit = vi.fn();
    const first = render(
      <FeatureDropProvider manifest={MANIFEST} storage={new MemoryAdapter()}>
        <Survey
          id="usage-gated"
          type="csat"
          prompt="How satisfied are you with AI Journal?"
          triggerRules={{ featureUsageIds: ["ai-journal"] }}
          onSubmit={onSubmit}
        />
      </FeatureDropProvider>,
    );

    expect(screen.queryByText("How satisfied are you with AI Journal?")).toBeNull();
    first.unmount();

    store.set("featuredrop:seen-features", JSON.stringify(["ai-journal"]));
    render(
      <FeatureDropProvider manifest={MANIFEST} storage={new MemoryAdapter()}>
        <Survey
          id="usage-gated"
          type="csat"
          prompt="How satisfied are you with AI Journal?"
          triggerRules={{ featureUsageIds: ["ai-journal"] }}
          onSubmit={onSubmit}
        />
      </FeatureDropProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("How satisfied are you with AI Journal?")).toBeDefined();
    });
  });

  it("stores ask-later cooldown and suppresses survey until cooldown expires", async () => {
    const onSubmit = vi.fn();
    const first = render(
      <FeatureDropProvider manifest={MANIFEST} storage={new MemoryAdapter()}>
        <Survey
          id="cooldown-survey"
          type="ces"
          prompt="How easy was it to export your data?"
          triggerRules={{ askLaterCooldownDays: 5 }}
          onSubmit={onSubmit}
        />
      </FeatureDropProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("How easy was it to export your data?")).toBeDefined();
    });
    await userEvent.click(screen.getByRole("button", { name: "Ask me later" }));
    expect(screen.queryByText("How easy was it to export your data?")).toBeNull();
    expect(readStoreValue("featuredrop:survey:cooldown-survey:cooldown-until")).toBeTruthy();

    first.unmount();

    render(
      <FeatureDropProvider manifest={MANIFEST} storage={new MemoryAdapter()}>
        <Survey
          id="cooldown-survey"
          type="ces"
          prompt="How easy was it to export your data?"
          triggerRules={{ askLaterCooldownDays: 5 }}
          onSubmit={onSubmit}
        />
      </FeatureDropProvider>,
    );

    expect(screen.queryByText("How easy was it to export your data?")).toBeNull();
  });

  it("submits custom survey responses", async () => {
    const onSubmit = vi.fn();
    render(
      <FeatureDropProvider manifest={MANIFEST} storage={new MemoryAdapter()}>
        <Survey
          id="custom-survey"
          type="custom"
          trigger="manual"
          questions={[
            {
              id: "q1",
              type: "single-choice",
              prompt: "What brought you here?",
              options: ["Google", "Friend", "Twitter"],
              required: true,
            },
            {
              id: "q2",
              type: "text",
              prompt: "What feature do you want most?",
              required: true,
            },
          ]}
          onSubmit={onSubmit}
        />
        <SurveyControls id="custom-survey" />
      </FeatureDropProvider>,
    );

    await userEvent.click(screen.getByText("Show survey"));
    await userEvent.click(screen.getByRole("button", { name: "Google" }));
    const customQuestion = screen.getByText("What feature do you want most? *").closest("div");
    const textarea = customQuestion?.querySelector("textarea");
    if (!textarea) {
      throw new Error("Expected custom question textarea");
    }
    await userEvent.type(textarea, "Linear integration");
    await userEvent.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledOnce();
    });
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "custom-survey",
        type: "custom",
        responses: expect.objectContaining({
          q1: "Google",
          q2: "Linear integration",
        }),
      }),
    );
  });
});
