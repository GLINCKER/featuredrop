import { describe, expect, it } from "vitest";
import {
  computeManifestStats,
  generateMarkdownChangelog,
  runDoctor,
} from "../cli-utils";
import type { FeatureEntry } from "../types";

const manifest: FeatureEntry[] = [
  {
    id: "ai-journal",
    label: "AI Journal",
    description: "Track decisions with AI",
    type: "feature",
    category: "ai",
    releasedAt: "2026-02-20T00:00:00Z",
    showNewUntil: "2026-03-20T00:00:00Z",
  },
  {
    id: "billing-fix",
    label: "Billing Fix",
    description: "Fixed invoice rounding",
    type: "fix",
    category: "billing",
    releasedAt: "2026-02-18T00:00:00Z",
    showNewUntil: "2026-03-18T00:00:00Z",
  },
];

describe("cli-utils", () => {
  it("computes manifest statistics", () => {
    const stats = computeManifestStats(manifest);
    expect(stats.total).toBe(2);
    expect(stats.byType.feature).toBe(1);
    expect(stats.byType.fix).toBe(1);
    expect(stats.byCategory.ai).toBe(1);
    expect(stats.byCategory.billing).toBe(1);
    expect(stats.newestRelease).toBe("2026-02-20T00:00:00Z");
    expect(stats.oldestRelease).toBe("2026-02-18T00:00:00Z");
  });

  it("generates markdown changelog content", () => {
    const markdown = generateMarkdownChangelog(manifest);
    expect(markdown).toContain("# Generated Changelog");
    expect(markdown).toContain("## AI Journal");
    expect(markdown).toContain("## Billing Fix");
    expect(markdown).toContain("Track decisions with AI");
  });

  it("reports doctor warnings and errors", () => {
    const broken: FeatureEntry[] = [
      ...manifest,
      {
        id: "missing-description",
        label: "Missing description",
        releasedAt: "2026-03-01T00:00:00Z",
        showNewUntil: "2026-02-01T00:00:00Z",
      },
    ];
    const report = runDoctor(broken, new Date("2026-04-01T00:00:00Z"));
    expect(report.warnings.some((line) => line.includes("showNewUntil in the past"))).toBe(true);
    expect(report.errors.some((line) => line.includes("have no description"))).toBe(true);
    expect(report.errors.some((line) => line.includes("showNewUntil before/at releasedAt"))).toBe(true);
  });
});
