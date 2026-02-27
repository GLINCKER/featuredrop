import { describe, it, expect, vi } from "vitest";
import { render, screen, act, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FeatureDropProvider } from "../react/provider";
import { useFeatureDrop } from "../react/hooks/use-feature-drop";
import { ChangelogWidget } from "../react/components/changelog-widget";
import { Banner } from "../react/components/banner";
import { Toast } from "../react/components/toast";
import { Spotlight } from "../react/components/spotlight";
import { useTabNotification } from "../react/hooks/use-tab-notification";
import { MemoryAdapter } from "../adapters/memory";
import type { FeatureManifest, AnalyticsCallbacks } from "../types";
import type { ThrottleOptions } from "../throttle";

// ── Test Data ────────────────────────────────────────────────────────────────

const TEST_MANIFEST: FeatureManifest = [
  {
    id: "ai-journal",
    label: "AI Journal",
    description: "Track decisions with AI insights",
    releasedAt: "2026-02-22T00:00:00Z",
    showNewUntil: "2026-03-22T00:00:00Z",
    sidebarKey: "/journal",
    category: "ai",
    type: "feature",
    priority: "critical",
    cta: { label: "Try it", url: "https://example.com/journal" },
  },
  {
    id: "analytics-v2",
    label: "Analytics v2",
    description: "Real-time charts and CSV export",
    releasedAt: "2026-02-20T00:00:00Z",
    showNewUntil: "2026-03-20T00:00:00Z",
    sidebarKey: "/analytics",
    category: "core",
    type: "improvement",
    priority: "normal",
  },
  {
    id: "expired-one",
    label: "Old Feature",
    releasedAt: "2026-01-01T00:00:00Z",
    showNewUntil: "2026-02-01T00:00:00Z",
  },
];

function createTestStorage() {
  return new MemoryAdapter();
}

function Wrapper({
  children,
  storage,
  analytics,
  throttle,
}: {
  children: React.ReactNode;
  storage?: MemoryAdapter;
  analytics?: AnalyticsCallbacks;
  throttle?: ThrottleOptions;
}) {
  return (
    <FeatureDropProvider
      manifest={TEST_MANIFEST}
      storage={storage ?? createTestStorage()}
      analytics={analytics}
      throttle={throttle}
    >
      {children}
    </FeatureDropProvider>
  );
}

// ── ChangelogWidget ─────────────────────────────────────────────────────────

