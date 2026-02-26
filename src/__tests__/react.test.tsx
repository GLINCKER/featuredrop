import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FeatureDropProvider } from "../react/provider";
import { useFeatureDrop } from "../react/hooks/use-feature-drop";
import { useNewFeature } from "../react/hooks/use-new-feature";
import { useNewCount } from "../react/hooks/use-new-count";
import { NewBadge } from "../react/components/new-badge";
import { MemoryAdapter } from "../adapters/memory";
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

  it("applies className and style", () => {
    render(<NewBadge className="custom-class" style={{ opacity: 0.5 }} />);
    const badge = screen.getByText("New");
    expect(badge.className).toContain("custom-class");
    expect(badge.style.opacity).toBe("0.5");
  });
});
