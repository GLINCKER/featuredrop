import { createInterface } from "node:readline/promises";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { hostname } from "node:os";
import { buildManifestFromPattern, validateFeatureFiles } from "./changelog-as-code";
import { getPostHogClient, shutdownPostHog } from "./posthog-client";
import {
  computeManifestStats,
  generateMarkdownChangelog,
  runDoctor,
} from "./cli-utils";
import {
  addFeatureEntry,
  initFeaturedropProject,
  migrateManifest,
  type InitFormat,
  type MigrationSource,
} from "./cli-scaffold";
import { generateRSS } from "./rss";
import type { FeatureType } from "./types";

interface ParsedArgs {
  command:
    | "init"
    | "add"
    | "migrate"
    | "build"
    | "validate"
    | "stats"
    | "doctor"
    | "generate-rss"
    | "generate-changelog"
    | "help";
  pattern?: string;
  outFile?: string;
  inputFile?: string;
  cwd?: string;
  title?: string;
  link?: string;
  description?: string;
  from?: MigrationSource;
  format?: InitFormat;
  force?: boolean;
  id?: string;
  label?: string;
  type?: FeatureType;
  category?: string;
  url?: string;
  releasedAt?: string;
  showNewUntil?: string;
  showDays?: number;
}

function parseArgs(argv: string[]): ParsedArgs {
  const [commandRaw, ...rest] = argv;
  const allowed = new Set([
    "init",
    "add",
    "migrate",
    "build",
    "validate",
    "stats",
    "doctor",
    "generate-rss",
    "generate-changelog",
  ]);
  const command = allowed.has(commandRaw) ? (commandRaw as ParsedArgs["command"]) : "help";
  const parsed: ParsedArgs = { command };

  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (arg === "--pattern") parsed.pattern = rest[++i];
    else if (arg === "--out") parsed.outFile = rest[++i];
    else if (arg === "--cwd") parsed.cwd = rest[++i];
    else if (arg === "--title") parsed.title = rest[++i];
    else if (arg === "--link") parsed.link = rest[++i];
    else if (arg === "--description") parsed.description = rest[++i];
    else if (arg === "--input") parsed.inputFile = rest[++i];
    else if (arg === "--from") parsed.from = rest[++i] as MigrationSource;
    else if (arg === "--format") parsed.format = rest[++i] as InitFormat;
    else if (arg === "--force") parsed.force = true;
    else if (arg === "--id") parsed.id = rest[++i];
    else if (arg === "--label") parsed.label = rest[++i];
    else if (arg === "--type") parsed.type = rest[++i] as FeatureType;
    else if (arg === "--category") parsed.category = rest[++i];
    else if (arg === "--url") parsed.url = rest[++i];
    else if (arg === "--releasedAt") parsed.releasedAt = rest[++i];
    else if (arg === "--showNewUntil") parsed.showNewUntil = rest[++i];
    else if (arg === "--show-days") parsed.showDays = Number(rest[++i]);
  }
  return parsed;
}

function printHelp(): void {
  console.log("featuredrop CLI");
  console.log("");
  console.log("Usage:");
  console.log("  featuredrop init [--format markdown|json] [--force] [--cwd .]");
  console.log("  featuredrop add [--label ...] [--id ...] [--description ...] [--type feature|improvement|fix|breaking] [--category ...] [--url ...] [--releasedAt ...] [--showNewUntil ...] [--show-days 14] [--format markdown|json] [--cwd .]");
  console.log("  featuredrop migrate --from beamer|headway|announcekit|canny|launchnotes [--input export.json] [--out featuredrop.manifest.json] [--cwd .]");
  console.log("  featuredrop build [--pattern features/**/*.md] [--out featuredrop.manifest.json] [--cwd .]");
  console.log("  featuredrop validate [--pattern features/**/*.md] [--cwd .]");
  console.log("  featuredrop stats [--pattern features/**/*.md] [--cwd .]");
  console.log("  featuredrop doctor [--pattern features/**/*.md] [--cwd .]");
  console.log("  featuredrop generate-rss [--pattern features/**/*.md] [--out featuredrop.rss.xml] [--title ...] [--link ...] [--description ...] [--cwd .]");
  console.log("  featuredrop generate-changelog [--pattern features/**/*.md] [--out CHANGELOG.generated.md] [--cwd .]");
}

async function promptForLabelIfNeeded(label?: string): Promise<string> {
  if (label?.trim()) return label.trim();
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error("Missing --label. Provide --label in non-interactive mode.");
  }
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  try {
    const value = (await rl.question("Feature label: ")).trim();
    if (!value) throw new Error("Feature label is required");
    return value;
  } finally {
    rl.close();
  }
}