describe("ChangelogWidget", () => {
  it("renders trigger button with count", () => {
    render(
      <Wrapper>
        <ChangelogWidget />
      </Wrapper>,
    );
    const trigger = screen.getByText("What's New");
    expect(trigger).toBeDefined();
    expect(screen.getByText("2")).toBeDefined(); // count badge
  });

  it("wires dialog accessibility attributes and restores trigger focus on close", async () => {
    render(
      <Wrapper>
        <ChangelogWidget />
      </Wrapper>,
    );
    const trigger = screen.getByText("What's New");
    expect(trigger.getAttribute("aria-haspopup")).toBe("dialog");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");

    await userEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");

    const close = screen.getByLabelText("Close");
    await userEvent.click(close);
    await waitFor(() => {
      expect(document.activeElement).toBe(trigger);
    });
  });

  it("opens panel on click and shows entries", async () => {
    render(
      <Wrapper>
        <ChangelogWidget />
      </Wrapper>,
    );
    await userEvent.click(screen.getByText("What's New"));
    expect(screen.getByRole("dialog")).toBeDefined();
    expect(screen.getByText("AI Journal")).toBeDefined();
    expect(screen.getByText("Analytics v2")).toBeDefined();
  });

  it("does not show expired features", async () => {
    render(
      <Wrapper>
        <ChangelogWidget />
      </Wrapper>,
    );
    await userEvent.click(screen.getByText("What's New"));
    expect(screen.queryByText("Old Feature")).toBeNull();
  });

  it("closes on close button click", async () => {
    render(
      <Wrapper>
        <ChangelogWidget />
      </Wrapper>,
    );
    await userEvent.click(screen.getByText("What's New"));
    expect(screen.getByRole("dialog")).toBeDefined();
    await userEvent.click(screen.getByLabelText("Close"));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows 'mark all as read' button", async () => {
    render(
      <Wrapper>
        <ChangelogWidget />
      </Wrapper>,
    );
    await userEvent.click(screen.getByText("What's New"));
    expect(screen.getByText("Mark all as read")).toBeDefined();
  });

  it("shows empty state after dismissing all", async () => {
    render(
      <Wrapper>
        <ChangelogWidget />
      </Wrapper>,
    );
    await userEvent.click(screen.getByText("What's New"));
    await act(async () => {
      await userEvent.click(screen.getByText("Mark all as read"));
    });
    expect(screen.getByText("You're all caught up!")).toBeDefined();
  });

  it("renders with custom title and labels", async () => {
    render(
      <Wrapper>
        <ChangelogWidget
          title="Release Notes"
          triggerLabel="Updates"
          markAllLabel="Clear All"
          emptyLabel="Nothing here"
        />
      </Wrapper>,
    );
    expect(screen.getByText("Updates")).toBeDefined();
    await userEvent.click(screen.getByText("Updates"));
    expect(screen.getByText("Release Notes")).toBeDefined();
    expect(screen.getByText("Clear All")).toBeDefined();
  });

  it("supports headless render prop", () => {
    render(
      <Wrapper>
        <ChangelogWidget>
          {({ count, features }) => (
            <div>
              <span data-testid="headless-count">{count}</span>
              <span data-testid="headless-features">
                {features.map((f) => f.id).join(",")}
              </span>
            </div>
          )}
        </ChangelogWidget>
      </Wrapper>,
    );
    expect(screen.getByTestId("headless-count").textContent).toBe("2");
    expect(screen.getByTestId("headless-features").textContent).toContain("ai-journal");
  });

  it("fires analytics callbacks", async () => {
    const onWidgetOpened = vi.fn();
    const onWidgetClosed = vi.fn();
    render(
      <Wrapper>
        <ChangelogWidget analytics={{ onWidgetOpened, onWidgetClosed }} />
      </Wrapper>,
    );
    await userEvent.click(screen.getByText("What's New"));
    expect(onWidgetOpened).toHaveBeenCalledOnce();
    await userEvent.click(screen.getByLabelText("Close"));
    expect(onWidgetClosed).toHaveBeenCalledOnce();
  });

  it("shows CTA buttons for entries with cta", async () => {
    render(
      <Wrapper>
        <ChangelogWidget />
      </Wrapper>,
    );
    await userEvent.click(screen.getByText("What's New"));
    expect(screen.getByText("Try it")).toBeDefined();
  });

  it("hides count badge when showCount is false", () => {
    render(
      <Wrapper>
        <ChangelogWidget showCount={false} />
      </Wrapper>,
    );
    const trigger = screen.getByText("What's New");
    expect(trigger.querySelector("[data-featuredrop-trigger-badge]")).toBeNull();
  });

  it("supports reactions with one reaction per user per entry", async () => {
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

    const first = render(
      <Wrapper>
        <ChangelogWidget showReactions />
      </Wrapper>,
    );
    await userEvent.click(screen.getByText("What's New"));

    const upvote = screen.getByLabelText("React 👍 to AI Journal");
    const heart = screen.getByLabelText("React ❤️ to AI Journal");
    await userEvent.click(upvote);
    expect(upvote.textContent).toContain("1");

    await userEvent.click(heart);
    expect(heart.textContent).toContain("0");

    first.unmount();
    render(
      <Wrapper>
        <ChangelogWidget showReactions />
      </Wrapper>,
    );
    await userEvent.click(screen.getByText("What's New"));
    expect(screen.getByLabelText("React 👍 to AI Journal").textContent).toContain("1");
    vi.unstubAllGlobals();
  });
});

// ── Banner ──────────────────────────────────────────────────────────────────

describe("Banner", () => {
  it("renders banner for an active feature", () => {
    render(
      <Wrapper>
        <Banner featureId="ai-journal" />
      </Wrapper>,
    );
    expect(screen.getByText("AI Journal")).toBeDefined();
  });

  it("does not render for expired feature", () => {
    render(
      <Wrapper>
        <Banner featureId="expired-one" />
      </Wrapper>,
    );
    expect(screen.queryByText("Old Feature")).toBeNull();
  });

  it("does not render for unknown feature ID", () => {
    const { container } = render(
      <Wrapper>
        <Banner featureId="nonexistent" />
      </Wrapper>,
    );
    expect(container.querySelector("[data-featuredrop-banner]")).toBeNull();
  });

  it("is dismissible by default", async () => {
    render(
      <Wrapper>
        <Banner featureId="ai-journal" />
      </Wrapper>,
    );
    expect(screen.getByText("AI Journal")).toBeDefined();
    await userEvent.click(screen.getByLabelText("Dismiss banner"));
    expect(screen.queryByText("AI Journal")).toBeNull();
  });

  it("shows description when available", () => {
    render(
      <Wrapper>
        <Banner featureId="ai-journal" />
      </Wrapper>,
    );
    expect(screen.getByText(/Track decisions with AI insights/)).toBeDefined();
  });

  it("shows CTA link when available", () => {
    render(
      <Wrapper>
        <Banner featureId="ai-journal" />
      </Wrapper>,
    );
    expect(screen.getByText("Try it")).toBeDefined();
  });

  it("renders different variants", () => {
    const variants = ["info", "success", "warning", "announcement"] as const;
    for (const variant of variants) {
      const { container, unmount } = render(
        <Wrapper>
          <Banner featureId="ai-journal" variant={variant} />
        </Wrapper>,
      );
      expect(container.querySelector(`[data-featuredrop-banner="${variant}"]`)).toBeDefined();
      unmount();
    }
  });

  it("supports headless render prop", () => {
    render(
      <Wrapper>
        <Banner featureId="ai-journal">
          {({ feature, isActive }) => (
            <div>
              <span data-testid="headless-active">{isActive ? "yes" : "no"}</span>
              <span data-testid="headless-label">{feature?.label}</span>
            </div>
          )}
        </Banner>
      </Wrapper>,
    );
    expect(screen.getByTestId("headless-active").textContent).toBe("yes");
    expect(screen.getByTestId("headless-label").textContent).toBe("AI Journal");
  });

  it("fires analytics on dismiss", async () => {
    const onFeatureDismissed = vi.fn();
    render(
      <Wrapper>
        <Banner featureId="ai-journal" analytics={{ onFeatureDismissed }} />
      </Wrapper>,
    );
    await userEvent.click(screen.getByLabelText("Dismiss banner"));
    expect(onFeatureDismissed).toHaveBeenCalledOnce();
    expect(onFeatureDismissed).toHaveBeenCalledWith(
      expect.objectContaining({ id: "ai-journal" }),
    );
  });
});

