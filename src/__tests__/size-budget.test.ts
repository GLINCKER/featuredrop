import { describe, expect, it } from "vitest";
import {
  checkBundleBudgets,
  formatBytes,
  measureGzipBytes,
} from "../size-budget";

describe("size budget utilities", () => {
  it("measures gzip byte size", () => {
    const bytes = measureGzipBytes("hello world");
    expect(bytes).toBeGreaterThan(0);
  });

  it("formats byte values", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toContain("kB");
  });

  it("evaluates budgets and reports failures", () => {
    const result = checkBundleBudgets(
      [
        { name: "core", sizeBytes: 1200 },
        { name: "react", sizeBytes: 6400 },
      ],
      [
        { name: "core", maxBytes: 1500 },
        { name: "react", maxBytes: 5000 },
      ],
    );

    expect(result.passed).toBe(false);
    expect(result.failures).toEqual([
      expect.objectContaining({
        name: "react",
        overByBytes: 1400,
      }),
    ]);
  });
});
