import { existsSync } from "node:fs";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";

/** The claude skill markdown content */
const CLAUDE_SKILL = `# FeatureDrop — Setup & Configuration Skill

## What it is
Open-source product adoption toolkit. Changelogs, badges, tours, checklists, feedback.
Zero dependencies. < 3 kB core. MIT licensed.

## Quick Setup
1. \`npm install featuredrop\`
2. Create features.json manifest
3. Wrap root in \`<FeatureDropProvider manifest={features} storage={new LocalStorageAdapter()}>\`
4. Drop components or use hooks

## Imports (ALWAYS use subpath imports)
\`\`\`
featuredrop                — core functions (isNew, getNewFeatures, createManifest)
featuredrop/react          — components + hooks (NewBadge, ChangelogWidget, Tour, Checklist)
featuredrop/react/hooks    — headless hooks only (useChangelog, useTour, useChecklist, useNewFeature)
featuredrop/adapters       — storage (PostgresAdapter, RedisAdapter, IndexedDBAdapter, etc.)
featuredrop/engine         — AdoptionEngine (smart timing, format selection, adoption scoring)
featuredrop/schema         — Zod validation (featureEntrySchema, validateManifest)
featuredrop/testing        — test helpers (createMockManifest, createMockStorage, createTestProvider)
featuredrop/tailwind       — Tailwind plugin (featureDropPlugin)
\`\`\`

## Hooks Reference (prefer these for custom UI)
\`\`\`
useNewFeature(sidebarKey)  → { isNew, feature, dismiss }
useNewCount()              → number
useChangelog()             → { features, newFeatures, newCount, dismiss, dismissAll, markAllSeen, getByCategory }
useTour(id)                → { currentStep, stepIndex, totalSteps, isActive, start, next, prev, skip, complete }
useChecklist(id)           → { tasks, progress, isComplete, completeTask, resetChecklist }
useSurvey(id)              → { isOpen, show, hide, askLater, submitted, canShow }
useSmartFeature(id)        → { show, format, feature, dismiss, confidence, reason }
useAdoptionScore()         → { score, grade, breakdown, recommendations }
useFeatureDrop()           → full provider context (low-level)
\`\`\`

## Components (ready-made UI with headless render prop mode)
NewBadge, ChangelogWidget, ChangelogPage, Tour, Checklist, Spotlight, SpotlightChain,
Hotspot, TooltipGroup, Banner, Toast, AnnouncementModal, Survey, FeedbackWidget,
FeatureRequestButton, FeatureRequestForm, SmartAnnouncement

## Manifest Format
\`\`\`json
{
  "id": "dark-mode",
  "label": "Dark Mode",
  "description": "Toggle between light and dark themes.",
  "releasedAt": "2026-02-20",
  "showNewUntil": "2026-04-20",
  "category": "ui",
  "priority": "normal",
  "type": "feature"
}
\`\`\`

## Storage Adapters
- LocalStorageAdapter (browser default, zero-config)
- MemoryAdapter (testing, SSR)
- IndexedDBAdapter (offline-first PWAs)
- PostgresAdapter, RedisAdapter, MySQLAdapter, MongoAdapter, SQLiteAdapter (server)
- SupabaseAdapter (Supabase with optional realtime)
- RemoteAdapter (HTTP API with retry + circuit breaker)
- HybridAdapter (local + remote with batched sync)

## Rules
- Always use subpath imports (never bare 'featuredrop' for React code)
- Prefer hooks over components when user has a custom design system
- Features auto-expire via showNewUntil — don't build manual expiry logic
- Zero production dependencies must be maintained
- TypeScript strict — no any types
`;

/** The .cursorrules content */
const CURSORRULES = `When working with FeatureDrop:
- FeatureDrop is a product adoption library (changelogs, badges, tours, checklists, feedback)
- ALWAYS import from subpaths: 'featuredrop/react', 'featuredrop/react/hooks', 'featuredrop/adapters'
- For custom UI: use hooks from 'featuredrop/react/hooks' (useChangelog, useTour, useChecklist, useSmartFeature)
- For ready-made UI: use components from 'featuredrop/react' (NewBadge, ChangelogWidget, Tour, SmartAnnouncement)
- Features are defined in JSON: { id, label, description, releasedAt, showNewUntil? }
- Wrap app in <FeatureDropProvider manifest={features} storage={new LocalStorageAdapter()}>
- Storage default: LocalStorageAdapter. Server: PostgresAdapter, RedisAdapter from 'featuredrop/adapters'
- Engine: import { createAdoptionEngine } from 'featuredrop/engine' for smart timing + format selection
- Core < 3 kB, React ~12 kB, zero production deps, fully tree-shakable
- All components support headless mode via render props
- For shadcn projects: use hooks from 'featuredrop/react/hooks' + shadcn primitives
- TypeScript strict mode, no 'any' types
- Zero production dependencies — do not add external deps
`;

