import { hasDependencyCycle } from "./dependencies";
import type { FeatureEntry, FeatureManifest } from "./types";
import { z } from "zod";

export interface ValidationIssue {
  path: string;
  message: string;
  code:
    | "invalid_type"
    | "missing_required"
    | "invalid_value"
    | "invalid_date"
    | "duplicate_id"
    | "circular_dependency";
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
}

export const featureEntryJsonSchema = {
  type: "object",
  required: ["id", "label", "releasedAt", "showNewUntil"],
  properties: {
    id: { type: "string" },
    label: { type: "string" },
    description: { type: "string" },
    releasedAt: { type: "string", format: "date-time" },
    showNewUntil: { type: "string", format: "date-time" },
    flagKey: { type: "string" },
    product: { type: "string" },
    url: { type: "string" },
    image: { type: "string" },
    type: { enum: ["feature", "improvement", "fix", "breaking"] },
    priority: { enum: ["critical", "normal", "low"] },
    cta: {
      type: "object",
      properties: {
        label: { type: "string" },
        url: { type: "string" },
      },
    },
    meta: { type: "object" },
  },
} as const;

export const featureManifestJsonSchema = {
  type: "array",
  items: featureEntryJsonSchema,
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isValidDate(value: string): boolean {
  return Number.isFinite(new Date(value).getTime());
}

const nonEmptyString = z.string().trim().min(1, "must be a non-empty string");

const isoDateString = nonEmptyString.refine(isValidDate, {
  message: "must be a valid date",
  params: { featuredropCode: "invalid_date" },
});

const dependsOnSchema = z
  .object({
    seen: z.array(z.string()).optional(),
    clicked: z.array(z.string()).optional(),
    dismissed: z.array(z.string()).optional(),
  })
  .optional();

const ctaSchema = z
  .object({
    label: nonEmptyString,
    url: nonEmptyString,
  })
  .optional();

export const featureEntrySchema = z
  .object({
    id: nonEmptyString,
    label: nonEmptyString,
    releasedAt: isoDateString,
    showNewUntil: isoDateString,
    description: z.string().optional(),
    flagKey: z.string().optional(),
    product: z.string().optional(),
    url: z.string().optional(),
    image: z.string().optional(),
    type: z.enum(["feature", "improvement", "fix", "breaking"]).optional(),
    priority: z.enum(["critical", "normal", "low"]).optional(),
    cta: ctaSchema,
    meta: z.record(z.unknown()).optional(),
    dependsOn: dependsOnSchema,
  })
  .passthrough();

export const featureManifestSchema = z.array(featureEntrySchema);

function toIssuePath(path: Array<string | number>): string {
  if (path.length === 0) return "$";
  let output = "";
  for (const part of path) {
    if (typeof part === "number") output += `[${part}]`;
    else output += output ? `.${part}` : part;
  }
  return output;
}

function mapZodIssue(issue: z.ZodIssue): ValidationIssue {
  const codeParam = (issue as { params?: Record<string, unknown> }).params?.featuredropCode;
  if (codeParam === "invalid_date") {
    return {
      path: toIssuePath(issue.path),
      message: issue.message,
      code: "invalid_date",
    };
  }
  if (issue.code === "invalid_type") {
    return {
      path: toIssuePath(issue.path),
      message: issue.message,
      code: issue.received === "undefined" ? "missing_required" : "invalid_type",
    };
  }
  return {
    path: toIssuePath(issue.path),
    message: issue.message,
    code: "invalid_value",
  };
}

const UNSAFE_META_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function isSafeUrl(value: string): boolean {
  const normalized = value.trim();
  if (!normalized) return false;
  if (/^(\/|\.\/|\.\.\/|\?|#)/.test(normalized)) return true;
  if (/^https?:\/\//i.test(normalized)) return true;
  return false;
}

function findUnsafeMetaPath(value: unknown, path = "meta"): string | null {
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index++) {
      const nested = findUnsafeMetaPath(value[index], `${path}[${index}]`);
      if (nested) return nested;
    }
    return null;
  }

  if (!isRecord(value)) return null;
  for (const [key, nestedValue] of Object.entries(value)) {
    if (UNSAFE_META_KEYS.has(key)) {
      return `${path}.${key}`;
    }
    const nested = findUnsafeMetaPath(nestedValue, `${path}.${key}`);
    if (nested) return nested;
  }
  return null;
}

function validateFeatureEntry(raw: unknown, index: number): { entry?: FeatureEntry; issues: ValidationIssue[] } {
  if (!isRecord(raw)) {
    return {
      issues: [
        {
          path: `[${index}]`,
          message: "Feature entry must be an object",
          code: "invalid_type",
        },
      ],
    };
  }

  const parsed = featureEntrySchema.safeParse(raw);
  if (!parsed.success) {
    return {
      issues: parsed.error.issues.map((issue) => ({
        ...mapZodIssue(issue),
        path: `[${index}]${issue.path.length > 0 ? `.${toIssuePath(issue.path)}` : ""}`,
      })),
    };
  }

  return {
    issues: [],
    entry: parsed.data as FeatureEntry,
  };
}

export function validateManifest(data: unknown): ValidationResult {
  const errors: ValidationIssue[] = [];
  if (!Array.isArray(data)) {
    return {
      valid: false,
      errors: [
        {
          path: "$",
          message: "Manifest must be an array",
          code: "invalid_type",
        },
      ],
    };
  }

  const entries: FeatureEntry[] = [];
  const seenIds = new Set<string>();
  data.forEach((item, index) => {
    const result = validateFeatureEntry(item, index);
    errors.push(...result.issues);
    if (!result.entry) return;
    if (seenIds.has(result.entry.id)) {
      errors.push({
        path: `[${index}].id`,
        message: `Duplicate feature id "${result.entry.id}"`,
        code: "duplicate_id",
      });
      return;
    }
    seenIds.add(result.entry.id);
    entries.push(result.entry);
  });

  if (entries.length > 0 && hasDependencyCycle(entries as FeatureManifest)) {
    errors.push({
      path: "$",
      message: "Circular dependsOn relationship detected",
      code: "circular_dependency",
    });
  }

  for (let index = 0; index < entries.length; index++) {
    const entry = entries[index];
    if (new Date(entry.showNewUntil).getTime() <= new Date(entry.releasedAt).getTime()) {
      errors.push({
        path: `[${index}].showNewUntil`,
        message: "showNewUntil must be after releasedAt",
        code: "invalid_value",
      });
    }

    if (entry.url && !isSafeUrl(entry.url)) {
      errors.push({
        path: `[${index}].url`,
        message: "url must be http, https, or relative",
        code: "invalid_value",
      });
    }

    if (entry.image && !isSafeUrl(entry.image)) {
      errors.push({
        path: `[${index}].image`,
        message: "image must be http, https, or relative",
        code: "invalid_value",
      });
    }

    if (entry.cta?.url && !isSafeUrl(entry.cta.url)) {
      errors.push({
        path: `[${index}].cta.url`,
        message: "cta.url must be http, https, or relative",
        code: "invalid_value",
      });
    }

    const unsafeMetaPath = findUnsafeMetaPath(entry.meta);
    if (unsafeMetaPath) {
      errors.push({
        path: `[${index}].${unsafeMetaPath}`,
        message: `meta contains unsafe key "${unsafeMetaPath.split(".").pop()}"`,
        code: "invalid_value",
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
