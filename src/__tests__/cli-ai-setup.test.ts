import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, mkdir, writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { existsSync } from "node:fs";
import { runAiSetup } from "../cli-ai-setup";

describe("runAiSetup", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "ai-setup-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("creates .cursorrules when no editor detected", async () => {
    const result = await runAiSetup(tempDir);

    expect(result.detected).toContain("(none detected — creating .cursorrules as default)");
    expect(result.created).toContain(join(tempDir, ".cursorrules"));
    expect(existsSync(join(tempDir, ".cursorrules"))).toBe(true);

    const content = await readFile(join(tempDir, ".cursorrules"), "utf8");
    expect(content).toContain("FeatureDrop");
    expect(content).toContain("featuredrop/react/hooks");
  });

  it("detects Claude Code and creates skill + settings", async () => {
    await mkdir(join(tempDir, ".claude"), { recursive: true });

    const result = await runAiSetup(tempDir);

    expect(result.detected).toContain("Claude Code");
    expect(result.created).toContain(join(tempDir, ".claude", "skills", "featuredrop.md"));
    expect(result.created).toContain(join(tempDir, ".claude", "settings.json"));

    const skill = await readFile(join(tempDir, ".claude", "skills", "featuredrop.md"), "utf8");
    expect(skill).toContain("FeatureDrop");
    expect(skill).toContain("useSmartFeature");

    const settings = JSON.parse(await readFile(join(tempDir, ".claude", "settings.json"), "utf8"));
    expect(settings.mcpServers.featuredrop.command).toBe("npx");
  });

  it("detects Claude Code via CLAUDE.md", async () => {
    await writeFile(join(tempDir, "CLAUDE.md"), "# Project", "utf8");

    const result = await runAiSetup(tempDir);

    expect(result.detected).toContain("Claude Code");
    expect(existsSync(join(tempDir, ".claude", "skills", "featuredrop.md"))).toBe(true);
  });

  it("merges MCP into existing Claude settings", async () => {
    await mkdir(join(tempDir, ".claude"), { recursive: true });
    await writeFile(
      join(tempDir, ".claude", "settings.json"),
      JSON.stringify({ existingKey: true }, null, 2),
      "utf8"
    );

    const result = await runAiSetup(tempDir);

    const created = result.created.find((p) => p.includes("settings.json"));
    expect(created).toContain("(merged)");

    const settings = JSON.parse(await readFile(join(tempDir, ".claude", "settings.json"), "utf8"));
    expect(settings.existingKey).toBe(true);
    expect(settings.mcpServers.featuredrop.command).toBe("npx");
  });

  it("skips existing Claude skill file", async () => {
    await mkdir(join(tempDir, ".claude", "skills"), { recursive: true });
    await writeFile(join(tempDir, ".claude", "skills", "featuredrop.md"), "existing", "utf8");

    const result = await runAiSetup(tempDir);

    expect(result.skipped).toContain(join(tempDir, ".claude", "skills", "featuredrop.md"));
    const content = await readFile(join(tempDir, ".claude", "skills", "featuredrop.md"), "utf8");
    expect(content).toBe("existing"); // not overwritten
  });

  it("detects Cursor and creates .cursorrules + mcp.json", async () => {
    await mkdir(join(tempDir, ".cursor"), { recursive: true });

    const result = await runAiSetup(tempDir);

    expect(result.detected).toContain("Cursor");
    expect(result.created).toContain(join(tempDir, ".cursorrules"));
    expect(result.created).toContain(join(tempDir, ".cursor", "mcp.json"));

    const mcp = JSON.parse(await readFile(join(tempDir, ".cursor", "mcp.json"), "utf8"));
    expect(mcp.servers.featuredrop.command).toBe("npx");
  });

  it("appends to existing .cursorrules without FeatureDrop", async () => {
    await mkdir(join(tempDir, ".cursor"), { recursive: true });
    await writeFile(join(tempDir, ".cursorrules"), "# My rules\n", "utf8");

    const result = await runAiSetup(tempDir);

    const created = result.created.find((p) => p.includes(".cursorrules"));
    expect(created).toContain("(appended)");

    const content = await readFile(join(tempDir, ".cursorrules"), "utf8");
    expect(content).toContain("# My rules");
    expect(content).toContain("FeatureDrop");
  });

  it("skips .cursorrules that already mention FeatureDrop", async () => {
    await writeFile(join(tempDir, ".cursorrules"), "Use FeatureDrop for changelogs", "utf8");

    const result = await runAiSetup(tempDir);

    expect(result.skipped).toContain(join(tempDir, ".cursorrules"));
  });

  it("detects VS Code and creates mcp.json", async () => {
    await mkdir(join(tempDir, ".vscode"), { recursive: true });

    const result = await runAiSetup(tempDir);

    expect(result.detected).toContain("VS Code");
    expect(result.created).toContain(join(tempDir, ".vscode", "mcp.json"));

    const mcp = JSON.parse(await readFile(join(tempDir, ".vscode", "mcp.json"), "utf8"));
    expect(mcp.servers.featuredrop.command).toBe("npx");
  });

  it("skips existing VS Code mcp.json", async () => {
    await mkdir(join(tempDir, ".vscode"), { recursive: true });
    await writeFile(join(tempDir, ".vscode", "mcp.json"), "{}", "utf8");

    const result = await runAiSetup(tempDir);

    expect(result.skipped).toContain(join(tempDir, ".vscode", "mcp.json"));
  });

  it("detects multiple editors simultaneously", async () => {
    await mkdir(join(tempDir, ".claude"), { recursive: true });
    await mkdir(join(tempDir, ".cursor"), { recursive: true });
    await mkdir(join(tempDir, ".vscode"), { recursive: true });

    const result = await runAiSetup(tempDir);

    expect(result.detected).toContain("Claude Code");
    expect(result.detected).toContain("Cursor");
    expect(result.detected).toContain("VS Code");
    expect(result.created.length).toBeGreaterThanOrEqual(4); // skill + settings + cursorrules + 2x mcp.json
  });
});
