import { buildManifestFromPattern, parseFeatureFile } from "./changelog-as-code";
import { validateManifest } from "./schema";
import type { FeatureEntry } from "./types";

type CMSFieldResolver = string | ((record: unknown) => unknown);

export interface CMSFieldMapping {
  id?: CMSFieldResolver;
  label?: CMSFieldResolver;
  description?: CMSFieldResolver;
  releasedAt?: CMSFieldResolver;
  showNewUntil?: CMSFieldResolver;
  sidebarKey?: CMSFieldResolver;
  category?: CMSFieldResolver;
  product?: CMSFieldResolver;
  flagKey?: CMSFieldResolver;
  url?: CMSFieldResolver;
  image?: CMSFieldResolver;
  publishAt?: CMSFieldResolver;
  type?: CMSFieldResolver;
  priority?: CMSFieldResolver;
  ctaLabel?: CMSFieldResolver;
  ctaUrl?: CMSFieldResolver;
}

export interface CMSAdapter {
  load: () => Promise<FeatureEntry[]>;
}

interface NormalizedCMSFieldMapping {
  id: CMSFieldResolver;
  label: CMSFieldResolver;
  releasedAt: CMSFieldResolver;
  showNewUntil: CMSFieldResolver;
  description?: CMSFieldResolver;
  sidebarKey?: CMSFieldResolver;
  category?: CMSFieldResolver;
  product?: CMSFieldResolver;
  flagKey?: CMSFieldResolver;
  url?: CMSFieldResolver;
  image?: CMSFieldResolver;
  publishAt?: CMSFieldResolver;
  type?: CMSFieldResolver;
  priority?: CMSFieldResolver;
  ctaLabel?: CMSFieldResolver;
  ctaUrl?: CMSFieldResolver;
}

interface CMSAdapterBaseOptions {
  fieldMapping?: CMSFieldMapping;
  /** Throw when mapped entries are invalid. Default false (invalid entries are dropped). */
  strictValidation?: boolean;
}

const DEFAULT_FIELDS: NormalizedCMSFieldMapping = {
  id: "id",
  label: "label",
  releasedAt: "releasedAt",
  showNewUntil: "showNewUntil",
  description: "description",
  sidebarKey: "sidebarKey",
  category: "category",
  product: "product",
  flagKey: "flagKey",
  url: "url",
  image: "image",
  publishAt: "publishAt",
  type: "type",
  priority: "priority",
  ctaLabel: "cta.label",
  ctaUrl: "cta.url",
};

interface ContentfulAdapterOptions extends CMSAdapterBaseOptions {
  spaceId: string;
  accessToken: string;
  contentType: string;
  environment?: string;
  locale?: string;
  limit?: number;
}

interface SanityAdapterOptions extends CMSAdapterBaseOptions {
  projectId: string;
  dataset: string;
  query: string;
  token?: string;
  apiVersion?: string;
}

interface StrapiAdapterOptions extends CMSAdapterBaseOptions {
  baseUrl: string;
  endpoint?: string;
  token?: string;
  query?: string;
}

interface NotionAdapterOptions extends CMSAdapterBaseOptions {
  databaseId: string;
  token: string;
  notionVersion?: string;
  filter?: Record<string, unknown>;
  sorts?: Array<Record<string, unknown>>;
}

interface MarkdownAdapterFile {
  source?: string;
  markdown: string;
}

interface MarkdownAdapterOptions extends CMSAdapterBaseOptions {
  pattern?: string;
  cwd?: string;
  entries?: MarkdownAdapterFile[];
}

function getByPath(record: unknown, path: string): unknown {
  const parts = path.split(".").filter(Boolean);
  let cursor: unknown = record;
  for (const part of parts) {
    if (!cursor || typeof cursor !== "object") return undefined;
    cursor = (cursor as Record<string, unknown>)[part];
  }
  return cursor;
}

