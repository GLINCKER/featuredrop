import { afterEach, describe, expect, it } from "vitest";
import { MemoryAdapter } from "../adapters";
import { createManifest } from "../helpers";
import {
  configureFeatureDropWebComponents,
  refreshFeatureDropWebComponents,
  registerFeatureDropWebComponents,
} from "../web-components";

const TAGS = {
  badgeTag: "feature-drop-badge-test",
  changelogTag: "feature-drop-changelog-test",
};
registerFeatureDropWebComponents(TAGS);

afterEach(() => {
  document.body.innerHTML = "";
});

describe("web components adapter", () => {
  it("renders badge element when sidebar item is new", () => {
    const storage = new MemoryAdapter();
    const manifest = createManifest([
      {
        id: "ai-journal",
        label: "AI Journal",
        sidebarKey: "journal",
        releasedAt: "2026-02-20T00:00:00Z",
        showNewUntil: "2099-03-20T00:00:00Z",
      },
    ]);
    configureFeatureDropWebComponents({ manifest, storage });

    const badge = document.createElement(TAGS.badgeTag);
    badge.setAttribute("sidebar-key", "journal");
    document.body.appendChild(badge);
    expect(badge.shadowRoot?.textContent).toContain("New");

    storage.dismiss("ai-journal");
    refreshFeatureDropWebComponents();
    expect((badge.shadowRoot?.textContent ?? "").includes("New")).toBe(false);
  });

  it("renders changelog list and handles dismiss-all", async () => {
    const storage = new MemoryAdapter();
    const manifest = createManifest([
      {
        id: "billing-fix",
        label: "Billing Fix",
        sidebarKey: "billing",
        releasedAt: "2026-02-20T00:00:00Z",
        showNewUntil: "2099-03-20T00:00:00Z",
        description: "Fixed invoice rounding.",
      },
    ]);
    configureFeatureDropWebComponents({ manifest, storage });

    const changelog = document.createElement(TAGS.changelogTag);
    document.body.appendChild(changelog);

    const toggle = changelog.shadowRoot?.querySelector('[data-action="toggle"]');
    expect(toggle).toBeTruthy();
    (toggle as HTMLButtonElement).click();
    expect(changelog.shadowRoot?.textContent).toContain("Billing Fix");

    const dismissAll = changelog.shadowRoot?.querySelector('[data-action="dismiss-all"]');
    expect(dismissAll).toBeTruthy();
    (dismissAll as HTMLButtonElement).click();

    await Promise.resolve();
    expect(changelog.shadowRoot?.textContent).toContain("You're all caught up.");
  });
});
