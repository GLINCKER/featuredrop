import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  addFeatureEntry,
  createFeatureEntry,
  initFeaturedropProject,
  migrateFromAnnounceKitPayload,
  migrateFromBeamerPayload,
  migrateFromCannyPayload,
  migrateFromHeadwayPayload,
  migrateFromLaunchNotesPayload,
  migrateManifest,
  renderFeatureMarkdown,
  slugifyFeatureId,
} from "../cli-scaffold";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.map(async (dir) => rm(dir, { recursive: true, force: true })));
  tempDirs.splice(0, tempDirs.length);
});

describe("cli-scaffold", () => {
  it("slugifies feature ids", () => {
    expect(slugifyFeatureId("AI Journal v2")).toBe("ai-journal-v2");
    expect(slugifyFeatureId("   ")).toBe("feature");
  });

  it("initializes markdown project structure", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "fd-init-md-"));
    tempDirs.push(cwd);

    const result = await initFeaturedropProject({
      cwd,
      format: "markdown",
      now: new Date("2026-02-26T00:00:00Z"),
    });

    expect(result.format).toBe("markdown");
    expect(result.created.some((path) => path.startsWith("features/"))).toBe(true);
    const files = await readFile(join(cwd, "features", "2026-02-26-welcome-featuredrop.md"), "utf8");
    expect(files).toContain("Welcome to featuredrop");
  });

  it("adds a markdown feature entry", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "fd-add-md-"));
    tempDirs.push(cwd);
    await mkdir(join(cwd, "features"), { recursive: true });

    const added = await addFeatureEntry({
      cwd,
      format: "markdown",
      label: "Billing Improvements",
      description: "Improved invoice details",
      releasedAt: "2026-02-26T00:00:00Z",
    });

    expect(added.path).toContain("features/2026-02-26-billing-improvements.md");
    const markdown = await readFile(join(cwd, added.path), "utf8");
    expect(markdown).toContain("Improved invoice details");
  });

  it("adds a json feature entry to features.json", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "fd-add-json-"));
    tempDirs.push(cwd);
    await writeFile(join(cwd, "features.json"), "[]\n", "utf8");

    const added = await addFeatureEntry({
      cwd,
      format: "json",
      label: "Search speed upgrade",
      category: "search",
      releasedAt: "2026-02-20T00:00:00Z",
      showNewUntil: "2026-03-20T00:00:00Z",
    });

    expect(added.path).toBe("features.json");
    const manifest = JSON.parse(await readFile(join(cwd, "features.json"), "utf8")) as Array<{ id: string }>;
    expect(manifest).toHaveLength(1);
    expect(manifest[0]?.id).toBe("search-speed-upgrade");
  });

  it("renders markdown from feature entry", () => {
    const entry = createFeatureEntry({
      label: "New Dashboard",
      description: "Overview updates",
      releasedAt: "2026-02-20T00:00:00Z",
      showNewUntil: "2026-03-20T00:00:00Z",
    });
    const markdown = renderFeatureMarkdown(entry);
    expect(markdown).toContain("id: new-dashboard");
    expect(markdown).toContain("Overview updates");
  });

  it("migrates beamer-like payload", () => {
    const result = migrateFromBeamerPayload({
      posts: [
        {
          id: "abc_1",
          title: "AI Journal",
          description: "Track outcomes",
          published_at: "2026-02-01T00:00:00Z",
          category: "ai",
        },
      ],
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("abc-1");
    expect(result[0]?.label).toBe("AI Journal");
    expect(result[0]?.category).toBe("ai");
  });

  it("migrates headway-like payload", () => {
    const result = migrateFromHeadwayPayload({
      entries: [
        {
          id: "headway-1",
          title: "New dashboard",
          content: "Charts and metrics",
          published_at: "2026-02-03T00:00:00Z",
          category: "analytics",
        },
      ],
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("headway-1");
    expect(result[0]?.label).toBe("New dashboard");
  });

  it("migrates announcekit-like payload", () => {
    const result = migrateFromAnnounceKitPayload({
      announcements: [
        {
          post_id: "ann_12",
          subject: "Export v2",
          html: "<p>Faster exports</p>",
          published_at: "2026-02-04T00:00:00Z",
        },
      ],
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("ann-12");
    expect(result[0]?.description).toContain("Faster");
  });

  it("migrates canny-like payload", () => {
    const result = migrateFromCannyPayload({
      posts: [
        {
          id: "post_22",
          title: "Roadmap updates",
          details: "Now with dependencies",
          createdAt: "2026-02-05T00:00:00Z",
        },
      ],
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("post-22");
  });

  it("migrates launchnotes-like payload", () => {
    const result = migrateFromLaunchNotesPayload({
      items: [
        {
          note_id: "ln_1",
          headline: "Onboarding refresh",
          body: "Shortcuts and tours",
          publishedAt: "2026-02-06T00:00:00Z",
        },
      ],
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("ln-1");
  });

  it("writes migrated entries to output file", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "fd-migrate-"));
    tempDirs.push(cwd);
    await writeFile(
      join(cwd, "beamer-export.json"),
      JSON.stringify({
        posts: [{ title: "Launch Week", published_at: "2026-01-01T00:00:00Z" }],
      }),
      "utf8",
    );

    const result = await migrateManifest({
      cwd,
      from: "beamer",
      inputFile: "beamer-export.json",
      outFile: "featuredrop.manifest.json",
    });
    expect(result.entries).toHaveLength(1);
    const manifest = await readFile(join(cwd, "featuredrop.manifest.json"), "utf8");
    expect(manifest).toContain("Launch Week");
  });

  it("writes migrated entries for non-beamer source", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "fd-migrate-headway-"));
    tempDirs.push(cwd);
    await writeFile(
      join(cwd, "headway-export.json"),
      JSON.stringify({
        entries: [{ title: "From headway", published_at: "2026-01-03T00:00:00Z" }],
      }),
      "utf8",
    );

    const result = await migrateManifest({
      cwd,
      from: "headway",
      inputFile: "headway-export.json",
      outFile: "featuredrop.manifest.json",
    });
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]?.label).toBe("From headway");
  });
});