async function run(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.command === "help") {
    printHelp();
    process.exitCode = 1;
    return;
  }

  // Use hostname-based distinct ID for anonymous CLI telemetry
  const distinctId = `cli:${hostname()}`;
  const posthog = getPostHogClient();

  try {
    if (args.command === "init") {
      const result = await initFeaturedropProject({
        cwd: args.cwd,
        format: args.format,
        force: args.force,
      });
      console.log(`Initialized featuredrop project (${result.format})`);
      for (const path of result.created) {
        console.log(`- ${path}`);
      }
      posthog?.capture({
        distinctId,
        event: "cli_init",
        properties: { format: result.format, files_created: result.created.length },
      });
      await shutdownPostHog();
      return;
    }

    if (args.command === "add") {
      const label = await promptForLabelIfNeeded(args.label);
      const result = await addFeatureEntry({
        cwd: args.cwd,
        format: args.format,
        id: args.id,
        label,
        description: args.description,
        type: args.type,
        category: args.category,
        url: args.url,
        releasedAt: args.releasedAt,
        showNewUntil: args.showNewUntil,
        showDays: args.showDays,
      });
      console.log(`Added feature "${result.entry.id}" -> ${result.path}`);
      posthog?.capture({
        distinctId,
        event: "cli_add_feature",
        properties: {
          feature_id: result.entry.id,
          feature_type: result.entry.type,
          format: args.format,
          has_description: Boolean(args.description),
          has_url: Boolean(args.url),
        },
      });
      await shutdownPostHog();
      return;
    }

    if (args.command === "migrate") {
      const from = args.from;
      if (!from) {
        throw new Error('Missing required "--from" (beamer|headway|announcekit|canny|launchnotes)');
      }
      const inputFile = args.inputFile ?? `${from}-export.json`;
      const result = await migrateManifest({
        cwd: args.cwd,
        from,
        inputFile,
        outFile: args.outFile,
      });
      console.log(`Migrated ${result.entries.length} entries from ${from} -> ${result.outFile}`);
      posthog?.capture({
        distinctId,
        event: "cli_migrate",
        properties: { source: from, entries_migrated: result.entries.length, out_file: result.outFile },
      });
      await shutdownPostHog();
      return;
    }

    if (args.command === "build") {
      const out = args.outFile ?? "featuredrop.manifest.json";
      const entries = await buildManifestFromPattern({
        pattern: args.pattern,
        outFile: out,
        cwd: args.cwd,
      });
      console.log(`Built ${entries.length} feature entries -> ${out}`);
      posthog?.capture({
        distinctId,
        event: "cli_build",
        properties: { entries_built: entries.length, out_file: out, has_pattern: Boolean(args.pattern) },
      });
      await shutdownPostHog();
      return;
    }

    if (args.command === "validate") {
      await validateFeatureFiles({
        pattern: args.pattern,
        cwd: args.cwd,
      });
      console.log("Feature files valid");
      await shutdownPostHog();
      return;
    }

    const entries = await buildManifestFromPattern({
      pattern: args.pattern,
      cwd: args.cwd,
    });

    if (args.command === "stats") {
      const stats = computeManifestStats(entries);
      console.log(`Total entries: ${stats.total}`);
      console.log(`By type: ${Object.entries(stats.byType).map(([k, v]) => `${k}=${v}`).join(", ") || "none"}`);
      console.log(`By category: ${Object.entries(stats.byCategory).map(([k, v]) => `${k}=${v}`).join(", ") || "none"}`);
      if (stats.newestRelease) console.log(`Newest release: ${stats.newestRelease}`);
      if (stats.oldestRelease) console.log(`Oldest release: ${stats.oldestRelease}`);
      await shutdownPostHog();
      return;
    }

    if (args.command === "doctor") {
      const report = runDoctor(entries);
      for (const check of report.checks) console.log(`✓ ${check}`);
      for (const warning of report.warnings) console.log(`⚠ ${warning}`);
      for (const error of report.errors) console.log(`✗ ${error}`);
      console.log("");
      console.log(`${report.warnings.length} warning(s), ${report.errors.length} error(s).`);
      if (report.errors.length > 0) process.exitCode = 1;
      await shutdownPostHog();
      return;
    }

    if (args.command === "generate-rss") {
      const out = args.outFile ?? "featuredrop.rss.xml";
      const xml = generateRSS(entries, {
        title: args.title,
        link: args.link,
        description: args.description,
      });
      await writeFile(join(args.cwd ?? process.cwd(), out), `${xml}\n`, "utf8");
      console.log(`Generated RSS feed -> ${out}`);
      posthog?.capture({
        distinctId,
        event: "cli_generate_rss",
        properties: { entries_count: entries.length, out_file: out },
      });
      await shutdownPostHog();
      return;
    }

    if (args.command === "generate-changelog") {
      const out = args.outFile ?? "CHANGELOG.generated.md";
      const markdown = generateMarkdownChangelog(entries);
      await writeFile(join(args.cwd ?? process.cwd(), out), markdown, "utf8");
      console.log(`Generated markdown changelog -> ${out}`);
      posthog?.capture({
        distinctId,
        event: "cli_generate_changelog",
        properties: { entries_count: entries.length, out_file: out },
      });
      await shutdownPostHog();
      return;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`featuredrop: ${message}`);
    posthog?.captureException(error, distinctId, { command: args.command });
    posthog?.capture({
      distinctId,
      event: "cli_error",
      properties: { command: args.command, error_message: message },
    });
    await shutdownPostHog();
    process.exitCode = 1;
  }
}

void run();
