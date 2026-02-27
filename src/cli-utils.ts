import { hasDependencyCycle } from "./dependencies";
import type { FeatureEntry } from "./types";

export interface ManifestStats {
  total: number;
  byType: Record<string, number>;
  byCategory: Record<string, number>;
  newestRelease: string | null;
  oldestRelease: string | null;
}

export function computeManifestStats(entries: FeatureEntry[]): ManifestStats {
  const byType: Record<string, number> = {};
  const byCategory: Record<string, number> = {};

  for (const entry of entries) {
    const type = entry.type ?? "feature";
    byType[type] = (byType[type] ?? 0) + 1;
    if (entry.category) {
      byCategory[entry.category] = (byCategory[entry.category] ?? 0) + 1;
    }
  }

  const sortedByDate = [...entries].sort(
    (a, b) => new Date(b.releasedAt).getTime() - new Date(a.releasedAt).getTime(),
  );

  return {
    total: entries.length,
    byType,
    byCategory,
    newestRelease: sortedByDate[0]?.releasedAt ?? null,
    oldestRelease: sortedByDate[sortedByDate.length - 1]?.releasedAt ?? null,
  };
}

export function generateMarkdownChangelog(entries: FeatureEntry[]): string {
  const sorted = [...entries].sort(
    (a, b) => new Date(b.releasedAt).getTime() - new Date(a.releasedAt).getTime(),
  );
  const sections = sorted.map((entry) => {
    const lines = [
      `## ${entry.label}`,
      "",
      `- **ID**: \`${entry.id}\``,
      `- **Released**: ${entry.releasedAt}`,
    ];
    if (entry.type) lines.push(`- **Type**: ${entry.type}`);
    if (entry.category) lines.push(`- **Category**: ${entry.category}`);
    if (entry.showNewUntil) lines.push(`- **Show new until**: ${entry.showNewUntil}`);
    if (entry.cta) lines.push(`- **CTA**: [${entry.cta.label}](${entry.cta.url})`);
    if (entry.description) {
      lines.push("", entry.description.trim());
    }
    return lines.join("\n");
  });

  return `# Generated Changelog\n\n${sections.join("\n\n---\n\n")}\n`;
}

function isIsoWithTimezone(value: string): boolean {
  if (!value.includes("T")) return false;
  if (!(value.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(value))) return false;
  return Number.isFinite(new Date(value).getTime());
}

export interface DoctorReport {
  checks: string[];
  warnings: string[];
  errors: string[];
}

export function runDoctor(entries: FeatureEntry[], now: Date = new Date()): DoctorReport {
  const checks: string[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  checks.push(`Manifest entries loaded: ${entries.length}`);

  const ids = new Set<string>();
  let duplicateCount = 0;
  for (const entry of entries) {
    if (ids.has(entry.id)) duplicateCount += 1;
    ids.add(entry.id);
  }
  if (duplicateCount > 0) {
    errors.push(`${duplicateCount} duplicate feature id(s) found`);
  } else {
    checks.push("No duplicate IDs");
  }

  let invalidDateCount = 0;
  let reversedDateCount = 0;
  let expiredCount = 0;
  let scheduledCount = 0;
  let missingDescriptionCount = 0;

  for (const entry of entries) {
    if (!entry.description?.trim()) missingDescriptionCount += 1;
    if (!isIsoWithTimezone(entry.releasedAt) || !isIsoWithTimezone(entry.showNewUntil)) {
      invalidDateCount += 1;
      continue;
    }
    const released = new Date(entry.releasedAt).getTime();
    const showUntil = new Date(entry.showNewUntil).getTime();
    if (showUntil <= released) reversedDateCount += 1;
    if (showUntil < now.getTime()) expiredCount += 1;
    if (entry.publishAt) {
      const publishMs = new Date(entry.publishAt).getTime();
      if (Number.isFinite(publishMs) && publishMs > now.getTime()) scheduledCount += 1;
    }
  }

  if (invalidDateCount > 0) {
    errors.push(`${invalidDateCount} entries have invalid ISO 8601 dates with timezone`);
  } else {
    checks.push("All dates are valid ISO 8601 with timezone");
  }

  if (reversedDateCount > 0) {
    errors.push(`${reversedDateCount} entries have showNewUntil before/at releasedAt`);
  }

  if (expiredCount > 0) warnings.push(`${expiredCount} entries have showNewUntil in the past`);
  if (scheduledCount > 0) warnings.push(`${scheduledCount} entries have publishAt in the future`);

  if (missingDescriptionCount > 0) {
    errors.push(`${missingDescriptionCount} entries have no description`);
  } else {
    checks.push("All entries have descriptions");
  }

  if (hasDependencyCycle(entries)) {
    errors.push("Circular dependsOn relationship detected");
  } else {
    checks.push("No circular dependencies in dependsOn chains");
  }

  return { checks, warnings, errors };
}
