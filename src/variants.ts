import type { FeatureEntry, FeatureManifest, FeatureVariant } from "./types";

const VARIANT_META_KEY = "featuredropVariant";
const VARIANT_KEY_STORAGE = "featuredrop:variant-key";

function readStorageValue(key: string): string | null {
  const storage = globalThis.localStorage as unknown as {
    getItem?: (storageKey: string) => string | null;
  };
  if (!storage || typeof storage.getItem !== "function") return null;
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorageValue(key: string, value: string): void {
  const storage = globalThis.localStorage as unknown as {
    setItem?: (storageKey: string, storageValue: string) => void;
  };
  if (!storage || typeof storage.setItem !== "function") return;
  try {
    storage.setItem(key, value);
  } catch {
    // noop
  }
}

function hashToPercent(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 100;
}

function normalizeSplit(count: number, split?: number[]): number[] {
  if (!split || split.length !== count) {
    return Array.from({ length: count }, () => 100 / count);
  }
  const cleaned = split.map((value) => (Number.isFinite(value) && value > 0 ? value : 0));
  const total = cleaned.reduce((sum, value) => sum + value, 0);
  if (total <= 0) {
    return Array.from({ length: count }, () => 100 / count);
  }
  return cleaned.map((value) => (value / total) * 100);
}

function pickVariantName(feature: FeatureEntry, variantKey: string): string | null {
  const variants = feature.variants;
  if (!variants) return null;
  const names = Object.keys(variants);
  if (names.length === 0) return null;
  if (names.length === 1) return names[0];

  const split = normalizeSplit(names.length, feature.variantSplit);
  const bucket = hashToPercent(`${feature.id}:${variantKey}`);
  let cumulative = 0;
  for (let i = 0; i < names.length; i += 1) {
    cumulative += split[i];
    if (bucket < cumulative) return names[i];
  }
  return names[names.length - 1];
}

export function getFeatureVariantName(feature: FeatureEntry): string | undefined {
  const raw = feature.meta?.[VARIANT_META_KEY];
  return typeof raw === "string" ? raw : undefined;
}

export function applyFeatureVariant(
  feature: FeatureEntry,
  variantKey: string,
): FeatureEntry {
  const variantName = pickVariantName(feature, variantKey);
  if (!variantName) return feature;
  const variant: FeatureVariant | undefined = feature.variants?.[variantName];
  if (!variant) return feature;

  return {
    ...feature,
    label: variant.label ?? feature.label,
    description: variant.description ?? feature.description,
    image: variant.image ?? feature.image,
    cta: variant.cta ?? feature.cta,
    meta: {
      ...(feature.meta ?? {}),
      ...(variant.meta ?? {}),
      [VARIANT_META_KEY]: variantName,
    },
  };
}

export function applyFeatureVariants(
  manifest: FeatureManifest,
  variantKey: string,
): FeatureEntry[] {
  return manifest.map((feature) => applyFeatureVariant(feature, variantKey));
}

function createRandomKey(): string {
  return Math.random().toString(36).slice(2, 12);
}

export function getOrCreateVariantKey(explicitKey?: string): string {
  if (explicitKey) return explicitKey;
  const existing = readStorageValue(VARIANT_KEY_STORAGE);
  if (existing) return existing;
  const next = createRandomKey();
  writeStorageValue(VARIANT_KEY_STORAGE, next);
  return next;
}
