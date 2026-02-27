import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildManifestFromPattern, parseFeatureFile, validateFeatureFiles } from "../changelog-as-code";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirs.map(async (dir) => {
      await rm(dir, { recursive: true, force: true });
    }),
  );
  tempDirs.splice(0, tempDirs.length);
});

describe("parseFeatureFile", () => {
  it("parses frontmatter and markdown body", () => {
    const markdown = `---
id: ai-journal
label: AI Journal
type: feature
category: ai
priority: critical
releasedAt: 2026-02-15T00:00:00Z
showNewUntil: 2026-03-15T00:00:00Z
cta:
  label: Try it now
  url: /journal
audience:
  plan: [pro, enterprise]
---
## Hello
This is **markdown**.
`;
    const entry = parseFeatureFile(markdown, "features/one.md");
    expect(entry.id).toBe("ai-journal");
    expect(entry.cta?.label).toBe("Try it now");
    expect(entry.audience?.plan).toEqual(["pro", "enterprise"]);
    expect(entry.description).toContain("Hello");
  });

  it("throws on missing required fields", () => {
    expect(() =>
      parseFeatureFile("---\nlabel: Missing Id\nreleasedAt: 2026-01-01\nshowNewUntil: 2026-02-01\n---\nBody"),
    ).toThrow(/id/);
  });
});

describe("buildManifestFromPattern", () => {
  it("builds manifest and writes output json", async () => {
    const root = await mkdtemp(join(tmpdir(), "fd-build-"));
    tempDirs.push(root);
    const featuresDir = join(root, "features");
    await mkdir(featuresDir, { recursive: true });
    await writeFile(
      join(featuresDir, "2026-02-ai.md"),
      `---
id: ai-journal
label: AI Journal
releasedAt: 2026-02-15T00:00:00Z
showNewUntil: 2026-03-15T00:00:00Z
---
Body`,
      "utf8",
    );

    const entries = await buildManifestFromPattern({
      cwd: root,
      pattern: "features/**/*.md",
      outFile: "featuredrop.manifest.json",
    });

    expect(entries).toHaveLength(1);
    const output = await readFile(join(root, "featuredrop.manifest.json"), "utf8");
    expect(output).toContain("ai-journal");
  });

  it("throws on duplicate ids", async () => {
    const root = await mkdtemp(join(tmpdir(), "fd-build-"));
    tempDirs.push(root);
    const featuresDir = join(root, "features");
    await mkdir(featuresDir, { recursive: true });

    const file = `---
id: dup
label: Duplicate
releasedAt: 2026-02-15T00:00:00Z
showNewUntil: 2026-03-15T00:00:00Z
---
Body`;
    await writeFile(join(featuresDir, "a.md"), file, "utf8");
    await writeFile(join(featuresDir, "b.md"), file, "utf8");

    await expect(
      validateFeatureFiles({
        cwd: root,
        pattern: "features/**/*.md",
      }),
    ).rejects.toThrow(/Duplicate feature id/);
  });
});
