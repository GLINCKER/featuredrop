import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FeatureRequestButton } from "../react/components/feature-request-button";
import { FeatureRequestForm } from "../react/components/feature-request-form";

let store = new Map<string, string>();

beforeEach(() => {
  store = new Map<string, string>();
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

describe("Feature request voting", () => {
  it("supports per-feature upvoting with one vote per user", async () => {
    const onVote = vi.fn();
    const first = render(
      <FeatureRequestButton
        featureId="dark-mode"
        requestTitle="Dark mode"
        onVote={onVote}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /Vote/ }));
    expect(screen.getByRole("button", { name: /Voted/ }).textContent).toContain("(1)");
    await userEvent.click(screen.getByRole("button", { name: /Voted/ }));
    expect(screen.getByRole("button", { name: /Voted/ }).textContent).toContain("(1)");

    expect(onVote).toHaveBeenCalledTimes(2);
    expect(onVote.mock.calls[0][0].voted).toBe(true);
    expect(onVote.mock.calls[1][0].voted).toBe(false);

    first.unmount();
    render(<FeatureRequestButton featureId="dark-mode" requestTitle="Dark mode" />);
    expect(screen.getByRole("button", { name: /Voted/ }).textContent).toContain("(1)");
  });

  it("creates requests and enforces one vote per request per user", async () => {
    const { container } = render(
      <FeatureRequestForm
        categories={["UI", "Performance", "Integration"]}
      />,
    );

    const titleInput = screen.getByPlaceholderText("Request title");
    const descriptionInput = screen.getByPlaceholderText("Describe the use case");
    const submitButton = screen.getByRole("button", { name: "Submit request" });

    await userEvent.type(titleInput, "Dark mode");
    await userEvent.type(descriptionInput, "Dark theme across the app");
    await userEvent.click(submitButton);

    await userEvent.type(titleInput, "Slack alerts");
    await userEvent.click(submitButton);

    let items = Array.from(container.querySelectorAll("[data-featuredrop-request-item]"));
    const darkModeItem = items.find((item) => item.textContent?.includes("Dark mode"));
    if (!darkModeItem) {
      throw new Error("Expected Dark mode request");
    }
    const voteButton = within(darkModeItem).getByRole("button", { name: /↑/ });
    expect(voteButton.textContent).toContain("1");
    await userEvent.click(voteButton);
    await userEvent.click(voteButton);

    items = Array.from(container.querySelectorAll("[data-featuredrop-request-item]"));
    const updatedDarkMode = items.find((item) => item.textContent?.includes("Dark mode"));
    if (!updatedDarkMode) {
      throw new Error("Expected Dark mode request after voting");
    }
    expect(within(updatedDarkMode).getByRole("button", { name: /↑/ }).textContent).toContain("1");
  });

  it("calls submit + webhook callbacks with payload metadata", async () => {
    const onSubmit = vi.fn();
    const onWebhook = vi.fn();

    render(
      <FeatureRequestForm
        metadata={{ source: "widget" }}
        onSubmit={onSubmit}
        onWebhook={onWebhook}
      />,
    );

    await userEvent.type(screen.getByPlaceholderText("Request title"), "Linear integration");
    await userEvent.click(screen.getByRole("button", { name: "Submit request" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledOnce();
    });
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Linear integration",
        metadata: { source: "widget" },
      }),
    );
    expect(onWebhook).toHaveBeenCalledOnce();
  });

  it("supports sorting by votes and recent activity", async () => {
    store.set(
      "featuredrop:feature-requests:requests",
      JSON.stringify([
        {
          id: "old-popular",
          title: "Old popular request",
          votes: 5,
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-02T00:00:00Z",
        },
        {
          id: "newer-lower",
          title: "Newer lower-vote request",
          votes: 1,
          createdAt: "2026-02-01T00:00:00Z",
          updatedAt: "2026-02-02T00:00:00Z",
        },
      ]),
    );

    const { container } = render(<FeatureRequestForm />);
    let items = Array.from(container.querySelectorAll("[data-featuredrop-request-item]"));
    expect(items[0]?.textContent).toContain("Old popular request");

    await userEvent.selectOptions(screen.getByLabelText("Sort requests"), "recent");
    items = Array.from(container.querySelectorAll("[data-featuredrop-request-item]"));
    expect(items[0]?.textContent).toContain("Newer lower-vote request");
  });
});
