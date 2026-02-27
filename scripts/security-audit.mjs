#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const TARGET_DIRS = ["src"];
const SKIP_DIRS = new Set(["node_modules", "dist", "coverage", ".git", "__tests__"]);

/** @type {Array<{ name: string; regex: RegExp; message: string; allowlist?: RegExp[] }>} */
const RULES = [
  {
    name: "eval",
    regex: /\beval\s*\(/g,
    message: "Avoid eval(); dynamic code execution is not allowed.",
  },
  {
    name: "new-function",
    regex: /\bnew\s+Function\s*\(/g,
    message: "Avoid new Function(); dynamic code execution is not allowed.",
  },
  {
    name: "inner-html",
    regex: /\.innerHTML\s*=/g,
    message: "Avoid writing to innerHTML directly; use safe rendering paths.",
    allowlist: [
      /^src\/web-components\/index\.ts$/,
    ],
  },
  {
    name: "dangerously-set-inner-html",
    regex: /\bdangerouslySetInnerHTML\b/g,
    message: "Avoid dangerouslySetInnerHTML in runtime components.",
    allowlist: [
      /^src\/react\/components\/announcement-modal\.tsx$/,
      /^src\/react\/components\/banner\.tsx$/,
      /^src\/react\/components\/changelog-page\.tsx$/,
      /^src\/react\/components\/changelog-widget\.tsx$/,
      /^src\/react\/components\/spotlight\.tsx$/,
      /^src\/react\/components\/toast\.tsx$/,
    ],
  },
];

async function walk(dir, files) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      await walk(fullPath, files);
      continue;
    }
    if (!entry.isFile()) continue;
    if (!/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(entry.name)) continue;
    files.push(fullPath);
  }
}

function getLineNumber(source, index) {
  let line = 1;
  for (let i = 0; i < index; i += 1) {
    if (source.charCodeAt(i) === 10) line += 1;
  }
  return line;
}

async function main() {
  /** @type {string[]} */
  const files = [];
  for (const relativeDir of TARGET_DIRS) {
    const absoluteDir = path.join(ROOT, relativeDir);
    await walk(absoluteDir, files);
  }

  /** @type {Array<{ file: string; line: number; rule: string; message: string }>} */
  const findings = [];
  for (const file of files) {
    const source = await fs.readFile(file, "utf8");
    for (const rule of RULES) {
      rule.regex.lastIndex = 0;
      let match = rule.regex.exec(source);
      while (match) {
        const relativeFile = path.relative(ROOT, file);
        const isAllowlisted = (rule.allowlist ?? []).some((pattern) =>
          pattern.test(relativeFile),
        );
        if (isAllowlisted) {
          match = rule.regex.exec(source);
          continue;
        }
        findings.push({
          file: relativeFile,
          line: getLineNumber(source, match.index),
          rule: rule.name,
          message: rule.message,
        });
        match = rule.regex.exec(source);
      }
    }
  }

  if (findings.length > 0) {
    console.error("[security-check] Found unsafe patterns:");
    for (const finding of findings) {
      console.error(
        `- ${finding.file}:${finding.line} [${finding.rule}] ${finding.message}`,
      );
    }
    process.exitCode = 1;
    return;
  }

  console.log(`[security-check] PASS (${files.length} files scanned)`);
}

main().catch((error) => {
  console.error("[security-check] Failed:", error);
  process.exitCode = 1;
});