// ── Toast ───────────────────────────────────────────────────────────────────

describe("Toast", () => {
  it("renders toast notifications for new features", () => {
    render(
      <Wrapper>
        <Toast autoDismissMs={0} />
      </Wrapper>,
    );
    expect(screen.getByText("AI Journal")).toBeDefined();
    expect(screen.getByText("Analytics v2")).toBeDefined();
  });

  it("announces toast updates via polite live region", () => {
    const { container } = render(
      <Wrapper>
        <Toast autoDismissMs={0} />
      </Wrapper>,
    );
    const liveRegion = container.querySelector("[data-featuredrop-toast-container]");
    expect(liveRegion?.getAttribute("aria-live")).toBe("polite");
    expect(liveRegion?.getAttribute("role")).toBe("region");
  });

  it("does not show expired features", () => {
    render(
      <Wrapper>
        <Toast autoDismissMs={0} />
      </Wrapper>,
    );
    expect(screen.queryByText("Old Feature")).toBeNull();
  });

  it("limits visible toasts to maxVisible", () => {
    render(
      <Wrapper>
        <Toast maxVisible={1} autoDismissMs={0} />
      </Wrapper>,
    );
    expect(screen.getByText("AI Journal")).toBeDefined();
    expect(screen.queryByText("Analytics v2")).toBeNull();
  });

  it("dismisses toast on close button click", async () => {
    render(
      <Wrapper>
        <Toast autoDismissMs={0} />
      </Wrapper>,
    );
    const dismissButtons = screen.getAllByLabelText(/Dismiss/);
    await act(async () => {
      await userEvent.click(dismissButtons[0]);
    });
    expect(screen.queryByText("AI Journal")).toBeNull();
  });

  it("filters by featureIds when provided", () => {
    render(
      <Wrapper>
        <Toast featureIds={["analytics-v2"]} autoDismissMs={0} />
      </Wrapper>,
    );
    expect(screen.queryByText("AI Journal")).toBeNull();
    expect(screen.getByText("Analytics v2")).toBeDefined();
  });

  it("supports headless render prop", () => {
    render(
      <Wrapper>
        <Toast autoDismissMs={0}>
          {({ toasts }) => (
            <div data-testid="headless-count">{toasts.length}</div>
          )}
        </Toast>
      </Wrapper>,
    );
    expect(screen.getByTestId("headless-count").textContent).toBe("2");
  });

  it("respects maxToastsPerSession throttle limit", () => {
    render(
      <Wrapper throttle={{ maxToastsPerSession: 1 }}>
        <Toast autoDismissMs={0} maxVisible={3} />
      </Wrapper>,
    );
    expect(screen.getByText("AI Journal")).toBeDefined();
    expect(screen.queryByText("Analytics v2")).toBeNull();
  });

  it("renders nothing when no features are new", () => {
    const storage = createTestStorage();
    storage.dismiss("ai-journal");
    storage.dismiss("analytics-v2");
    const { container } = render(
      <Wrapper storage={storage}>
        <Toast autoDismissMs={0} />
      </Wrapper>,
    );
    expect(container.querySelector("[data-featuredrop-toast-container]")).toBeNull();
  });
});

// ── Spotlight throttling ────────────────────────────────────────────────────

