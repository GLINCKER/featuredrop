import { describe, it, expect, vi } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { FeatureDropProvider } from "../react/provider";
import { useFeatureDrop } from "../react/hooks/use-feature-drop";
import { useNewFeature } from "../react/hooks/use-new-feature";
import { useNewCount } from "../react/hooks/use-new-count";
import { NewBadge } from "../react/components/new-badge";
import { MemoryAdapter } from "../adapters/memory";
import { AnalyticsCollector, CustomAdapter } from "../analytics";
import { getFeatureVariantName } from "../variants";
import { createFlagBridge } from "../flags";
import type { FeatureManifest } from "../types";

const NOW = new Date("2026-02-25T12:00:00Z");

const TEST_MANIFEST: FeatureManifest = [
  {
    id: "journal",
    label: "Decision Journal",
    releasedAt: "2026-02-20T00:00:00Z",
    showNewUntil: "2026-03-20T00:00:00Z",
    sidebarKey: "/journal",
    category: "ai",
  },
  {
    id: "analytics",
    label: "Analytics Dashboard",
    releasedAt: "2026-02-22T00:00:00Z",
    showNewUntil: "2026-03-22T00:00:00Z",
    sidebarKey: "/analytics",
    category: "core",
  },
  {
    id: "expired",
    label: "Old Feature",
    releasedAt: "2026-01-01T00:00:00Z",
    showNewUntil: "2026-02-01T00:00:00Z",
    sidebarKey: "/old",
  },
];

function createTestStorage() {
  return new MemoryAdapter();
}

// ── Helper component to expose hook values ───────────────────────────────────

function HookConsumer({ sidebarKey }: { sidebarKey?: string }) {
  const { newFeatures, newCount, isNew, dismiss, dismissAll } = useFeatureDrop();

  return (
    <div>
      <span data-testid="count">{newCount}</span>
      <span data-testid="features">{newFeatures.map((f) => f.id).join(",")}</span>
      {sidebarKey && (
        <span data-testid="is-new">{isNew(sidebarKey) ? "yes" : "no"}</span>
      )}
      <button data-testid="dismiss" onClick={() => dismiss("journal")}>
        Dismiss
      </button>
      <button data-testid="dismiss-all" onClick={() => dismissAll()}>
        Dismiss All
      </button>
    </div>
  );
}

function NewFeatureConsumer({ sidebarKey }: { sidebarKey: string }) {
  const { isNew, feature, dismiss } = useNewFeature(sidebarKey);
  return (
    <div>
      <span data-testid="is-new">{isNew ? "yes" : "no"}</span>
      <span data-testid="label">{feature?.label ?? "none"}</span>
      <button data-testid="dismiss" onClick={dismiss}>
        Dismiss
      </button>
    </div>
  );
}

function CountConsumer() {
  const count = useNewCount();
  return <span data-testid="count">{count}</span>;
}

function ThrottleConsumer() {
  const {
    newCount,
    totalNewCount,
    queuedFeatures,
    quietMode,
    setQuietMode,
  } = useFeatureDrop();
  return (
    <div>
      <span data-testid="throttle-visible">{newCount}</span>
      <span data-testid="throttle-total">{totalNewCount}</span>
      <span data-testid="throttle-queued">{queuedFeatures.length}</span>
      <span data-testid="quiet-mode">{quietMode ? "yes" : "no"}</span>
      <button data-testid="enable-quiet" onClick={() => setQuietMode(true)}>
        Quiet on
      </button>
    </div>
  );
}

function DependencyConsumer() {
  const { newFeatures, markFeatureClicked } = useFeatureDrop();
  return (
    <div>
      <span data-testid="dependency-features">{newFeatures.map((f) => f.id).join(",")}</span>
      <button data-testid="mark-clicked" onClick={() => markFeatureClicked("base")}>
        Mark clicked
      </button>
    </div>
  );
}