/** MCP server config for VS Code / Cursor / Claude Code */
const MCP_CONFIG = {
  featuredrop: {
    command: "npx",
    args: ["@featuredrop/mcp"],
  },
};

interface SetupResult {
  detected: string[];
  created: string[];
  skipped: string[];
}

export async function runAiSetup(cwd?: string): Promise<SetupResult> {
  const root = cwd ?? process.cwd();
  const result: SetupResult = { detected: [], created: [], skipped: [] };

  // 1. Detect Claude Code (.claude/ directory or settings)
  const claudeDir = join(root, ".claude");
  const claudeSkillsDir = join(claudeDir, "skills");
  const claudeSkillPath = join(claudeSkillsDir, "featuredrop.md");

  if (existsSync(claudeDir) || existsSync(join(root, "CLAUDE.md"))) {
    result.detected.push("Claude Code");

    if (existsSync(claudeSkillPath)) {
      result.skipped.push(claudeSkillPath);
    } else {
      await mkdir(claudeSkillsDir, { recursive: true });
      await writeFile(claudeSkillPath, CLAUDE_SKILL, "utf8");
      result.created.push(claudeSkillPath);
    }

    // Also create MCP config for Claude Code
    const claudeSettingsDir = claudeDir;
    const claudeMcpPath = join(claudeSettingsDir, "settings.json");
    if (!existsSync(claudeMcpPath)) {
      const settings = { mcpServers: MCP_CONFIG };
      await writeFile(claudeMcpPath, JSON.stringify(settings, null, 2) + "\n", "utf8");
      result.created.push(claudeMcpPath);
    } else {
      // Try to merge MCP config into existing settings
      try {
        const existing = JSON.parse(await readFile(claudeMcpPath, "utf8")) as Record<string, unknown>;
        const mcpServers = (existing.mcpServers ?? {}) as Record<string, unknown>;
        if (!mcpServers.featuredrop) {
          mcpServers.featuredrop = MCP_CONFIG.featuredrop;
          existing.mcpServers = mcpServers;
          await writeFile(claudeMcpPath, JSON.stringify(existing, null, 2) + "\n", "utf8");
          result.created.push(`${claudeMcpPath} (merged)`);
        } else {
          result.skipped.push(claudeMcpPath);
        }
      } catch {
        result.skipped.push(`${claudeMcpPath} (parse error)`);
      }
    }
  }

  // 2. Detect Cursor (.cursor/ directory or .cursorrules file)
  const cursorDir = join(root, ".cursor");
  const cursorRulesPath = join(root, ".cursorrules");
  const cursorMcpPath = join(cursorDir, "mcp.json");

  if (existsSync(cursorDir) || existsSync(cursorRulesPath)) {
    result.detected.push("Cursor");

    // Append to .cursorrules (or create)
    if (existsSync(cursorRulesPath)) {
      const content = await readFile(cursorRulesPath, "utf8");
      if (content.includes("FeatureDrop")) {
        result.skipped.push(cursorRulesPath);
      } else {
        await writeFile(cursorRulesPath, content + "\n\n" + CURSORRULES, "utf8");
        result.created.push(`${cursorRulesPath} (appended)`);
      }
    } else {
      await writeFile(cursorRulesPath, CURSORRULES, "utf8");
      result.created.push(cursorRulesPath);
    }

    // Create MCP config for Cursor
    if (existsSync(cursorDir)) {
      if (!existsSync(cursorMcpPath)) {
        const config = { servers: MCP_CONFIG };
        await mkdir(cursorDir, { recursive: true });
        await writeFile(cursorMcpPath, JSON.stringify(config, null, 2) + "\n", "utf8");
        result.created.push(cursorMcpPath);
      } else {
        result.skipped.push(cursorMcpPath);
      }
    }
  }

  // 3. Detect VS Code (.vscode/ directory)
  const vscodeDir = join(root, ".vscode");
  const vscodeMcpPath = join(vscodeDir, "mcp.json");

  if (existsSync(vscodeDir)) {
    result.detected.push("VS Code");

    if (!existsSync(vscodeMcpPath)) {
      const config = { servers: MCP_CONFIG };
      await writeFile(vscodeMcpPath, JSON.stringify(config, null, 2) + "\n", "utf8");
      result.created.push(vscodeMcpPath);
    } else {
      result.skipped.push(vscodeMcpPath);
    }
  }

  // 4. If nothing detected, create .cursorrules as default (most portable)
  if (result.detected.length === 0) {
    result.detected.push("(none detected — creating .cursorrules as default)");
    await writeFile(cursorRulesPath, CURSORRULES, "utf8");
    result.created.push(cursorRulesPath);
  }

  return result;
}
