import { describe, expect, it } from "vitest";
import { diffManifest, generateChangelogDiff, validateManifestForCI } from "../ci";
import type { FeatureManifest } from "../types";

const BEFORE: FeatureManifest = [
  {
    id: "ai-journal",
    label: "AI Journal",
    releasedAt: "2026-02-10T00:00:00Z",
    showNewUntil: "2026-03-10T00:00:00Z",
    description: "Original description",
    sidebarKey: "/journal",
  },
  {
    id: "exports",
    label: "Export CSV",
    releasedAt: "2026-02-12T00:00:00Z",
    showNewUntil: "2026-03-12T00:00:00Z",
  },
];

const AFTER: FeatureManifest = [
  {
    id: "ai-journal",
    label: "AI Journal",
    releasedAt: "2026-02-10T00:00:00Z",
    showNewUntil: "2026-03-20T00:00:00Z",
    description: "Updated description",
    sidebarKey: "/journal",
  },
  {
    id: "onboarding-tour",
    label: "Onboarding Tour",
    releasedAt: "2026-02-13T00:00:00Z",
    showNewUntil: "2026-03-13T00:00:00Z",
  },
];

describe("ci utilities", () => {
  it("diffs added/removed/changed features by id", () => {
    const diff = diffManifest(BEFORE, AFTER);
    expect(diff.added.map((item) => item.id)).toEqual(["onboarding-tour"]);
    expect(diff.removed.map((item) => item.id)).toEqual(["exports"]);
    expect(diff.changed.map((item) => item.id)).toEqual(["ai-journal"]);
    expect(diff.changed[0]?.changedFields).toEqual(
      expect.arrayContaining(["showNewUntil", "description"]),
    );
  });

  it("generates human readable diff summary", () => {
    const diff = diffManifest(BEFORE, AFTER);
    const summary = generateChangelogDiff(diff, { includeFieldChanges: true });
    expect(summary).toContain("Added: Onboarding Tour");
    expect(summary).toContain("Changed: AI Journal [showNewUntil, description]");
    expect(summary).toContain("Removed: Export CSV");
  });

  it("returns no-change summary for equal manifests", () => {
    const diff = diffManifest(BEFORE, BEFORE);
    expect(generateChangelogDiff(diff)).toBe("No manifest changes.");
  });

  it("reuses manifest validation helper for CI", () => {
    const result = validateManifestForCI(AFTER);
    expect(result.valid).toBe(true);
  });
});