function ThrottleRuntimeConsumer() {
  const {
    getRemainingToastSlots,
    markToastsShown,
    canShowModal,
    markModalShown,
    canShowTour,
    markTourShown,
    acquireSpotlightSlot,
    releaseSpotlightSlot,
    activeSpotlightCount,
  } = useFeatureDrop();
  const [acquireA, setAcquireA] = useState("none");
  const [acquireB, setAcquireB] = useState("none");
  const [, setRefreshTick] = useState(0);

  return (
    <div>
      <span data-testid="toast-slots">{getRemainingToastSlots()}</span>
      <span data-testid="can-modal">{canShowModal("normal") ? "yes" : "no"}</span>
      <span data-testid="can-tour">{canShowTour() ? "yes" : "no"}</span>
      <span data-testid="spotlight-count">{activeSpotlightCount}</span>
      <span data-testid="acquire-a">{acquireA}</span>
      <span data-testid="acquire-b">{acquireB}</span>
      <button data-testid="mark-toast" onClick={() => markToastsShown(["journal"])}>
        Mark toast
      </button>
      <button data-testid="mark-modal" onClick={markModalShown}>
        Mark modal
      </button>
      <button data-testid="mark-tour" onClick={markTourShown}>
        Mark tour
      </button>
      <button data-testid="refresh-throttle" onClick={() => setRefreshTick((value) => value + 1)}>
        Refresh
      </button>
      <button data-testid="acquire-a-btn" onClick={() => setAcquireA(acquireSpotlightSlot("a") ? "yes" : "no")}>
        Acquire A
      </button>
      <button data-testid="acquire-b-btn" onClick={() => setAcquireB(acquireSpotlightSlot("b") ? "yes" : "no")}>
        Acquire B
      </button>
      <button data-testid="release-a-btn" onClick={() => releaseSpotlightSlot("a")}>
        Release A
      </button>
    </div>
  );
}

function TriggerConsumer() {
  const {
    newFeatures,
    setTriggerPath,
    trackUsageEvent,
    trackMilestone,
  } = useFeatureDrop();
  return (
    <div>
      <span data-testid="trigger-features">{newFeatures.map((f) => f.id).join(",")}</span>
      <button data-testid="set-report-path" onClick={() => setTriggerPath("/reports/weekly")}>
        Set report path
      </button>
      <button data-testid="usage-action" onClick={() => trackUsageEvent("mouse-heavy-session")}>
        Usage action
      </button>
      <button data-testid="milestone-action" onClick={() => trackMilestone("first-team-member-invited")}>
        Milestone action
      </button>
    </div>
  );
}

function LocaleConsumer() {
  const { locale, direction, animation, translations } = useFeatureDrop();
  return (
    <div>
      <span data-testid="locale">{locale}</span>
      <span data-testid="direction">{direction}</span>
      <span data-testid="animation">{animation}</span>
      <span data-testid="count-label">{translations.newFeatureCount(2)}</span>
    </div>
  );
}

function VariantConsumer() {
  const { newFeatures, markFeatureClicked } = useFeatureDrop();
  const first = newFeatures[0];
  return (
    <div>
      <span data-testid="variant-description">{first?.description ?? "none"}</span>
      <span data-testid="variant-name">{first ? getFeatureVariantName(first) : "none"}</span>
      <button data-testid="variant-clicked" onClick={() => first && markFeatureClicked(first.id)}>
        Mark variant clicked
      </button>
    </div>
  );
}

// ── FeatureDropProvider ──────────────────────────────────────────────────────