function normalizeLocalizedValue(value: unknown): unknown {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const objectValue = value as Record<string, unknown>;
    const keys = Object.keys(objectValue);
    if (keys.length === 1) {
      const nested = objectValue[keys[0]];
      if (
        typeof nested === "string" ||
        typeof nested === "number" ||
        typeof nested === "boolean" ||
        nested == null
      ) {
        return nested;
      }
    }
  }
  return value;
}

function resolveField(record: unknown, resolver?: CMSFieldResolver): unknown {
  if (!resolver) return undefined;
  if (typeof resolver === "function") return resolver(record);
  return normalizeLocalizedValue(getByPath(record, resolver));
}

function asString(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return undefined;
}

function normalizeFieldMapping(
  defaults: NormalizedCMSFieldMapping,
  overrides?: CMSFieldMapping,
): NormalizedCMSFieldMapping {
  return {
    ...defaults,
    ...overrides,
  };
}

function validateMappedEntries(
  entries: FeatureEntry[],
  options?: CMSAdapterBaseOptions,
): FeatureEntry[] {
  const strictValidation = options?.strictValidation ?? false;
  const validEntries: FeatureEntry[] = [];
  const seenIds = new Set<string>();
  const errors: string[] = [];

  for (const entry of entries) {
    if (seenIds.has(entry.id)) {
      errors.push(`${entry.id}: duplicate id`);
      continue;
    }
    seenIds.add(entry.id);

    const validation = validateManifest([entry]);
    if (validation.valid) {
      validEntries.push(entry);
      continue;
    }
    const reason = validation.errors
      .map((error) => `${error.path} ${error.message}`)
      .join("; ");
    errors.push(`${entry.id}: ${reason}`);
  }

  if (errors.length > 0) {
    if (strictValidation) {
      throw new Error(`[featuredrop] CMS mapping validation failed: ${errors.join(" | ")}`);
    }
    if (typeof process !== "undefined" && process.env.NODE_ENV !== "production") {
      console.warn(`[featuredrop] Skipped ${errors.length} invalid CMS entries.`);
    }
  }

  return validEntries;
}

function mapRecordToFeatureEntry(
  record: unknown,
  mapping: NormalizedCMSFieldMapping,
): FeatureEntry | null {
  const id = asString(resolveField(record, mapping.id));
  const label = asString(resolveField(record, mapping.label));
  const releasedAt = asString(resolveField(record, mapping.releasedAt));
  const showNewUntil = asString(resolveField(record, mapping.showNewUntil));

  if (!id || !label || !releasedAt || !showNewUntil) return null;

  const entry: FeatureEntry = {
    id,
    label,
    releasedAt,
    showNewUntil,
  };

  const description = asString(resolveField(record, mapping.description));
  if (description) entry.description = description;

  const sidebarKey = asString(resolveField(record, mapping.sidebarKey));
  if (sidebarKey) entry.sidebarKey = sidebarKey;

  const category = asString(resolveField(record, mapping.category));
  if (category) entry.category = category;

  const product = asString(resolveField(record, mapping.product));
  if (product) entry.product = product;

  const flagKey = asString(resolveField(record, mapping.flagKey));
  if (flagKey) entry.flagKey = flagKey;

  const url = asString(resolveField(record, mapping.url));
  if (url) entry.url = url;

  const image = asString(resolveField(record, mapping.image));
  if (image) entry.image = image;

  const publishAt = asString(resolveField(record, mapping.publishAt));
  if (publishAt) entry.publishAt = publishAt;

  const type = asString(resolveField(record, mapping.type));
  if (type && ["feature", "improvement", "fix", "breaking"].includes(type)) {
    entry.type = type as FeatureEntry["type"];
  }

  const priority = asString(resolveField(record, mapping.priority));
  if (priority && ["critical", "normal", "low"].includes(priority)) {
    entry.priority = priority as FeatureEntry["priority"];
  }

  const ctaLabel = asString(resolveField(record, mapping.ctaLabel));
  const ctaUrl = asString(resolveField(record, mapping.ctaUrl));
  if (ctaLabel && ctaUrl) {
    entry.cta = { label: ctaLabel, url: ctaUrl };
  }

  return entry;
}

