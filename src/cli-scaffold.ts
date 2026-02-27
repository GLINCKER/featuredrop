import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { buildManifestFromPattern } from "./changelog-as-code";
import { validateManifest } from "./schema";
import type { FeatureEntry, FeatureType } from "./types";

export type InitFormat = "markdown" | "json";

export interface InitProjectOptions {
  cwd?: string;
  format?: InitFormat;
  force?: boolean;
  now?: Date;
}

export interface InitProjectResult {
  format: InitFormat;
  created: string[];
}

export interface AddFeatureOptions {
  cwd?: string;
  format?: InitFormat;
  id?: string;
  label: string;
  description?: string;
  type?: FeatureType;
  category?: string;
  url?: string;
  releasedAt?: string;
  showNewUntil?: string;
  showDays?: number;
}

export interface AddFeatureResult {
  format: InitFormat;
  path: string;
  entry: FeatureEntry;
}

export interface MigrateOptions {
  cwd?: string;
  from: "beamer";
  inputFile: string;
  outFile?: string;
  now?: Date;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

async function pathExists(path: string): Promise<boolean> {
  const result = await stat(path).catch(() => null);
  return !!result;
}

function ensureIsoDate(value: string, field: string): string {
  const parsed = new Date(value).getTime();
  if (!Number.isFinite(parsed)) {
    throw new Error(`"${field}" must be a valid ISO date string`);
  }
  return new Date(parsed).toISOString();
}

function withDays(date: Date, days: number): string {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function getPathDate(dateIso: string): string {
  return dateIso.slice(0, 10);
}

function getFrontmatterValue(value: string): string {
  return value.replace(/\n/g, " ").trim();
}

export function slugifyFeatureId(label: string): string {
  const slug = toSlug(label);
  return slug || "feature";
}

export function createFeatureEntry(options: AddFeatureOptions, now: Date = new Date()): FeatureEntry {
  const releasedAt = options.releasedAt
    ? ensureIsoDate(options.releasedAt, "releasedAt")
    : now.toISOString();
  const showNewUntil = options.showNewUntil
    ? ensureIsoDate(options.showNewUntil, "showNewUntil")
    : withDays(new Date(releasedAt), options.showDays ?? 14);
  const id = options.id ? slugifyFeatureId(options.id) : slugifyFeatureId(options.label);

  const entry: FeatureEntry = {
    id,
    label: options.label.trim(),
    releasedAt,
    showNewUntil,
    type: options.type ?? "feature",
  };

  if (options.description?.trim()) entry.description = options.description.trim();
  if (options.category?.trim()) entry.category = options.category.trim();
  if (options.url?.trim()) entry.url = options.url.trim();

  return entry;
}

export function renderFeatureMarkdown(entry: FeatureEntry): string {
  const lines = [
    "---",
    `id: ${getFrontmatterValue(entry.id)}`,
    `label: ${getFrontmatterValue(entry.label)}`,
    `releasedAt: ${entry.releasedAt}`,
    `showNewUntil: ${entry.showNewUntil}`,
  ];
  if (entry.type) lines.push(`type: ${entry.type}`);
  if (entry.category) lines.push(`category: ${getFrontmatterValue(entry.category)}`);
  if (entry.url) lines.push(`url: ${getFrontmatterValue(entry.url)}`);
  lines.push("---", "");
  if (entry.description) {
    lines.push(entry.description.trim(), "");
  } else {
    lines.push("Describe the feature here.", "");
  }
  return `${lines.join("\n")}`;
}

function getNextAvailablePath(existingNames: ReadonlySet<string>, baseName: string): string {
  if (!existingNames.has(baseName)) return baseName;
  const ext = baseName.endsWith(".md") ? ".md" : "";
  const withoutExt = ext ? baseName.slice(0, -ext.length) : baseName;
  let index = 2;
  while (existingNames.has(`${withoutExt}-${index}${ext}`)) {
    index += 1;
  }
  return `${withoutExt}-${index}${ext}`;
}

async function detectProjectFormat(cwd: string, explicit?: InitFormat): Promise<InitFormat> {
  if (explicit) return explicit;
  if (await pathExists(join(cwd, "features"))) return "markdown";
  if (await pathExists(join(cwd, "features.json"))) return "json";
  return "markdown";
}

export async function initFeaturedropProject(options: InitProjectOptions = {}): Promise<InitProjectResult> {
  const cwd = options.cwd ?? process.cwd();
  const format = options.format ?? "markdown";
  const now = options.now ?? new Date();
  const force = options.force ?? false;
  const created: string[] = [];

  if (format === "markdown") {
    const featuresDir = join(cwd, "features");
    if (await pathExists(featuresDir)) {
      const existing = await readdir(featuresDir).catch(() => []);
      if (existing.length > 0 && !force) {
        throw new Error("features/ already exists and is not empty (use --force to overwrite sample files)");
      }
    }
    await mkdir(featuresDir, { recursive: true });
    const sample = createFeatureEntry(
      {
        id: "welcome-featuredrop",
        label: "Welcome to featuredrop",
        description: "Update this file with your first product announcement.",
        category: "onboarding",
        type: "feature",
        releasedAt: now.toISOString(),
        showDays: 30,
      },
      now,
    );
    const sampleName = `${getPathDate(sample.releasedAt)}-${sample.id}.md`;
    const samplePath = join(featuresDir, sampleName);
    await writeFile(samplePath, renderFeatureMarkdown(sample), "utf8");
    created.push("features/");
    created.push(`features/${sampleName}`);
    return { format, created };
  }

  const manifestPath = join(cwd, "features.json");
  if (await pathExists(manifestPath)) {
    if (!force) {
      throw new Error("features.json already exists (use --force to overwrite)");
    }
  }
  const sample = createFeatureEntry(
    {
      id: "welcome-featuredrop",
      label: "Welcome to featuredrop",
      description: "Replace this sample entry with your own release notes.",
      category: "onboarding",
      type: "feature",
      releasedAt: now.toISOString(),
      showDays: 30,
    },
    now,
  );
  await writeFile(manifestPath, `${JSON.stringify([sample], null, 2)}\n`, "utf8");
  created.push("features.json");
  return { format, created };
}

async function ensureUniqueIdForMarkdown(cwd: string, id: string): Promise<void> {
  const featuresDir = join(cwd, "features");
  if (!(await pathExists(featuresDir))) return;
  const entries = await buildManifestFromPattern({ cwd, pattern: "features/**/*.md" }).catch(() => []);
  if (entries.some((entry) => entry.id === id)) {
    throw new Error(`Feature id "${id}" already exists`);
  }
}

async function addFeatureToMarkdown(cwd: string, entry: FeatureEntry): Promise<string> {
  await mkdir(join(cwd, "features"), { recursive: true });
  await ensureUniqueIdForMarkdown(cwd, entry.id);
  const existingFiles = new Set(
    (await readdir(join(cwd, "features")).catch(() => []))
      .filter((name) => name.endsWith(".md")),
  );
  const baseName = `${getPathDate(entry.releasedAt)}-${entry.id}.md`;
  const fileName = getNextAvailablePath(existingFiles, baseName);
  const relPath = `features/${fileName}`;
  await writeFile(join(cwd, relPath), renderFeatureMarkdown(entry), "utf8");
  return relPath;
}

async function addFeatureToJson(cwd: string, entry: FeatureEntry): Promise<string> {
  const manifestPath = join(cwd, "features.json");
  const raw = await readFile(manifestPath, "utf8").catch(() => "[]");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("features.json is not valid JSON");
  }
  if (!Array.isArray(parsed)) {
    throw new Error("features.json must contain an array of feature entries");
  }
  const existing = parsed as FeatureEntry[];
  if (existing.some((item) => item.id === entry.id)) {
    throw new Error(`Feature id "${entry.id}" already exists`);
  }
  const next = [...existing, entry];
  const validation = validateManifest(next);
  if (!validation.valid) {
    throw new Error(`features.json validation failed: ${validation.errors[0]?.message ?? "unknown error"}`);
  }
  await writeFile(manifestPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return "features.json";
}

export async function addFeatureEntry(options: AddFeatureOptions): Promise<AddFeatureResult> {
  const cwd = options.cwd ?? process.cwd();
  const format = await detectProjectFormat(cwd, options.format);
  const entry = createFeatureEntry(options);
  const path = format === "markdown"
    ? await addFeatureToMarkdown(cwd, entry)
    : await addFeatureToJson(cwd, entry);
  return { format, path, entry };
}

function pickString(obj: Record<string, unknown>, keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function getMigrationItems(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!isRecord(payload)) throw new Error("Migration payload must be an array or object");
  for (const key of ["posts", "items", "announcements", "entries"] as const) {
    const value = payload[key];
    if (Array.isArray(value)) return value;
  }
  throw new Error("Could not find entries array in migration payload");
}

function normalizeDate(raw: string | undefined, fallback: Date): string {
  if (!raw) return fallback.toISOString();
  const parsed = new Date(raw).getTime();
  if (!Number.isFinite(parsed)) return fallback.toISOString();
  return new Date(parsed).toISOString();
}

function buildFallbackId(index: number): string {
  return `beamer-entry-${index + 1}`;
}

export function migrateFromBeamerPayload(payload: unknown, now: Date = new Date()): FeatureEntry[] {
  const items = getMigrationItems(payload);
  const usedIds = new Set<string>();

  return items
    .map((raw, index) => {
      if (!isRecord(raw)) return null;
      const release = normalizeDate(
        pickString(raw, ["publishedAt", "published_at", "published", "createdAt", "created_at", "date"]),
        now,
      );
      const label = pickString(raw, ["title", "name", "headline"]) ?? `Update ${index + 1}`;
      const idSeed = pickString(raw, ["id", "uid", "slug", "postId", "post_id"]) ?? label;
      let id = slugifyFeatureId(idSeed);
      if (!id) id = buildFallbackId(index);
      while (usedIds.has(id)) {
        id = `${id}-${index + 1}`;
      }
      usedIds.add(id);

      const category = pickString(raw, ["category", "type", "segment"]);
      const url = pickString(raw, ["url", "link", "permalink"]);
      const description = pickString(raw, ["description", "content", "body", "html"]);
      const explicitShowUntil = normalizeDate(
        pickString(raw, ["showNewUntil", "show_new_until", "newUntil", "new_until"]),
        new Date(withDays(new Date(release), 30)),
      );

      const entry: FeatureEntry = {
        id,
        label,
        releasedAt: release,
        showNewUntil: explicitShowUntil,
        type: "feature",
      };
      if (description) entry.description = description;
      if (category) entry.category = category;
      if (url) entry.url = url;
      return entry;
    })
    .filter((value): value is FeatureEntry => !!value);
}

export async function migrateManifest(options: MigrateOptions): Promise<{ outFile: string; entries: FeatureEntry[] }> {
  const cwd = options.cwd ?? process.cwd();
  const outFile = options.outFile ?? "featuredrop.manifest.json";
  const inputPath = join(cwd, options.inputFile);
  const raw = await readFile(inputPath, "utf8");
  const payload = JSON.parse(raw) as unknown;

  if (options.from !== "beamer") {
    throw new Error(`Unsupported migration source "${options.from}"`);
  }

  const entries = migrateFromBeamerPayload(payload, options.now ?? new Date());
  await writeFile(join(cwd, outFile), `${JSON.stringify(entries, null, 2)}\n`, "utf8");
  return { outFile: basename(outFile), entries };
}
