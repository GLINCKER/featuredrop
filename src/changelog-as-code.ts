import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import type { FeatureEntry } from "./types";
import { validateManifest } from "./schema";

interface ParseResult {
  frontmatter: Record<string, unknown>;
  body: string;
}

export interface BuildManifestOptions {
  cwd?: string;
  pattern?: string;
  outFile?: string;
}

function parseScalar(raw: string): unknown {
  const value = raw.trim();
  if (!value) return "";
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null") return null;
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  if (value.startsWith("[") && value.endsWith("]")) {
    const inner = value.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(",").map((part) => String(parseScalar(part.trim())));
  }
  return value;
}

function parseFrontmatter(raw: string): Record<string, unknown> {
  const lines = raw.split(/\r?\n/);
  const root: Record<string, unknown> = {};
  const stack: Array<{ indent: number; value: Record<string, unknown> | unknown[] }> = [
    { indent: -1, value: root },
  ];

  const isArrayContext = (idx: number): boolean => {
    for (let i = idx + 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      const indent = line.length - line.trimStart().length;
      if (indent <= (lines[idx].length - lines[idx].trimStart().length)) return false;
      return line.trimStart().startsWith("- ");
    }
    return false;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim() || line.trimStart().startsWith("#")) continue;

    const indent = line.length - line.trimStart().length;
    const trimmed = line.trim();

    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
      stack.pop();
    }

    const current = stack[stack.length - 1].value;

    if (trimmed.startsWith("- ")) {
      if (!Array.isArray(current)) {
        throw new Error(`Invalid frontmatter list at line ${i + 1}`);
      }
      const item = trimmed.slice(2).trim();
      current.push(parseScalar(item));
      continue;
    }

    const colon = trimmed.indexOf(":");
    if (colon === -1) {
      throw new Error(`Invalid frontmatter line ${i + 1}: ${trimmed}`);
    }

    const key = trimmed.slice(0, colon).trim();
    const rest = trimmed.slice(colon + 1).trim();

    if (Array.isArray(current)) {
      throw new Error(`Unexpected key in list at line ${i + 1}`);
    }

    if (!rest) {
      const container: Record<string, unknown> | unknown[] = isArrayContext(i) ? [] : {};
      current[key] = container;
      stack.push({ indent, value: container });
      continue;
    }

    current[key] = parseScalar(rest);
  }

  return root;
}

function splitFrontmatter(markdown: string): ParseResult {
  const normalized = markdown.replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n")) {
    return { frontmatter: {}, body: normalized.trim() };
  }

  const end = normalized.indexOf("\n---\n", 4);
  if (end === -1) {
    throw new Error("Frontmatter block is not closed with ---");
  }

  const fmRaw = normalized.slice(4, end);
  const body = normalized.slice(end + 5).trim();
  return {
    frontmatter: parseFrontmatter(fmRaw),
    body,
  };
}

function asString(value: unknown, field: string, source: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${source}: "${field}" must be a non-empty string`);
  }
  return value;
}

function asOptionalObject(value: unknown, field: string, source: string): Record<string, unknown> | undefined {
  if (value === undefined) return undefined;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${source}: "${field}" must be an object`);
  }
  return value as Record<string, unknown>;
}

