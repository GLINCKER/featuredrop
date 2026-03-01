#!/usr/bin/env node

/**
 * build-registry.mjs
 *
 * Generic shadcn registry builder. Reads a registry.json manifest,
 * inlines source files as content strings, and writes individual
 * JSON files + an aggregate index to the configured output directory.
 *
 * Usage:
 *   node scripts/build-registry.mjs [registry-dir]
 *
 * Defaults to ./registry if no argument is given.
 * Each registry dir must contain a registry.json with:
 *   { name, homepage, outputDir, items: [...] }
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

function buildRegistry(registryDir) {
  const manifestPath = resolve(registryDir, "registry.json");

  if (!existsSync(manifestPath)) {
    console.error(`Error: registry.json not found in ${registryDir}`);
    process.exit(1);
  }

  const registry = JSON.parse(readFileSync(manifestPath, "utf-8"));
  const items = registry.items;

  if (!Array.isArray(items) || items.length === 0) {
    console.error(`Error: registry.json has no items in ${registryDir}`);
    process.exit(1);
  }

  // outputDir is relative to project root, defaults to apps/docs/public/r
  const outputDir = resolve(ROOT, registry.outputDir || "apps/docs/public/r");
  mkdirSync(outputDir, { recursive: true });

  console.log(`Building registry: ${registry.name}`);

  const outputItems = [];

  for (const item of items) {
    const resolvedFiles = item.files.map((file) => {
      // Resolve source path relative to project root
      const sourcePath = resolve(ROOT, file.path);
      if (!existsSync(sourcePath)) {
        console.error(`Error: source file not found: ${file.path}`);
        process.exit(1);
      }
      const content = readFileSync(sourcePath, "utf-8");
      return {
        path: file.target,
        type: file.type,
        content,
      };
    });

    const outputItem = {
      name: item.name,
      type: item.type,
      title: item.title,
      description: item.description,
      dependencies: item.dependencies,
      registryDependencies: item.registryDependencies,
      files: resolvedFiles,
    };

    const outputPath = resolve(outputDir, `${item.name}.json`);
    writeFileSync(outputPath, JSON.stringify(outputItem, null, 2));
    console.log(`  ${item.name}.json`);

    outputItems.push({
      name: item.name,
      type: item.type,
      title: item.title,
      description: item.description,
    });
  }

  // Write aggregate index
  const indexOutput = {
    name: registry.name,
    homepage: registry.homepage,
    items: outputItems,
  };
  writeFileSync(
    resolve(outputDir, "index.json"),
    JSON.stringify(indexOutput, null, 2)
  );
  console.log(`  index.json`);
  console.log(
    `\n${registry.name}: ${outputItems.length} components → ${registry.outputDir || "apps/docs/public/r/"}`
  );
}

// Support passing registry dir as CLI arg, default to ./registry
const registryDir = resolve(ROOT, process.argv[2] || "registry");
buildRegistry(registryDir);
