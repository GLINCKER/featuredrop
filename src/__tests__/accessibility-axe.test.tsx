import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { MemoryAdapter } from "../adapters/memory";
import type { FeatureManifest } from "../types";
import { FeatureDropProvider } from "../react/provider";
import { ChangelogWidget } from "../react/components/changelog-widget";
import { ChangelogPage } from "../react/components/changelog-page";
import { AnnouncementModal } from "../react/components/announcement-modal";

const MANIFEST: FeatureManifest = [
  {
    id: "ai-journal",
    label: "AI Journal",
    description: "Track decisions with AI insights.",
    releasedAt: "2026-02-20T00:00:00Z",
    showNewUntil: "2026-04-20T00:00:00Z",
    category: "ai",
    type: "feature",
    cta: { label: "Try it", url: "https://example.com/journal" },
  },
];

function TestProvider({ children }: { children: React.ReactNode }) {
  return (
    <FeatureDropProvider manifest={MANIFEST} storage={new MemoryAdapter()}>
      {children}
    </FeatureDropProvider>
  );
}

async function runAxe(container: HTMLElement): Promise<Awaited<ReturnType<typeof axe>>> {
  return axe(container, {
    // jsdom does not implement canvas APIs used by this axe rule.
    rules: {
      "color-contrast": { enabled: false },
    },
  });
}

describe("axe accessibility checks", () => {
  it("has no critical accessibility violations in ChangelogWidget dialog", async () => {
    const { container } = render(
      <TestProvider>
        <ChangelogWidget />
      </TestProvider>,
    );

    await userEvent.click(screen.getByRole("button", { name: /what's new/i }));
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeDefined();
    });

    const results = await runAxe(container);
    expect(results.violations).toHaveLength(0);
  });

  it("has no critical accessibility violations in ChangelogPage and AnnouncementModal", async () => {
    const { container } = render(
      <TestProvider>
        <ChangelogPage showReactions />
        <AnnouncementModal
          id="announce-a11y"
          defaultOpen
          slides={[
            {
              id: "slide-a11y",
              title: "Welcome to AI Journal",
              description: "A guided summary of what changed.",
              primaryCta: { label: "Try it", url: "https://example.com/journal" },
            },
          ]}
        />
      </TestProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeDefined();
    });

    const results = await runAxe(container);
    expect(results.violations).toHaveLength(0);
  });
});