export function parseFeatureFile(markdown: string, source = "feature.md"): FeatureEntry {
  const { frontmatter, body } = splitFrontmatter(markdown);

  const entry: FeatureEntry = {
    id: asString(frontmatter.id, "id", source),
    label: asString(frontmatter.label, "label", source),
    releasedAt: asString(frontmatter.releasedAt, "releasedAt", source),
    showNewUntil: asString(frontmatter.showNewUntil, "showNewUntil", source),
    description: body || undefined,
  };

  if (frontmatter.sidebarKey !== undefined) entry.sidebarKey = asString(frontmatter.sidebarKey, "sidebarKey", source);
  if (frontmatter.category !== undefined) entry.category = asString(frontmatter.category, "category", source);
  if (frontmatter.product !== undefined) entry.product = asString(frontmatter.product, "product", source);
  if (frontmatter.url !== undefined) entry.url = asString(frontmatter.url, "url", source);
  if (frontmatter.flagKey !== undefined) entry.flagKey = asString(frontmatter.flagKey, "flagKey", source);
  if (frontmatter.image !== undefined) entry.image = asString(frontmatter.image, "image", source);
  if (frontmatter.publishAt !== undefined) entry.publishAt = asString(frontmatter.publishAt, "publishAt", source);
  if (frontmatter.version !== undefined) {
    if (typeof frontmatter.version === "string" || typeof frontmatter.version === "object") {
      entry.version = frontmatter.version as FeatureEntry["version"];
    } else {
      throw new Error(`${source}: "version" must be a string or object`);
    }
  }
  if (frontmatter.type !== undefined) {
    const type = asString(frontmatter.type, "type", source);
    if (!["feature", "improvement", "fix", "breaking"].includes(type)) {
      throw new Error(`${source}: invalid "type" value "${type}"`);
    }
    entry.type = type as FeatureEntry["type"];
  }
  if (frontmatter.priority !== undefined) {
    const priority = asString(frontmatter.priority, "priority", source);
    if (!["critical", "normal", "low"].includes(priority)) {
      throw new Error(`${source}: invalid "priority" value "${priority}"`);
    }
    entry.priority = priority as FeatureEntry["priority"];
  }

  const cta = asOptionalObject(frontmatter.cta, "cta", source);
  if (cta) {
    entry.cta = {
      label: asString(cta.label, "cta.label", source),
      url: asString(cta.url, "cta.url", source),
    };
  }

  const audience = asOptionalObject(frontmatter.audience, "audience", source);
  if (audience) {
    const parsedAudience: FeatureEntry["audience"] = {};
    for (const field of ["plan", "role", "region"] as const) {
      const value = audience[field];
      if (value !== undefined) {
        if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
          throw new Error(`${source}: "audience.${field}" must be string[]`);
        }
        parsedAudience[field] = value;
      }
    }
    if (audience.custom !== undefined) {
      if (!audience.custom || typeof audience.custom !== "object" || Array.isArray(audience.custom)) {
        throw new Error(`${source}: "audience.custom" must be an object`);
      }
      parsedAudience.custom = audience.custom as Record<string, unknown>;
    }
    entry.audience = parsedAudience;
  }

  return entry;
}

function normalizePattern(pattern: string): { baseDir: string; ext: string } {
  const normalized = pattern.replaceAll("\\", "/");
  if (normalized.endsWith("/**/*.md")) {
    return {
      baseDir: normalized.slice(0, -"/**/*.md".length),
      ext: ".md",
    };
  }
  throw new Error(`Unsupported pattern "${pattern}". Use "features/**/*.md" style patterns.`);
}

async function collectFiles(dir: string, ext: string): Promise<string[]> {
  const out: string[] = [];
  async function walk(current: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const fullPath = join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }
      if (entry.isFile() && entry.name.endsWith(ext)) {
        out.push(fullPath);
      }
    }
  }
  await walk(dir);
  return out.sort();
}

export async function buildManifestFromPattern(options: BuildManifestOptions = {}): Promise<FeatureEntry[]> {
  const cwd = options.cwd ?? process.cwd();
  const pattern = options.pattern ?? "features/**/*.md";
  const { baseDir, ext } = normalizePattern(pattern);
  const baseAbs = join(cwd, baseDir);

  const stats = await stat(baseAbs).catch(() => null);
  if (!stats || !stats.isDirectory()) {
    throw new Error(`Pattern base directory does not exist: ${baseDir}`);
  }

  const files = await collectFiles(baseAbs, ext);
  const entries: FeatureEntry[] = [];
  const seenIds = new Set<string>();

  for (const file of files) {
    const content = await readFile(file, "utf8");
    const source = relative(cwd, file).split(sep).join("/");
    const entry = parseFeatureFile(content, source);
    if (seenIds.has(entry.id)) {
      throw new Error(`Duplicate feature id "${entry.id}" found at ${source}`);
    }
    seenIds.add(entry.id);
    entries.push(entry);
  }

  if (options.outFile) {
    const outPath = join(cwd, options.outFile);
    await writeFile(outPath, `${JSON.stringify(entries, null, 2)}\n`, "utf8");
  }

  return entries;
}

export async function validateFeatureFiles(options: BuildManifestOptions = {}): Promise<void> {
  const entries = await buildManifestFromPattern(options);
  const result = validateManifest(entries);
  if (!result.valid) {
    const message = result.errors
      .map((issue) => `${issue.path}: ${issue.message}`)
      .join("; ");
    throw new Error(`Manifest validation failed: ${message}`);
  }
}
