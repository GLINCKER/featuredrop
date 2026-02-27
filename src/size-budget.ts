import { gzipSync } from "node:zlib";

export interface BundleBudget {
  name: string;
  maxBytes: number;
}

export interface BundleSizeMeasurement {
  name: string;
  sizeBytes: number;
}

export interface BundleBudgetResult {
  passed: boolean;
  measurements: BundleSizeMeasurement[];
  failures: Array<BundleSizeMeasurement & { maxBytes: number; overByBytes: number }>;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(2)} kB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

export function measureGzipBytes(content: string | Uint8Array): number {
  return gzipSync(content).byteLength;
}

export function checkBundleBudgets(
  measurements: BundleSizeMeasurement[],
  budgets: BundleBudget[],
): BundleBudgetResult {
  const budgetByName = new Map(budgets.map((budget) => [budget.name, budget.maxBytes]));

  const failures = measurements
    .map((measurement) => {
      const maxBytes = budgetByName.get(measurement.name);
      if (maxBytes === undefined) return null;
      if (measurement.sizeBytes <= maxBytes) return null;
      return {
        ...measurement,
        maxBytes,
        overByBytes: measurement.sizeBytes - maxBytes,
      };
    })
    .filter((failure): failure is BundleBudgetResult["failures"][number] => failure !== null);

  return {
    passed: failures.length === 0,
    measurements,
    failures,
  };
}
