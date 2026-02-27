import { validateManifest } from "./schema";
import type { FeatureEntry, FeatureManifest } from "./types";

export interface ChangedFeature {
  id: string;
  before: FeatureEntry;
  after: FeatureEntry;
  changedFields: string[];
}

export interface ManifestDiff {
  added: FeatureEntry[];
  removed: FeatureEntry[];
  changed: ChangedFeature[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function collectChangedFields(
  beforeValue: unknown,
  afterValue: unknown,
  path: string,
  output: string[],
): void {
  if (beforeValue === afterValue) return;

  if (Array.isArray(beforeValue) && Array.isArray(afterValue)) {
    if (beforeValue.length !== afterValue.length) {
      output.push(path);
      return;
    }
    for (let i = 0; i < beforeValue.length; i += 1) {
      collectChangedFields(beforeValue[i], afterValue[i], `${path}[${i}]`, output);
    }
    return;
  }

  if (isRecord(beforeValue) && isRecord(afterValue)) {
    const keys = new Set([...Object.keys(beforeValue), ...Object.keys(afterValue)]);
    keys.forEach((key) => {
      const nextPath = path ? `${path}.${key}` : key;
      collectChangedFields(beforeValue[key], afterValue[key], nextPath, output);
    });
    return;
  }

  output.push(path);
}

export function diffManifest(before: FeatureManifest, after: FeatureManifest): ManifestDiff {
  const beforeById = new Map(before.map((feature) => [feature.id, feature]));
  const afterById = new Map(after.map((feature) => [feature.id, feature]));

  const added = after.filter((feature) => !beforeById.has(feature.id));
  const removed = before.filter((feature) => !afterById.has(feature.id));

  const changed = after
    .filter((feature) => beforeById.has(feature.id))
    .map((feature) => {
      const previous = beforeById.get(feature.id);
      if (!previous) return null;
      const changedFields: string[] = [];
      collectChangedFields(previous, feature, "", changedFields);
      if (changedFields.length === 0) return null;
      return {
        id: feature.id,
        before: previous,
        after: feature,
        changedFields,
      } satisfies ChangedFeature;
    })
    .filter((item): item is ChangedFeature => item !== null);

  return { added, removed, changed };
}

export interface ChangelogDiffOptions {
  includeFieldChanges?: boolean;
}

export function generateChangelogDiff(
  diff: ManifestDiff,
  options: ChangelogDiffOptions = {},
): string {
  const parts: string[] = [];

  if (diff.added.length > 0) {
    parts.push(`Added: ${diff.added.map((feature) => feature.label).join(", ")}`);
  }

  if (diff.changed.length > 0) {
    const changedText = diff.changed.map((item) => {
      if (!options.includeFieldChanges) return item.after.label;
      return `${item.after.label} [${item.changedFields.join(", ")}]`;
    });
    parts.push(`Changed: ${changedText.join(", ")}`);
  }

  if (diff.removed.length > 0) {
    parts.push(`Removed: ${diff.removed.map((feature) => feature.label).join(", ")}`);
  }

  return parts.length > 0 ? parts.join(". ") : "No manifest changes.";
}

export interface ChangelogMarkdownOptions extends ChangelogDiffOptions {
  maxItemsPerSection?: number;
}

function renderMarkdownSection(
  title: string,
  items: string[],
  maxItemsPerSection: number,
): string[] {
  if (items.length === 0) return [`### ${title} (0)`, "- None"];

  const visible = items.slice(0, maxItemsPerSection);
  const hiddenCount = items.length - visible.length;

  const lines = [`### ${title} (${items.length})`, ...visible.map((item) => `- ${item}`)];
  if (hiddenCount > 0) {
    lines.push(`- ...and ${hiddenCount} more`);
  }
  return lines;
}

export function generateChangelogDiffMarkdown(
  diff: ManifestDiff,
  options: ChangelogMarkdownOptions = {},
): string {
  if (diff.added.length === 0 && diff.changed.length === 0 && diff.removed.length === 0) {
    return "No manifest changes.";
  }

  const maxItemsPerSection = Math.max(1, options.maxItemsPerSection ?? 20);
  const addedItems = diff.added.map((feature) => `**${feature.label}** (\`${feature.id}\`)`);
  const changedItems = diff.changed.map((item) => {
    if (!options.includeFieldChanges) {
      return `**${item.after.label}** (\`${item.id}\`)`;
    }
    const fields = item.changedFields.join(", ");
    return `**${item.after.label}** (\`${item.id}\`) — ${fields}`;
  });
  const removedItems = diff.removed.map((feature) => `**${feature.label}** (\`${feature.id}\`)`);

  const sections = [
    ...renderMarkdownSection("Added", addedItems, maxItemsPerSection),
    "",
    ...renderMarkdownSection("Changed", changedItems, maxItemsPerSection),
    "",
    ...renderMarkdownSection("Removed", removedItems, maxItemsPerSection),
  ];

  return sections.join("\n");
}

export function validateManifestForCI(manifest: FeatureManifest) {
  return validateManifest(manifest);
}