describe("FeatureDropProvider", () => {
  it("provides new features to children", () => {
    const storage = createTestStorage();
    render(
      <FeatureDropProvider manifest={TEST_MANIFEST} storage={storage}>
        <HookConsumer />
      </FeatureDropProvider>,
    );
    // "expired" should not appear (showNewUntil is in the past relative to real time,
    // but test relies on current Date — so we check for the 2 future ones)
    expect(screen.getByTestId("count").textContent).toBe("2");
    expect(screen.getByTestId("features").textContent).toContain("journal");
    expect(screen.getByTestId("features").textContent).toContain("analytics");
  });

  it("filters features by flag bridge when flagKey is configured", () => {
    const storage = createTestStorage();
    const manifest: FeatureManifest = [
      ...TEST_MANIFEST,
      {
        id: "flagged",
        label: "Flagged Release",
        releasedAt: "2026-02-24T00:00:00Z",
        showNewUntil: "2026-03-24T00:00:00Z",
        flagKey: "flag-enabled",
      },
    ];

    const enabledBridge = createFlagBridge({
      isEnabled: (key) => key === "flag-enabled",
    });
    const disabledBridge = createFlagBridge({
      isEnabled: () => false,
    });

    const { rerender } = render(
      <FeatureDropProvider manifest={manifest} storage={storage} flagBridge={enabledBridge}>
        <HookConsumer />
      </FeatureDropProvider>,
    );
    expect(screen.getByTestId("features").textContent).toContain("flagged");

    rerender(
      <FeatureDropProvider manifest={manifest} storage={storage} flagBridge={disabledBridge}>
        <HookConsumer />
      </FeatureDropProvider>,
    );
    expect(screen.getByTestId("features").textContent).not.toContain("flagged");
  });

  it("filters features by provider product scope", () => {
    const storage = createTestStorage();
    const manifest: FeatureManifest = [
      ...TEST_MANIFEST,
      {
        id: "askverdict-feature",
        label: "AskVerdict specific",
        releasedAt: "2026-02-24T00:00:00Z",
        showNewUntil: "2026-03-24T00:00:00Z",
        product: "askverdict",
      },
      {
        id: "other-feature",
        label: "Other product feature",
        releasedAt: "2026-02-24T00:00:00Z",
        showNewUntil: "2026-03-24T00:00:00Z",
        product: "other",
      },
      {
        id: "shared-feature",
        label: "Shared feature",
        releasedAt: "2026-02-24T00:00:00Z",
        showNewUntil: "2026-03-24T00:00:00Z",
        product: "*",
      },
    ];

    render(
      <FeatureDropProvider manifest={manifest} storage={storage} product="askverdict">
        <HookConsumer />
      </FeatureDropProvider>,
    );

    const features = screen.getByTestId("features").textContent ?? "";
    expect(features).toContain("askverdict-feature");
    expect(features).toContain("shared-feature");
    expect(features).not.toContain("other-feature");
  });

  it("normalizes locale and exposes rtl direction + pluralized copy", () => {
    const storage = createTestStorage();
    render(
      <FeatureDropProvider
        manifest={TEST_MANIFEST}
        storage={storage}
        locale="ar-EG"
        animation="subtle"
      >
        <LocaleConsumer />
      </FeatureDropProvider>,
    );
    expect(screen.getByTestId("locale").textContent).toBe("ar");
    expect(screen.getByTestId("direction").textContent).toBe("rtl");
    expect(screen.getByTestId("animation").textContent).toBe("subtle");
    expect(screen.getByTestId("count-label").textContent).toContain("ميز");
  });

  it("updates when a feature is dismissed", async () => {
    const storage = createTestStorage();
    render(
      <FeatureDropProvider manifest={TEST_MANIFEST} storage={storage}>
        <HookConsumer />
      </FeatureDropProvider>,
    );
    expect(screen.getByTestId("count").textContent).toBe("2");
    await act(async () => {
      screen.getByTestId("dismiss").click();
    });
    expect(screen.getByTestId("count").textContent).toBe("1");
  });

  it("clears all on dismissAll", async () => {
    const storage = createTestStorage();
    render(
      <FeatureDropProvider manifest={TEST_MANIFEST} storage={storage}>
        <HookConsumer />
      </FeatureDropProvider>,
    );
    await act(async () => {
      screen.getByTestId("dismiss-all").click();
    });
    expect(screen.getByTestId("count").textContent).toBe("0");
  });

  it("checks isNew by sidebar key", () => {
    const storage = createTestStorage();
    render(
      <FeatureDropProvider manifest={TEST_MANIFEST} storage={storage}>
        <HookConsumer sidebarKey="/journal" />
      </FeatureDropProvider>,
    );
    expect(screen.getByTestId("is-new").textContent).toBe("yes");
  });

  it("checks isNew returns false for expired key", () => {
    const storage = createTestStorage();
    render(
      <FeatureDropProvider manifest={TEST_MANIFEST} storage={storage}>
        <HookConsumer sidebarKey="/old" />
      </FeatureDropProvider>,
    );
    expect(screen.getByTestId("is-new").textContent).toBe("no");
  });

  it("applies maxSimultaneousBadges throttling and exposes queue counts", () => {
    const storage = createTestStorage();
    render(
      <FeatureDropProvider
        manifest={TEST_MANIFEST}
        storage={storage}
        throttle={{ maxSimultaneousBadges: 1 }}
      >
        <ThrottleConsumer />
      </FeatureDropProvider>,
    );
    expect(screen.getByTestId("throttle-visible").textContent).toBe("1");
    expect(screen.getByTestId("throttle-total").textContent).toBe("2");
    expect(screen.getByTestId("throttle-queued").textContent).toBe("1");
  });

  it("respects quiet mode when DND throttling is enabled", async () => {
    const storage = createTestStorage();
    const manifest: FeatureManifest = [
      ...TEST_MANIFEST,
      {
        id: "critical-upgrade",
        label: "Critical upgrade",
        releasedAt: "2026-02-24T00:00:00Z",
        showNewUntil: "2026-03-24T00:00:00Z",
        priority: "critical",
      },
    ];

    render(
      <FeatureDropProvider
        manifest={manifest}
        storage={storage}
        throttle={{ respectDoNotDisturb: true }}
      >
        <ThrottleConsumer />
      </FeatureDropProvider>,
    );

    expect(screen.getByTestId("throttle-visible").textContent).toBe("3");
    await userEvent.click(screen.getByTestId("enable-quiet"));
    expect(screen.getByTestId("quiet-mode").textContent).toBe("yes");
    expect(screen.getByTestId("throttle-visible").textContent).toBe("1");
    expect(screen.getByTestId("throttle-queued").textContent).toBe("2");
  });

  it("holds announcements during session cooldown, then releases them", async () => {
    const storage = createTestStorage();
    render(
      <FeatureDropProvider
        manifest={TEST_MANIFEST}
        storage={storage}
        throttle={{ sessionCooldown: 40 }}
      >
        <ThrottleConsumer />
      </FeatureDropProvider>,
    );

    expect(screen.getByTestId("throttle-visible").textContent).toBe("0");
    await waitFor(() => {
      expect(screen.getByTestId("throttle-visible").textContent).toBe("2");
    });
  });

  it("tracks runtime throttle gates for toast, modal, tour, and spotlight limits", async () => {
    const storage = createTestStorage();
    render(
      <FeatureDropProvider
        manifest={TEST_MANIFEST}
        storage={storage}
        throttle={{
          maxToastsPerSession: 1,
          minTimeBetweenModals: 200,
          minTimeBetweenTours: 200,
          maxSimultaneousSpotlights: 1,
        }}
      >
        <ThrottleRuntimeConsumer />
      </FeatureDropProvider>,
    );

    expect(screen.getByTestId("toast-slots").textContent).toBe("1");
    await userEvent.click(screen.getByTestId("mark-toast"));
    expect(screen.getByTestId("toast-slots").textContent).toBe("0");

    expect(screen.getByTestId("can-modal").textContent).toBe("yes");
    await userEvent.click(screen.getByTestId("mark-modal"));
    await userEvent.click(screen.getByTestId("refresh-throttle"));
    expect(screen.getByTestId("can-modal").textContent).toBe("no");
    await new Promise((resolve) => setTimeout(resolve, 220));
    await userEvent.click(screen.getByTestId("refresh-throttle"));
    await waitFor(() => {
      expect(screen.getByTestId("can-modal").textContent).toBe("yes");
    });

    expect(screen.getByTestId("can-tour").textContent).toBe("yes");
    await userEvent.click(screen.getByTestId("mark-tour"));
    await userEvent.click(screen.getByTestId("refresh-throttle"));
    expect(screen.getByTestId("can-tour").textContent).toBe("no");
    await new Promise((resolve) => setTimeout(resolve, 220));
    await userEvent.click(screen.getByTestId("refresh-throttle"));
    await waitFor(() => {
      expect(screen.getByTestId("can-tour").textContent).toBe("yes");
    });

    await userEvent.click(screen.getByTestId("acquire-a-btn"));
    await userEvent.click(screen.getByTestId("acquire-b-btn"));
    expect(screen.getByTestId("acquire-a").textContent).toBe("yes");
    expect(screen.getByTestId("acquire-b").textContent).toBe("no");
    expect(screen.getByTestId("spotlight-count").textContent).toBe("1");

    await userEvent.click(screen.getByTestId("release-a-btn"));
    await userEvent.click(screen.getByTestId("acquire-b-btn"));
    expect(screen.getByTestId("acquire-b").textContent).toBe("yes");
  });

  it("unlocks dependent features when dependency interactions are satisfied", async () => {
    const storage = createTestStorage();
    const manifest: FeatureManifest = [
      {
        id: "base",
        label: "Base feature",
        releasedAt: "2026-02-22T00:00:00Z",
        showNewUntil: "2026-03-22T00:00:00Z",
      },
      {
        id: "dependent",
        label: "Dependent feature",
        releasedAt: "2026-02-23T00:00:00Z",
        showNewUntil: "2026-03-23T00:00:00Z",
        dependsOn: { clicked: ["base"] },
      },
    ];

    render(
      <FeatureDropProvider manifest={manifest} storage={storage}>
        <DependencyConsumer />
      </FeatureDropProvider>,
    );

    expect(screen.getByTestId("dependency-features").textContent).toBe("base");
    await userEvent.click(screen.getByTestId("mark-clicked"));
    await waitFor(() => {
      const ids = (screen.getByTestId("dependency-features").textContent ?? "").split(",").filter(Boolean);
      expect(ids).toHaveLength(2);
      expect(ids).toContain("base");
      expect(ids).toContain("dependent");
    });
  });

  it("evaluates contextual triggers for page, usage, and milestone conditions", async () => {
    const storage = createTestStorage();
    const manifest: FeatureManifest = [
      {
        id: "always",
        label: "Always",
        releasedAt: "2026-02-22T00:00:00Z",
        showNewUntil: "2026-03-22T00:00:00Z",
      },
      {
        id: "reports-only",
        label: "Reports only",
        releasedAt: "2026-02-22T00:00:00Z",
        showNewUntil: "2026-03-22T00:00:00Z",
        trigger: { type: "page", match: "/reports/*" },
      },
      {
        id: "usage-gated",
        label: "Usage gated",
        releasedAt: "2026-02-22T00:00:00Z",
        showNewUntil: "2026-03-22T00:00:00Z",
        trigger: { type: "usage", event: "mouse-heavy-session", minActions: 2 },
      },
      {
        id: "milestone-gated",
        label: "Milestone gated",
        releasedAt: "2026-02-22T00:00:00Z",
        showNewUntil: "2026-03-22T00:00:00Z",
        trigger: { type: "milestone", event: "first-team-member-invited" },
      },
    ];

    render(
      <FeatureDropProvider manifest={manifest} storage={storage}>
        <TriggerConsumer />
      </FeatureDropProvider>,
    );

    expect(screen.getByTestId("trigger-features").textContent).toBe("always");

    await userEvent.click(screen.getByTestId("set-report-path"));
    expect(screen.getByTestId("trigger-features").textContent).toContain("reports-only");

    await userEvent.click(screen.getByTestId("usage-action"));
    expect(screen.getByTestId("trigger-features").textContent).not.toContain("usage-gated");
    await userEvent.click(screen.getByTestId("usage-action"));
    expect(screen.getByTestId("trigger-features").textContent).toContain("usage-gated");

    await userEvent.click(screen.getByTestId("milestone-action"));
    expect(screen.getByTestId("trigger-features").textContent).toContain("milestone-gated");
  });

  it("applies variant overrides and emits variant in analytics events", async () => {
    const trackSpy = vi.fn();
    const collector = new AnalyticsCollector({
      adapter: new CustomAdapter(trackSpy),
      batchSize: 1,
      flushInterval: 0,
    });
    const storage = createTestStorage();
    const manifest: FeatureManifest = [
      {
        id: "ai-journal",
        label: "AI Journal",
        description: "Base copy",
        releasedAt: "2026-02-22T00:00:00Z",
        showNewUntil: "2026-03-22T00:00:00Z",
        variants: {
          control: { description: "Control copy" },
          treatment: { description: "Treatment copy" },
        },
        variantSplit: [100, 0],
      },
    ];

    render(
      <FeatureDropProvider
        manifest={manifest}
        storage={storage}
        collector={collector}
        variantKey="user-123"
      >
        <VariantConsumer />
      </FeatureDropProvider>,
    );

    expect(screen.getByTestId("variant-description").textContent).toBe("Control copy");
    expect(screen.getByTestId("variant-name").textContent).toBe("control");
    await userEvent.click(screen.getByTestId("variant-clicked"));
    await waitFor(() => {
      expect(trackSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "feature_clicked",
          featureId: "ai-journal",
          variant: "control",
        }),
      );
    });

    await collector.destroy();
  });
});