async function fetchJson<T>(
  input: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(input, init);
  if (!response.ok) {
    throw new Error(`[featuredrop] CMS request failed (${response.status}) for ${input}`);
  }
  return response.json() as Promise<T>;
}

export class ContentfulAdapter implements CMSAdapter {
  private readonly options: ContentfulAdapterOptions;

  constructor(options: ContentfulAdapterOptions) {
    this.options = options;
  }

  async load(): Promise<FeatureEntry[]> {
    const environment = this.options.environment ?? "master";
    const params = new URLSearchParams({
      content_type: this.options.contentType,
      limit: String(this.options.limit ?? 1000),
    });
    if (this.options.locale) {
      params.set("locale", this.options.locale);
    }
    const url =
      `https://cdn.contentful.com/spaces/${encodeURIComponent(this.options.spaceId)}`
      + `/environments/${encodeURIComponent(environment)}/entries?${params.toString()}`;

    const payload = await fetchJson<{ items?: unknown[] }>(url, {
      headers: {
        Authorization: `Bearer ${this.options.accessToken}`,
      },
    });

    const mapping = normalizeFieldMapping(
      {
        ...DEFAULT_FIELDS,
        id: "sys.id",
        label: "fields.label",
        description: "fields.description",
        releasedAt: "fields.releasedAt",
        showNewUntil: "fields.showNewUntil",
        sidebarKey: "fields.sidebarKey",
        category: "fields.category",
        product: "fields.product",
        flagKey: "fields.flagKey",
        url: "fields.url",
        image: "fields.image",
        publishAt: "fields.publishAt",
        type: "fields.type",
        priority: "fields.priority",
        ctaLabel: "fields.ctaLabel",
        ctaUrl: "fields.ctaUrl",
      },
      this.options.fieldMapping,
    );

    const entries = (payload.items ?? [])
      .map((item) => mapRecordToFeatureEntry(item, mapping))
      .filter((entry): entry is FeatureEntry => entry !== null);
    return validateMappedEntries(entries, this.options);
  }
}

export class SanityAdapter implements CMSAdapter {
  private readonly options: SanityAdapterOptions;

  constructor(options: SanityAdapterOptions) {
    this.options = options;
  }

  async load(): Promise<FeatureEntry[]> {
    const version = this.options.apiVersion ?? "v2023-10-01";
    const queryParam = encodeURIComponent(this.options.query);
    const url = `https://${encodeURIComponent(this.options.projectId)}.api.sanity.io/${version}/data/query/${encodeURIComponent(this.options.dataset)}?query=${queryParam}`;

    const headers: Record<string, string> = {};
    if (this.options.token) {
      headers.Authorization = `Bearer ${this.options.token}`;
    }

    const payload = await fetchJson<{ result?: unknown[] }>(url, {
      headers,
    });

    const mapping = normalizeFieldMapping(
      {
        ...DEFAULT_FIELDS,
        id: "_id",
      },
      this.options.fieldMapping,
    );

    const entries = (payload.result ?? [])
      .map((item) => mapRecordToFeatureEntry(item, mapping))
      .filter((entry): entry is FeatureEntry => entry !== null);
    return validateMappedEntries(entries, this.options);
  }
}

export class StrapiAdapter implements CMSAdapter {
  private readonly options: StrapiAdapterOptions;

  constructor(options: StrapiAdapterOptions) {
    this.options = options;
  }

  async load(): Promise<FeatureEntry[]> {
    const endpoint = this.options.endpoint ?? "/api/features";
    const base = this.options.baseUrl.replace(/\/+$/, "");
    const query = this.options.query ? `?${this.options.query}` : "";
    const url = `${base}${endpoint}${query}`;

    const headers: Record<string, string> = {};
    if (this.options.token) {
      headers.Authorization = `Bearer ${this.options.token}`;
    }

    const payload = await fetchJson<{ data?: unknown[] }>(url, { headers });
    const mapping = normalizeFieldMapping(DEFAULT_FIELDS, this.options.fieldMapping);

    const entries = (payload.data ?? [])
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const record = item as Record<string, unknown>;
        const attributes = record.attributes;
        if (attributes && typeof attributes === "object") {
          return mapRecordToFeatureEntry(
            { id: record.id, ...(attributes as Record<string, unknown>) },
            mapping,
          );
        }
        return mapRecordToFeatureEntry(record, mapping);
      })
      .filter((entry): entry is FeatureEntry => entry !== null);
    return validateMappedEntries(entries, this.options);
  }
}

