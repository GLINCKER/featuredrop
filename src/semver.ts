// Minimal semver comparison utilities (no build metadata sorting needed)

export type Comparator = ">=" | "<=" | ">" | "<" | "=";

export interface SemverParts {
  major: number;
  minor: number;
  patch: number;
  prerelease: string[];
}

const SEMVER_REGEX = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?/;

export function parseSemver(input: string): SemverParts | null {
  const match = input.trim().match(SEMVER_REGEX);
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] ? match[4].split(".") : [],
  };
}

export function compareSemver(a: string, b: string): number {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  if (!pa || !pb) return 0;

  for (const key of ["major", "minor", "patch"] as const) {
    if (pa[key] !== pb[key]) return pa[key] - pb[key];
  }

  // Handle prerelease: absence > presence, otherwise lexicographic
  const aPre = pa.prerelease;
  const bPre = pb.prerelease;
  if (aPre.length === 0 && bPre.length === 0) return 0;
  if (aPre.length === 0) return 1;
  if (bPre.length === 0) return -1;

  const len = Math.max(aPre.length, bPre.length);
  for (let i = 0; i < len; i++) {
    const ai = aPre[i];
    const bi = bPre[i];
    if (ai === undefined) return -1;
    if (bi === undefined) return 1;
    const aNum = Number(ai);
    const bNum = Number(bi);
    const aIsNum = Number.isInteger(aNum);
    const bIsNum = Number.isInteger(bNum);
    if (aIsNum && bIsNum && aNum !== bNum) return aNum - bNum;
    if (aIsNum !== bIsNum) return aIsNum ? -1 : 1;
    if (ai !== bi) return ai < bi ? -1 : 1;
  }
  return 0;
}

function parseComparator(comp: string): { op: Comparator; version: string } | null {
  const match = comp.trim().match(/^(>=|<=|>|<|=)?\\s*(.+)$/);
  if (!match) return null;
  const op = (match[1] as Comparator) || ">=";
  const version = match[2];
  if (!parseSemver(version)) return null;
  return { op, version };
}

function satisfiesComparator(version: string, comp: { op: Comparator; version: string }): boolean {
  const diff = compareSemver(version, comp.version);
  switch (comp.op) {
    case ">":
      return diff > 0;
    case ">=":
      return diff >= 0;
    case "<":
      return diff < 0;
    case "<=":
      return diff <= 0;
    case "=":
      return diff === 0;
    default:
      return false;
  }
}

// Space-separated comparator list (AND semantics), e.g. ">=2.5.0 <3.0.0"
export function satisfiesRange(version: string, range: string): boolean {
  const parts = range.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return true;
  for (const part of parts) {
    const comp = parseComparator(part);
    if (!comp) return false;
    if (!satisfiesComparator(version, comp)) return false;
  }
  return true;
}
