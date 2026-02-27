import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FeatureDropProvider } from "../react/provider";
import { MemoryAdapter } from "../adapters/memory";
import type { FeatureManifest } from "../types";
import { ChangelogPage } from "../react/components/changelog-page";

const manifest: FeatureManifest = [
  {
    id: "ai-journal",
    label: "AI Journal",
    description: "Track decisions with AI insights",
    releasedAt: "2026-02-22T00:00:00Z",
    showNewUntil: "2026-03-22T00:00:00Z",
    category: "ai",
    type: "feature",
  },
  {
    id: "billing-fix",
    label: "Billing fix",
    description: "Fixed invoice rounding",
    releasedAt: "2026-02-20T00:00:00Z",
    showNewUntil: "2026-03-20T00:00:00Z",
    category: "billing",
    type: "fix",
  },
];

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <FeatureDropProvider manifest={manifest} storage={new MemoryAdapter()}>
      {children}
    </FeatureDropProvider>
  );
}

describe("ChangelogPage", () => {
  it("renders a skip-link to the changelog entries list", () => {
    render(
      <Wrapper>
        <ChangelogPage pagination="load-more" />
      </Wrapper>,
    );

    const link = screen.getByText("Skip to changelog entries") as HTMLAnchorElement;
    expect(link).toBeDefined();
    expect(link.getAttribute("href")?.startsWith("#featuredrop-changelog-list-")).toBe(true);
  });

  it("renders entries and supports search", () => {
    render(
      <Wrapper>
        <ChangelogPage showSearch pagination="load-more" />
      </Wrapper>,
    );
    expect(screen.getByText("AI Journal")).toBeDefined();
    expect(screen.getByText("Billing fix")).toBeDefined();

    const search = screen.getByPlaceholderText("Search updates");
    fireEvent.change(search, { target: { value: "billing" } });
    expect(screen.queryByText("AI Journal")).toBeNull();
    expect(screen.getByText("Billing fix")).toBeDefined();
  });

  it("supports arrow-key navigation across entry cards", () => {
    const { container } = render(
      <Wrapper>
        <ChangelogPage pagination="load-more" />
      </Wrapper>,
    );

    const list = container.querySelector("[id^='featuredrop-changelog-list-']") as HTMLElement;
    fireEvent.keyDown(list, { key: "ArrowDown" });
    const firstFocused = document.activeElement as HTMLElement;
    expect(firstFocused.getAttribute("data-featuredrop-entry")).toBeTruthy();

    fireEvent.keyDown(list, { key: "ArrowDown" });
    const secondFocused = document.activeElement as HTMLElement;
    expect(secondFocused.getAttribute("data-featuredrop-entry")).toBeTruthy();
    expect(secondFocused).not.toBe(firstFocused);
  });

  it("filters by category", () => {
    render(
      <Wrapper>
        <ChangelogPage showFilters pagination="load-more" />
      </Wrapper>,
    );
    const buttons = screen.getAllByRole("button", { name: "ai" });
    fireEvent.click(buttons[0]);
    expect(screen.getByText("AI Journal")).toBeDefined();
    expect(screen.queryByText("Billing fix")).toBeNull();
  });

  it("shows reactions and persists one reaction per entry", async () => {
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
        <ChangelogPage showReactions pagination="load-more" />
      </Wrapper>,
    );

    const firstUpvote = screen.getByLabelText("React 👍 to AI Journal");
    const firstHeart = screen.getByLabelText("React ❤️ to AI Journal");
    await userEvent.click(firstUpvote);
    expect(firstUpvote.textContent).toContain("1");
    await userEvent.click(firstHeart);
    expect(firstHeart.textContent).toContain("0");

    first.unmount();

    render(
      <Wrapper>
        <ChangelogPage showReactions pagination="load-more" />
      </Wrapper>,
    );
    expect(screen.getByLabelText("React 👍 to AI Journal").textContent).toContain("1");
    vi.unstubAllGlobals();
  });
});