describe("Spotlight throttling", () => {
  it("respects maxSimultaneousSpotlights", async () => {
    render(
      <Wrapper throttle={{ maxSimultaneousSpotlights: 1 }}>
        <button id="target-a">Target A</button>
        <button id="target-b">Target B</button>
        <Spotlight featureId="ai-journal" targetSelector="#target-a" />
        <Spotlight featureId="analytics-v2" targetSelector="#target-b" />
      </Wrapper>,
    );
    await waitFor(() => {
      const beacons = document.querySelectorAll("[data-featuredrop-spotlight]");
      expect(beacons.length).toBe(1);
    });
  });

  it("exposes beacon accessibility attrs and closes tooltip on Escape", async () => {
    render(
      <Wrapper>
        <button id="target-a">Target A</button>
        <Spotlight featureId="ai-journal" targetSelector="#target-a" />
      </Wrapper>,
    );

    const beacon = await screen.findByLabelText("New: AI Journal");
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
});

// ── Provider analytics integration ──────────────────────────────────────────

describe("Provider analytics callbacks", () => {
  function DismissButton() {
    const { dismiss } = useFeatureDrop();
    return <button onClick={() => dismiss("ai-journal")}>Dismiss One</button>;
  }

  function DismissAllButton() {
    const { dismissAll } = useFeatureDrop();
    return <button onClick={() => dismissAll()}>Dismiss All</button>;
  }

  it("fires onFeatureDismissed when dismissing via provider", async () => {
    const onFeatureDismissed = vi.fn();
    render(
      <FeatureDropProvider
        manifest={TEST_MANIFEST}
        storage={createTestStorage()}
        analytics={{ onFeatureDismissed }}
      >
        <DismissButton />
      </FeatureDropProvider>,
    );
    await userEvent.click(screen.getByText("Dismiss One"));
    expect(onFeatureDismissed).toHaveBeenCalledOnce();
    expect(onFeatureDismissed).toHaveBeenCalledWith(
      expect.objectContaining({ id: "ai-journal" }),
    );
  });

  it("fires onAllDismissed when dismissing all via provider", async () => {
    const onAllDismissed = vi.fn();
    render(
      <FeatureDropProvider
        manifest={TEST_MANIFEST}
        storage={createTestStorage()}
        analytics={{ onAllDismissed }}
      >
        <DismissAllButton />
      </FeatureDropProvider>,
    );
    await act(async () => {
      await userEvent.click(screen.getByText("Dismiss All"));
    });
    expect(onAllDismissed).toHaveBeenCalledOnce();
  });
});

// ── useTabNotification ──────────────────────────────────────────────────────

describe("useTabNotification", () => {
  const originalTitle = "My App";

  beforeEach(() => {
    document.title = originalTitle;
  });

  afterEach(() => {
    document.title = originalTitle;
  });

  function TabNotificationConsumer(props: Parameters<typeof useTabNotification>[0]) {
    useTabNotification(props);
    return <div data-testid="tab-consumer" />;
  }

  it("updates document.title with count", async () => {
    await act(async () => {
      render(
        <Wrapper>
          <TabNotificationConsumer />
        </Wrapper>,
      );
    });
    expect(document.title).toBe("(2) My App");
  });

  it("restores title when disabled", async () => {
    await act(async () => {
      render(
        <Wrapper>
          <TabNotificationConsumer enabled={false} />
        </Wrapper>,
      );
    });
    expect(document.title).toBe(originalTitle);
  });

  it("uses custom template", async () => {
    await act(async () => {
      render(
        <Wrapper>
          <TabNotificationConsumer template="[{count} new] {title}" />
        </Wrapper>,
      );
    });
    expect(document.title).toBe("[2 new] My App");
  });

  it("restores title when all features are dismissed", async () => {
    const storage = createTestStorage();
    storage.dismiss("ai-journal");
    storage.dismiss("analytics-v2");
    await act(async () => {
      render(
        <FeatureDropProvider manifest={TEST_MANIFEST} storage={storage}>
          <TabNotificationConsumer />
        </FeatureDropProvider>,
      );
    });
    expect(document.title).toBe(originalTitle);
  });
});

// ── newFeaturesSorted in context ────────────────────────────────────────────

describe("Provider newFeaturesSorted", () => {
  function SortConsumer() {
    const { newFeaturesSorted } = useFeatureDrop();
    return (
      <span data-testid="sorted">
        {newFeaturesSorted.map((f) => f.id).join(",")}
      </span>
    );
  }

  it("provides sorted features via context", () => {
    render(
      <Wrapper>
        <SortConsumer />
      </Wrapper>,
    );
    // ai-journal is critical, analytics-v2 is normal — critical should be first
    expect(screen.getByTestId("sorted").textContent).toBe("ai-journal,analytics-v2");
  });
});