// ── useFeatureDrop ───────────────────────────────────────────────────────────

describe("useFeatureDrop", () => {
  it("throws when used outside provider", () => {
    // Suppress console.error for expected error
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<HookConsumer />)).toThrow(
      "useFeatureDrop must be used within a <FeatureDropProvider>",
    );
    consoleSpy.mockRestore();
  });
});

// ── useNewFeature ────────────────────────────────────────────────────────────

describe("useNewFeature", () => {
  it("returns isNew and feature for a sidebar key", () => {
    const storage = createTestStorage();
    render(
      <FeatureDropProvider manifest={TEST_MANIFEST} storage={storage}>
        <NewFeatureConsumer sidebarKey="/journal" />
      </FeatureDropProvider>,
    );
    expect(screen.getByTestId("is-new").textContent).toBe("yes");
    expect(screen.getByTestId("label").textContent).toBe("Decision Journal");
  });

  it("returns not-new for non-matching key", () => {
    const storage = createTestStorage();
    render(
      <FeatureDropProvider manifest={TEST_MANIFEST} storage={storage}>
        <NewFeatureConsumer sidebarKey="/nonexistent" />
      </FeatureDropProvider>,
    );
    expect(screen.getByTestId("is-new").textContent).toBe("no");
    expect(screen.getByTestId("label").textContent).toBe("none");
  });

  it("dismiss removes the feature", async () => {
    const storage = createTestStorage();
    render(
      <FeatureDropProvider manifest={TEST_MANIFEST} storage={storage}>
        <NewFeatureConsumer sidebarKey="/journal" />
      </FeatureDropProvider>,
    );
    expect(screen.getByTestId("is-new").textContent).toBe("yes");
    await act(async () => {
      screen.getByTestId("dismiss").click();
    });
    expect(screen.getByTestId("is-new").textContent).toBe("no");
  });
});

