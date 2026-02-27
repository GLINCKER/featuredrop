import { describe, expect, it } from "vitest";
import {
  featureEntryJsonSchema,
  featureEntrySchema,
  validateManifest,
} from "../schema";

describe("validateManifest", () => {
  it("exports zod and json schema entry definitions", () => {
    const parsed = featureEntrySchema.parse({
      id: "feature-1",
      label: "Feature 1",
      releasedAt: "2026-02-20T00:00:00Z",
      showNewUntil: "2026-03-20T00:00:00Z",
    });
    expect(parsed.id).toBe("feature-1");
    expect(featureEntryJsonSchema.properties.id.type).toBe("string");
  });

  it("returns valid for a well-formed manifest", () => {
    const result = validateManifest([
      {
        id: "ai-journal",
        label: "AI Journal",
        releasedAt: "2026-02-20T00:00:00Z",
        showNewUntil: "2026-03-20T00:00:00Z",
      },
    ]);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("detects duplicate ids", () => {
    const result = validateManifest([
      {
        id: "dup",
        label: "A",
        releasedAt: "2026-02-20T00:00:00Z",
        showNewUntil: "2026-03-20T00:00:00Z",
      },
      {
        id: "dup",
        label: "B",
        releasedAt: "2026-02-21T00:00:00Z",
        showNewUntil: "2026-03-21T00:00:00Z",
      },
    ]);
    expect(result.valid).toBe(false);
    expect(result.errors.some((issue) => issue.code === "duplicate_id")).toBe(true);
  });

  it("detects invalid date ordering and circular dependencies", () => {
    const result = validateManifest([
      {
        id: "a",
        label: "A",
        releasedAt: "2026-03-20T00:00:00Z",
        showNewUntil: "2026-03-19T00:00:00Z",
      },
      {
        id: "b",
        label: "B",
        releasedAt: "2026-03-20T00:00:00Z",
        showNewUntil: "2026-04-20T00:00:00Z",
        dependsOn: { seen: ["c"] },
      },
      {
        id: "c",
        label: "C",
        releasedAt: "2026-03-20T00:00:00Z",
        showNewUntil: "2026-04-20T00:00:00Z",
        dependsOn: { seen: ["b"] },
      },
    ]);
    expect(result.valid).toBe(false);
    expect(result.errors.some((issue) => issue.code === "invalid_value")).toBe(true);
    expect(result.errors.some((issue) => issue.code === "circular_dependency")).toBe(true);
  });
});