function notionPropertyToValue(property: unknown): unknown {
  if (!property || typeof property !== "object") return undefined;
  const typed = property as Record<string, unknown>;
  const type = typed.type;
  if (typeof type !== "string") return undefined;

  const value = typed[type];
  if (type === "title" || type === "rich_text") {
    if (!Array.isArray(value)) return undefined;
    return value
      .map((item) => {
        if (!item || typeof item !== "object") return "";
        return asString((item as Record<string, unknown>).plain_text) ?? "";
      })
      .join("")
      .trim();
  }
  if (type === "select") {
    if (!value || typeof value !== "object") return undefined;
    return asString((value as Record<string, unknown>).name);
  }
  if (type === "multi_select") {
    if (!Array.isArray(value)) return undefined;
    return value
      .map((item) => (item && typeof item === "object"
        ? asString((item as Record<string, unknown>).name)
        : undefined))
      .filter((item): item is string => Boolean(item));
  }
  if (type === "date") {
    if (!value || typeof value !== "object") return undefined;
    return asString((value as Record<string, unknown>).start);
  }
  if (type === "number" || type === "url" || type === "email" || type === "phone_number") {
    return value;
  }
  if (type === "checkbox") {
    return value === true ? "true" : value === false ? "false" : undefined;
  }
  return undefined;
}

function flattenNotionPage(page: unknown): Record<string, unknown> {
  if (!page || typeof page !== "object") return {};
  const record = page as Record<string, unknown>;
  const properties = record.properties;
  const flattened: Record<string, unknown> = {
    id: record.id,
  };

  if (properties && typeof properties === "object") {
    Object.entries(properties as Record<string, unknown>).forEach(([key, value]) => {
      flattened[key] = notionPropertyToValue(value);
    });
  }

  return flattened;
}

export class NotionAdapter implements CMSAdapter {
  private readonly options: NotionAdapterOptions;

  constructor(options: NotionAdapterOptions) {
    this.options = options;
  }

  async load(): Promise<FeatureEntry[]> {
    const body: Record<string, unknown> = {};
    if (this.options.filter) body.filter = this.options.filter;
    if (this.options.sorts) body.sorts = this.options.sorts;

    const payload = await fetchJson<{ results?: unknown[] }>(
      `https://api.notion.com/v1/databases/${encodeURIComponent(this.options.databaseId)}/query`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.options.token}`,
          "Notion-Version": this.options.notionVersion ?? "2022-06-28",
        },
        body: JSON.stringify(body),
      },
    );

    const mapping = normalizeFieldMapping(DEFAULT_FIELDS, this.options.fieldMapping);

    const entries = (payload.results ?? [])
      .map((page) => mapRecordToFeatureEntry(flattenNotionPage(page), mapping))
      .filter((entry): entry is FeatureEntry => entry !== null);
    return validateMappedEntries(entries, this.options);
  }
}

export class MarkdownAdapter implements CMSAdapter {
  private readonly options: MarkdownAdapterOptions;

  constructor(options: MarkdownAdapterOptions = {}) {
    this.options = options;
  }

  async load(): Promise<FeatureEntry[]> {
    if (this.options.pattern) {
      const entries = await buildManifestFromPattern({
        cwd: this.options.cwd,
        pattern: this.options.pattern,
      });
      return validateMappedEntries(entries, this.options);
    }

    const entries = this.options.entries ?? [];
    const mapped = entries.map((entry, index) => {
      const source = entry.source ?? `feature-${index + 1}.md`;
      return parseFeatureFile(entry.markdown, source);
    });
    return validateMappedEntries(mapped, this.options);
  }
}