// ── useNewCount ──────────────────────────────────────────────────────────────

describe("useNewCount", () => {
  it("returns the count of new features", () => {
    const storage = createTestStorage();
    render(
      <FeatureDropProvider manifest={TEST_MANIFEST} storage={storage}>
        <CountConsumer />
      </FeatureDropProvider>,
    );
    expect(screen.getByTestId("count").textContent).toBe("2");
  });
});

// ── NewBadge ─────────────────────────────────────────────────────────────────

describe("NewBadge", () => {
  it("renders pill variant by default", () => {
    render(<NewBadge />);
    const badge = screen.getByText("New");
    expect(badge).toBeDefined();
    expect(badge.getAttribute("data-featuredrop")).toBe("pill");
  });

  it("renders dot variant", () => {
    render(<NewBadge variant="dot" />);
    const badge = screen.getByLabelText("New feature");
    expect(badge.getAttribute("data-featuredrop")).toBe("dot");
  });

  it("renders count variant", () => {
    render(<NewBadge variant="count" count={5} />);
    const badge = screen.getByText("5");
    expect(badge.getAttribute("data-featuredrop")).toBe("count");
  });

  it("hides when show is false", () => {
    const { container } = render(<NewBadge show={false} />);
    expect(container.innerHTML).toBe("");
  });

  it("uses custom label for pill", () => {
    render(<NewBadge label="Updated" />);
    expect(screen.getByText("Updated")).toBeDefined();
  });

  it("fires onDismiss when dismissOnClick is true", async () => {
    const onDismiss = vi.fn();
    render(<NewBadge dismissOnClick onDismiss={onDismiss} />);
    await userEvent.click(screen.getByText("New"));
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it("renders via render prop", () => {
    render(
      <NewBadge show={true}>
        {({ isNew }) => <span data-testid="custom">{isNew ? "YES" : "NO"}</span>}
      </NewBadge>,
    );
    expect(screen.getByTestId("custom").textContent).toBe("YES");
  });

  it("render prop receives false when show is false", () => {
    render(
      <NewBadge show={false}>
        {({ isNew }) => <span data-testid="custom">{isNew ? "YES" : "NO"}</span>}
      </NewBadge>,
    );
    expect(screen.getByTestId("custom").textContent).toBe("NO");
  });

  it("has correct aria-label for count variant", () => {
    render(<NewBadge variant="count" count={3} />);
    expect(screen.getByLabelText("3 new features")).toBeDefined();
  });

  it("announces count changes with polite live region semantics", () => {
    render(<NewBadge variant="count" count={3} />);
    const badge = screen.getByLabelText("3 new features");
    expect(badge.getAttribute("aria-live")).toBe("polite");
    expect(badge.getAttribute("aria-atomic")).toBe("true");
  });

  it("applies className and style", () => {
    render(<NewBadge className="custom-class" style={{ opacity: 0.5 }} />);
    const badge = screen.getByText("New");
    expect(badge.className).toContain("custom-class");
    expect(badge.style.opacity).toBe("0.5");
  });
});
