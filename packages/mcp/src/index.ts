import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// ─── Docs content (static, bundled at build time) ──────────────────────────

const DOCS = {
  quickstart: `# FeatureDrop Quickstart

## 1. Install
\`\`\`bash
npm install featuredrop
\`\`\`

## 2. Define features
\`\`\`ts
import { createManifest } from 'featuredrop'

export const features = createManifest([
  {
    id: 'dark-mode',
    label: 'Dark Mode',
    description: 'Full dark theme support.',
    releasedAt: new Date().toISOString(),
    showNewUntil: new Date(Date.now() + 60 * 86400000).toISOString(),
    type: 'feature',
  },
])
\`\`\`

## 3. Wrap your app
\`\`\`tsx
import { FeatureDropProvider } from 'featuredrop/react'
import { LocalStorageAdapter } from 'featuredrop'
import { features } from './features'

<FeatureDropProvider manifest={features} storage={new LocalStorageAdapter()}>
  <App />
</FeatureDropProvider>
\`\`\`

## 4. Add components
\`\`\`tsx
import { NewBadge, ChangelogWidget } from 'featuredrop/react'

<a href="/settings">Settings <NewBadge id="dark-mode" /></a>
<ChangelogWidget title="What's New" />
\`\`\`
`,

  hooks: `# FeatureDrop Hooks Reference

All hooks import from \`featuredrop/react/hooks\`. They return data + actions, never JSX.

## useFeatureDrop()
Returns full context: features, count, dismiss, dismissAll, isNew.
\`\`\`ts
const { newFeatures, newCount, dismiss, dismissAll, isNew } = useFeatureDrop()
\`\`\`

## useNewFeature(id)
Single feature status.
\`\`\`ts
const { isNew, feature, dismiss } = useNewFeature('dark-mode')
\`\`\`

## useNewCount()
Current unread badge count.
\`\`\`ts
const count = useNewCount() // number
\`\`\`

## useChangelog()
Full changelog data + actions.
\`\`\`ts
const { features, newFeatures, newCount, dismiss, dismissAll, markAllSeen, getByCategory } = useChangelog()
\`\`\`

## useTour(id)
Tour controls and step snapshot.
\`\`\`ts
const { currentStep, stepIndex, totalSteps, isActive, isComplete, start, next, prev, skip, complete, goTo } = useTour('onboarding')
\`\`\`

## useChecklist(id)
Checklist progress + task controls.
\`\`\`ts
const { tasks, completedCount, totalCount, progress, isComplete, completeTask, resetTask } = useChecklist('setup')
\`\`\`

## useSurvey(id)
Survey controls.
\`\`\`ts
const { isVisible, questions, submit, askLater, dismiss } = useSurvey('nps')
\`\`\`

## useTabNotification()
Browser tab title badge.
\`\`\`ts
useTabNotification(count, { template: '({count}) My App' })
\`\`\`
`,

  components: `# FeatureDrop Components Reference

All components import from \`featuredrop/react\`. Each supports headless mode via render props.

## NewBadge
Auto-expiring badge. Variants: dot, pill, count.
\`\`\`tsx
<NewBadge id="dark-mode" variant="pill" />
\`\`\`

## ChangelogWidget
Trigger button + slide-out changelog panel.
\`\`\`tsx
<ChangelogWidget title="What's New" showReactions position="right" />
\`\`\`

## ChangelogPage
Full-page changelog with filters and pagination.
\`\`\`tsx
<ChangelogPage itemsPerPage={10} showSearch showFilters />
\`\`\`

## Tour
Multi-step product tour with keyboard nav.
\`\`\`tsx
<Tour id="onboarding" steps={tourSteps} />
\`\`\`

## Checklist
Onboarding task list with progress.
\`\`\`tsx
<Checklist id="setup" tasks={checklistTasks} />
\`\`\`

## Spotlight
Pulsing beacon attached to a DOM element.
\`\`\`tsx
<Spotlight target="#settings-btn" content="Try the new settings!" />
\`\`\`

## Banner
Top-of-page announcement.
\`\`\`tsx
<Banner variant="info" cta={{ label: 'Learn more', url: '/blog/v2' }} dismissible />
\`\`\`

## Toast
Stackable notifications.
\`\`\`tsx
<Toast features={newFeatures} position="bottom-right" autoDismiss duration={5000} />
\`\`\`

## Survey
NPS/CSAT/CES survey engine.
\`\`\`tsx
<Survey id="nps-q1" type="nps" />
\`\`\`

## FeedbackWidget
In-app feedback with categories.
\`\`\`tsx
<FeedbackWidget categories={['bug', 'feature', 'other']} />
\`\`\`
`,

  adapters: `# FeatureDrop Storage Adapters

## Browser (in core barrel)
\`\`\`ts
import { LocalStorageAdapter, MemoryAdapter } from 'featuredrop'

const storage = new LocalStorageAdapter()        // browser localStorage
const testStorage = new MemoryAdapter()           // in-memory (SSR-safe)
\`\`\`

## Advanced (subpath import)
\`\`\`ts
import { IndexedDBAdapter } from 'featuredrop/adapters'   // offline-first PWAs
import { RemoteAdapter } from 'featuredrop/adapters'      // server-backed with retry
import { HybridAdapter } from 'featuredrop/adapters'      // local + remote sync
\`\`\`

## Database (subpath import)
\`\`\`ts
import { PostgresAdapter } from 'featuredrop/adapters'
import { RedisAdapter } from 'featuredrop/adapters'
import { MySQLAdapter } from 'featuredrop/adapters'
import { MongoAdapter } from 'featuredrop/adapters'
import { SQLiteAdapter } from 'featuredrop/adapters'
import { SupabaseAdapter } from 'featuredrop/adapters'
\`\`\`

## StorageAdapter interface
\`\`\`ts
interface StorageAdapter {
  getWatermark(): string | null
  getDismissedIds(): string[]
  dismiss(id: string): void
  dismissAll(now: string): void
}
\`\`\`
`,

  shadcn: `# Using FeatureDrop with shadcn/ui

Use FeatureDrop hooks for logic + shadcn primitives for UI. Components land in your project — you own the code.

## Install components via CLI
\`\`\`bash
npx shadcn@latest add https://featuredrop.dev/r/new-badge.json
npx shadcn@latest add https://featuredrop.dev/r/changelog-widget.json
npx shadcn@latest add https://featuredrop.dev/r/tour.json
npx shadcn@latest add https://featuredrop.dev/r/checklist.json
npx shadcn@latest add https://featuredrop.dev/r/feedback-widget.json
\`\`\`

## Pattern: hooks + shadcn
\`\`\`tsx
import { useChangelog } from 'featuredrop/react/hooks'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'

function MyChangelog() {
  const { newFeatures, newCount, markAllSeen } = useChangelog()
  return (
    <Sheet onOpenChange={() => markAllSeen()}>
      <SheetTrigger>
        What's New {newCount > 0 && <Badge>{newCount}</Badge>}
      </SheetTrigger>
      <SheetContent>
        {newFeatures.map(f => <div key={f.id}>{f.label}: {f.description}</div>)}
      </SheetContent>
    </Sheet>
  )
}
\`\`\`

## When to use hooks vs components
- **shadcn/Radix/custom design system** → use hooks from \`featuredrop/react/hooks\`
- **Quick setup / no design system** → use components from \`featuredrop/react\`
`,

  manifest: `# FeatureDrop Manifest Schema

A manifest is an array of FeatureEntry objects.

## FeatureEntry
\`\`\`ts
interface FeatureEntry {
  id: string                          // unique identifier
  label: string                       // display title
  description?: string                // markdown description
  releasedAt: string                  // ISO 8601 date
  showNewUntil?: string               // ISO 8601 date (auto-expire)
  publishAt?: string                  // scheduled publishing
  sidebarKey?: string                 // for sidebar badge matching
  category?: string                   // grouping: 'ui', 'api', 'perf'
  url?: string                        // link to feature
  version?: string                    // semver
  type?: 'feature' | 'improvement' | 'fix' | 'breaking'
  priority?: 'critical' | 'normal' | 'low'
  image?: string                      // image URL
  cta?: { label: string; url: string }
  meta?: Record<string, unknown>      // custom data
  audience?: AudienceRule             // user segmentation
}
\`\`\`

## Example manifest
\`\`\`json
[
  {
    "id": "dark-mode",
    "label": "Dark Mode",
    "description": "Full dark theme support across every surface.",
    "releasedAt": "2026-03-01T00:00:00Z",
    "showNewUntil": "2026-04-01T00:00:00Z",
    "type": "feature",
    "priority": "normal",
    "category": "ui",
    "cta": { "label": "Try it", "url": "/settings/appearance" }
  },
  {
    "id": "api-keys-v2",
    "label": "API Keys v2",
    "description": "Scoped API keys with expiration and rate limits.",
    "releasedAt": "2026-03-05T00:00:00Z",
    "showNewUntil": "2026-05-05T00:00:00Z",
    "type": "feature",
    "priority": "critical",
    "category": "api"
  }
]
\`\`\`
`,
};

// ─── Framework setup templates ─────────────────────────────────────────────

const FRAMEWORK_TEMPLATES: Record<string, { install: string; provider: string; usage: string }> = {
  react: {
    install: "npm install featuredrop",
    provider: `import { FeatureDropProvider } from 'featuredrop/react'
import { LocalStorageAdapter } from 'featuredrop'
import { features } from './features'

export default function App({ children }) {
  return (
    <FeatureDropProvider manifest={features} storage={new LocalStorageAdapter()}>
      {children}
    </FeatureDropProvider>
  )
}`,
    usage: `import { NewBadge, ChangelogWidget } from 'featuredrop/react'

// Badge on nav item
<a href="/settings">Settings <NewBadge id="dark-mode" /></a>

// Changelog button
<ChangelogWidget title="What's New" />`,
  },
  next: {
    install: "npm install featuredrop",
    provider: `// app/providers.tsx
'use client'
import { FeatureDropProvider } from 'featuredrop/react'
import { LocalStorageAdapter } from 'featuredrop'
import { features } from '@/lib/features'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <FeatureDropProvider manifest={features} storage={new LocalStorageAdapter()}>
      {children}
    </FeatureDropProvider>
  )
}

// app/layout.tsx
import { Providers } from './providers'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html><body><Providers>{children}</Providers></body></html>
  )
}`,
    usage: `'use client'
import { NewBadge, ChangelogWidget } from 'featuredrop/react'

// Badge on nav item
<a href="/settings">Settings <NewBadge id="dark-mode" /></a>

// Changelog button
<ChangelogWidget title="What's New" />`,
  },
  vue: {
    install: "npm install featuredrop",
    provider: `// main.ts
import { createApp } from 'vue'
import { createFeatureDrop } from 'featuredrop/vue'
import { features } from './features'

const app = createApp(App)
app.use(createFeatureDrop({ manifest: features }))
app.mount('#app')`,
    usage: `<script setup>
import { useFeatureDrop } from 'featuredrop/vue'
const { newCount, newFeatures, dismiss } = useFeatureDrop()
</script>

<template>
  <span v-if="newCount > 0">{{ newCount }} new</span>
</template>`,
  },
  svelte: {
    install: "npm install featuredrop",
    provider: `<!-- App.svelte -->
<script>
  import { setFeatureDropContext } from 'featuredrop/svelte'
  import { features } from './features'

  setFeatureDropContext({ manifest: features })
</script>`,
    usage: `<script>
  import { getFeatureDrop } from 'featuredrop/svelte'
  const { newCount, newFeatures, dismiss } = getFeatureDrop()
</script>

{#if $newCount > 0}
  <span>{$newCount} new</span>
{/if}`,
  },
  solid: {
    install: "npm install featuredrop",
    provider: `import { FeatureDropProvider } from 'featuredrop/solid'
import { features } from './features'

function App() {
  return (
    <FeatureDropProvider manifest={features}>
      <MyApp />
    </FeatureDropProvider>
  )
}`,
    usage: `import { useFeatureDrop } from 'featuredrop/solid'

function Nav() {
  const { newCount } = useFeatureDrop()
  return <span>{newCount()} new features</span>
}`,
  },
  astro: {
    install: "npm install featuredrop",
    provider: `---
// src/pages/index.astro
import { getNewFeatures } from 'featuredrop'
import features from '../data/features.json'

const newFeatures = getNewFeatures(features)
---

<ul>
  {newFeatures.map(f => <li>{f.label}: {f.description}</li>)}
</ul>`,
    usage: `---
// For interactive components, use React islands:
---
<ChangelogWidget client:idle manifest={features} />`,
  },
};

// ─── Migration templates ───────────────────────────────────────────────────

const MIGRATION_GUIDES: Record<string, string> = {
  beamer: `# Migrate from Beamer to FeatureDrop

## 1. Export your Beamer posts
Go to Beamer dashboard → Settings → Export → Download CSV/JSON.

## 2. Convert to FeatureDrop manifest
\`\`\`bash
npx featuredrop migrate --from beamer --input beamer-export.json --out features.json
\`\`\`

## 3. Map Beamer concepts
| Beamer | FeatureDrop |
|--------|-------------|
| Post | FeatureEntry |
| Category | category field |
| Segment | audience rule |
| Boosted post | priority: 'critical' |
| Reactions | analytics.onFeatureClicked |

## 4. Replace the Beamer script
Remove: \`<script src="https://app.getbeamer.com/js/beamer-embed.js">\`
Add: \`<FeatureDropProvider manifest={features}>\`
`,
  headway: `# Migrate from Headway to FeatureDrop

## 1. Export your Headway changelog
Headway dashboard → Settings → Export.

## 2. Convert
\`\`\`bash
npx featuredrop migrate --from headway --input headway-export.json --out features.json
\`\`\`

## 3. Replace the widget
Remove: Headway script tag and widget code
Add: \`<ChangelogWidget title="What's New" />\`
`,
  announcekit: `# Migrate from AnnounceKit to FeatureDrop

## 1. Export from AnnounceKit dashboard
## 2. Convert
\`\`\`bash
npx featuredrop migrate --from announcekit --input announcekit-export.json --out features.json
\`\`\`
## 3. Replace widget embed with FeatureDrop components
`,
  canny: `# Migrate from Canny to FeatureDrop

## 1. Export from Canny dashboard
## 2. Convert changelog entries
\`\`\`bash
npx featuredrop migrate --from canny --input canny-export.json --out features.json
\`\`\`
## 3. Replace Canny changelog widget with FeatureDrop
## 4. For feature voting, use <FeatureRequestButton /> and <FeatureRequestForm />
`,
  launchnotes: `# Migrate from LaunchNotes to FeatureDrop

## 1. Export from LaunchNotes
## 2. Convert
\`\`\`bash
npx featuredrop migrate --from launchnotes --input launchnotes-export.json --out features.json
\`\`\`
## 3. Replace LaunchNotes embed with FeatureDrop components
`,
};

// ─── Server ────────────────────────────────────────────────────────────────

const server = new McpServer(
  {
    name: "FeatureDrop",
    version: "1.0.0",
  },
  {
    instructions: `FeatureDrop is an open-source product adoption toolkit for React and other frameworks. It provides changelogs, feature badges, onboarding tours, checklists, feedback widgets, and surveys — all from a JSON manifest, with zero vendor lock-in.

When users want to add product adoption features to their app, use these tools to set it up. Key rules:
- ALWAYS use subpath imports: 'featuredrop/react', 'featuredrop/react/hooks', not just 'featuredrop'
- For custom design systems (shadcn, Radix), prefer hooks from 'featuredrop/react/hooks'
- For quick setup, use ready-made components from 'featuredrop/react'
- Features are defined in a JSON manifest with id, label, description, releasedAt, showNewUntil
- Wrap the app root in <FeatureDropProvider manifest={} storage={}>
- Core is < 3 kB gzip, zero production dependencies`,
  }
);

// ─── Tools ─────────────────────────────────────────────────────────────────

server.tool(
  "featuredrop_init",
  "Initialize FeatureDrop in the current project. Returns install command, provider setup code, and a sample feature manifest.",
  {
    framework: z
      .enum(["react", "next", "vue", "svelte", "solid", "astro"])
      .describe("Target framework"),
    storage: z
      .enum(["localStorage", "memory", "indexeddb", "remote"])
      .default("localStorage")
      .describe("Storage adapter to use"),
  },
  async ({ framework, storage }) => {
    const template = FRAMEWORK_TEMPLATES[framework];
    if (!template) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Unknown framework: ${framework}. Supported: react, next, vue, svelte, solid, astro`,
          },
        ],
      };
    }

    const storageNote =
      storage === "localStorage"
        ? "Using LocalStorageAdapter (default, browser-only)."
        : storage === "memory"
          ? "Using MemoryAdapter (SSR-safe, no persistence)."
          : storage === "indexeddb"
            ? 'Using IndexedDBAdapter (import from "featuredrop/adapters").'
            : 'Using RemoteAdapter (import from "featuredrop/adapters", requires server endpoint).';

    const sampleManifest = `import { createManifest } from 'featuredrop'

export const features = createManifest([
  {
    id: 'welcome',
    label: 'Welcome to the App',
    description: 'Take a quick tour of the key features.',
    releasedAt: new Date().toISOString(),
    showNewUntil: new Date(Date.now() + 30 * 86400000).toISOString(),
    type: 'feature',
    priority: 'normal',
    category: 'onboarding',
  },
])`;

    return {
      content: [
        {
          type: "text" as const,
          text: `# FeatureDrop Setup (${framework})

## Step 1: Install
\`\`\`bash
${template.install}
\`\`\`

## Step 2: Create feature manifest
\`\`\`ts
// features.ts
${sampleManifest}
\`\`\`

## Step 3: Set up provider
${storageNote}

\`\`\`tsx
${template.provider}
\`\`\`

## Step 4: Use components or hooks
\`\`\`tsx
${template.usage}
\`\`\`

## Next steps
- Add more features to your manifest
- Try \`<Tour>\` for onboarding flows
- Try \`<Checklist>\` for setup wizards
- See docs: https://featuredrop.dev/docs/quickstart`,
        },
      ],
    };
  }
);

server.tool(
  "featuredrop_add_feature",
  "Generate a new FeatureEntry to add to the FeatureDrop manifest.",
  {
    id: z.string().describe("Unique feature identifier (kebab-case)"),
    label: z.string().describe("Human-readable feature title"),
    description: z
      .string()
      .optional()
      .describe("Markdown description of the feature"),
    category: z
      .string()
      .optional()
      .describe("Feature category (e.g., ui, api, performance)"),
    type: z
      .enum(["feature", "improvement", "fix", "breaking"])
      .default("feature")
      .describe("Type of change"),
    priority: z
      .enum(["critical", "normal", "low"])
      .default("normal")
      .describe("Display priority"),
    showNewForDays: z
      .number()
      .default(60)
      .describe("Days the feature stays marked as new"),
    ctaLabel: z.string().optional().describe("Call-to-action button text"),
    ctaUrl: z.string().optional().describe("Call-to-action URL"),
  },
  async ({
    id,
    label,
    description,
    category,
    type,
    priority,
    showNewForDays,
    ctaLabel,
    ctaUrl,
  }) => {
    const now = new Date();
    const expiry = new Date(now.getTime() + showNewForDays * 86400000);

    const entry: Record<string, unknown> = {
      id,
      label,
      releasedAt: now.toISOString(),
      showNewUntil: expiry.toISOString(),
      type,
      priority,
    };

    if (description) entry.description = description;
    if (category) entry.category = category;
    if (ctaLabel && ctaUrl) entry.cta = { label: ctaLabel, url: ctaUrl };

    return {
      content: [
        {
          type: "text" as const,
          text: `Add this entry to your features manifest array:

\`\`\`json
${JSON.stringify(entry, null, 2)}
\`\`\`

Import pattern:
\`\`\`ts
import { createManifest } from 'featuredrop'

export const features = createManifest([
  // ... existing features
  ${JSON.stringify(entry, null, 2).split("\n").join("\n  ")},
])
\`\`\``,
        },
      ],
    };
  }
);

server.tool(
  "featuredrop_validate",
  "Validate a FeatureDrop manifest for common errors (duplicate IDs, invalid dates, missing required fields).",
  {
    manifest: z
      .string()
      .describe("The manifest JSON string to validate"),
  },
  async ({ manifest }) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    let parsed: unknown[];
    try {
      parsed = JSON.parse(manifest);
    } catch {
      return {
        content: [
          {
            type: "text" as const,
            text: "Invalid JSON. Could not parse manifest.",
          },
        ],
      };
    }

    if (!Array.isArray(parsed)) {
      return {
        content: [
          {
            type: "text" as const,
            text: "Manifest must be an array of FeatureEntry objects.",
          },
        ],
      };
    }

    const ids = new Set<string>();

    for (let i = 0; i < parsed.length; i++) {
      const entry = parsed[i] as Record<string, unknown>;
      const prefix = `Entry [${i}]`;

      if (!entry.id || typeof entry.id !== "string") {
        errors.push(`${prefix}: missing or invalid 'id' (required string)`);
      } else if (ids.has(entry.id)) {
        errors.push(`${prefix}: duplicate id '${entry.id}'`);
      } else {
        ids.add(entry.id);
      }

      if (!entry.label || typeof entry.label !== "string") {
        errors.push(`${prefix}: missing or invalid 'label' (required string)`);
      }

      if (!entry.releasedAt || typeof entry.releasedAt !== "string") {
        errors.push(
          `${prefix}: missing or invalid 'releasedAt' (required ISO 8601 string)`
        );
      } else if (isNaN(Date.parse(entry.releasedAt as string))) {
        errors.push(
          `${prefix}: 'releasedAt' is not a valid date: ${entry.releasedAt}`
        );
      }

      if (entry.showNewUntil) {
        if (isNaN(Date.parse(entry.showNewUntil as string))) {
          errors.push(
            `${prefix}: 'showNewUntil' is not a valid date: ${entry.showNewUntil}`
          );
        } else if (
          Date.parse(entry.showNewUntil as string) <=
          Date.parse(entry.releasedAt as string)
        ) {
          warnings.push(
            `${prefix}: 'showNewUntil' is before or equal to 'releasedAt'`
          );
        }
      } else {
        warnings.push(`${prefix}: no 'showNewUntil' — feature will never auto-expire`);
      }

      if (
        entry.type &&
        !["feature", "improvement", "fix", "breaking"].includes(
          entry.type as string
        )
      ) {
        warnings.push(
          `${prefix}: unknown type '${entry.type}'. Valid: feature, improvement, fix, breaking`
        );
      }

      if (
        entry.priority &&
        !["critical", "normal", "low"].includes(entry.priority as string)
      ) {
        warnings.push(
          `${prefix}: unknown priority '${entry.priority}'. Valid: critical, normal, low`
        );
      }
    }

    const status = errors.length === 0 ? "VALID" : "INVALID";
    const lines = [`# Manifest Validation: ${status}`, ""];

    if (errors.length > 0) {
      lines.push(`## Errors (${errors.length})`);
      errors.forEach((e) => lines.push(`- ${e}`));
      lines.push("");
    }

    if (warnings.length > 0) {
      lines.push(`## Warnings (${warnings.length})`);
      warnings.forEach((w) => lines.push(`- ${w}`));
      lines.push("");
    }

    if (errors.length === 0 && warnings.length === 0) {
      lines.push(
        `Manifest is valid with ${parsed.length} feature(s). No issues found.`
      );
    }

    return { content: [{ type: "text" as const, text: lines.join("\n") }] };
  }
);

server.tool(
  "featuredrop_suggest_placement",
  "Suggest where and how to add FeatureDrop components in the app based on component type.",
  {
    componentType: z
      .enum(["badge", "changelog", "tour", "checklist", "feedback", "survey", "banner", "toast"])
      .describe("The type of component to add"),
    useShadcn: z
      .boolean()
      .default(false)
      .describe("Whether the project uses shadcn/ui"),
  },
  async ({ componentType, useShadcn }) => {
    const suggestions: Record<string, { where: string; code: string; hookCode: string }> = {
      badge: {
        where: "Sidebar nav items, tab labels, or feature buttons. Place next to the text label.",
        code: `import { NewBadge } from 'featuredrop/react'

// In your sidebar/nav
<a href="/settings">
  Settings <NewBadge id="dark-mode" variant="pill" />
</a>`,
        hookCode: `import { useNewFeature } from 'featuredrop/react/hooks'
import { Badge } from '@/components/ui/badge'

function NavItem({ id, label, href }) {
  const { isNew } = useNewFeature(id)
  return (
    <a href={href}>
      {label} {isNew && <Badge variant="secondary">New</Badge>}
    </a>
  )
}`,
      },
      changelog: {
        where: "Header/navbar (as a bell icon or 'What\\'s New' button), or a dedicated changelog page.",
        code: `import { ChangelogWidget } from 'featuredrop/react'

// In your header
<header>
  <nav>...</nav>
  <ChangelogWidget title="What's New" position="right" showReactions />
</header>`,
        hookCode: `import { useChangelog } from 'featuredrop/react/hooks'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'

function Changelog() {
  const { newFeatures, newCount, markAllSeen } = useChangelog()
  return (
    <Sheet onOpenChange={() => markAllSeen()}>
      <SheetTrigger>What's New {newCount > 0 && <Badge>{newCount}</Badge>}</SheetTrigger>
      <SheetContent>
        {newFeatures.map(f => <div key={f.id}><h3>{f.label}</h3><p>{f.description}</p></div>)}
      </SheetContent>
    </Sheet>
  )
}`,
      },
      tour: {
        where: "Triggered on first login, after onboarding, or when a major feature ships. Attach steps to key UI elements.",
        code: `import { Tour } from 'featuredrop/react'

const steps = [
  { target: '#dashboard', title: 'Dashboard', content: 'Your overview lives here.' },
  { target: '#settings', title: 'Settings', content: 'Customize your experience.' },
  { target: '#help', title: 'Help', content: 'Get support anytime.' },
]

<Tour id="onboarding" steps={steps} />`,
        hookCode: `import { useTour } from 'featuredrop/react/hooks'

function OnboardingTour() {
  const { currentStep, isActive, start, next, prev, skip } = useTour('onboarding')
  if (!isActive) return <button onClick={start}>Start Tour</button>
  return (
    <div>
      <h3>{currentStep?.title}</h3>
      <p>{currentStep?.content}</p>
      <button onClick={prev}>Back</button>
      <button onClick={next}>Next</button>
      <button onClick={skip}>Skip</button>
    </div>
  )
}`,
      },
      checklist: {
        where: "Onboarding flow, setup wizard, or a sidebar panel. Show progress to motivate completion.",
        code: `import { Checklist } from 'featuredrop/react'

const tasks = [
  { id: 'profile', label: 'Complete your profile', href: '/settings/profile' },
  { id: 'invite', label: 'Invite a teammate', href: '/settings/team' },
  { id: 'first-project', label: 'Create your first project', href: '/projects/new' },
]

<Checklist id="setup" tasks={tasks} />`,
        hookCode: `import { useChecklist } from 'featuredrop/react/hooks'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'

function SetupChecklist() {
  const { tasks, progress, completeTask } = useChecklist('setup')
  return (
    <Card>
      <Progress value={progress} />
      {tasks.map(t => (
        <label key={t.id}>
          <Checkbox checked={t.completed} onCheckedChange={() => completeTask(t.id)} />
          {t.label}
        </label>
      ))}
    </Card>
  )
}`,
      },
      feedback: {
        where: "Footer, help menu, or a floating button. Low-friction placement for quick user input.",
        code: `import { FeedbackWidget } from 'featuredrop/react'

<FeedbackWidget categories={['bug', 'feature', 'question', 'other']} />`,
        hookCode: `import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

function FeedbackForm() {
  return (
    <Dialog>
      <DialogTrigger asChild><Button variant="outline">Feedback</Button></DialogTrigger>
      <DialogContent>
        <Textarea placeholder="What's on your mind?" />
        <Button>Submit</Button>
      </DialogContent>
    </Dialog>
  )
}`,
      },
      survey: {
        where: "Triggered after key actions (purchase, project completion), or on a schedule. Use modals or inline.",
        code: `import { Survey } from 'featuredrop/react'

<Survey id="nps-q1" type="nps" />`,
        hookCode: `import { useSurvey } from 'featuredrop/react/hooks'

function NPSSurvey() {
  const { isVisible, submit, askLater, dismiss } = useSurvey('nps-q1')
  if (!isVisible) return null
  return (
    <div>
      <p>How likely are you to recommend us?</p>
      {[...Array(11)].map((_, i) => <button key={i} onClick={() => submit({ score: i })}>{i}</button>)}
      <button onClick={askLater}>Later</button>
      <button onClick={dismiss}>Dismiss</button>
    </div>
  )
}`,
      },
      banner: {
        where: "Top of page (site-wide announcements), or inline within a specific section.",
        code: `import { Banner } from 'featuredrop/react'

<Banner
  variant="info"
  cta={{ label: 'Learn more', url: '/blog/v2' }}
  dismissible
>
  We just shipped v2.0 with dark mode and API keys!
</Banner>`,
        hookCode: `import { useNewFeature } from 'featuredrop/react/hooks'

function AnnouncementBanner({ featureId }) {
  const { isNew, feature, dismiss } = useNewFeature(featureId)
  if (!isNew) return null
  return (
    <div className="bg-blue-50 p-4 flex justify-between">
      <span>{feature.label}: {feature.description}</span>
      <button onClick={dismiss}>Dismiss</button>
    </div>
  )
}`,
      },
      toast: {
        where: "Bottom-right or top-right corner. Use for non-blocking feature announcements.",
        code: `import { Toast } from 'featuredrop/react'
import { useFeatureDrop } from 'featuredrop/react/hooks'

function App() {
  const { newFeatures } = useFeatureDrop()
  return <Toast features={newFeatures} position="bottom-right" autoDismiss duration={5000} />
}`,
        hookCode: `// Toast is typically used as a component, but you can build custom:
import { useFeatureDrop } from 'featuredrop/react/hooks'

function CustomToast() {
  const { newFeatures, dismiss } = useFeatureDrop()
  return newFeatures.slice(0, 1).map(f => (
    <div key={f.id} className="fixed bottom-4 right-4 bg-white shadow-lg rounded-lg p-4">
      <strong>{f.label}</strong>
      <p>{f.description}</p>
      <button onClick={() => dismiss(f.id)}>Got it</button>
    </div>
  ))
}`,
      },
    };

    const suggestion = suggestions[componentType];
    const code = useShadcn ? suggestion.hookCode : suggestion.code;

    return {
      content: [
        {
          type: "text" as const,
          text: `# ${componentType.charAt(0).toUpperCase() + componentType.slice(1)} Placement

## Where to add it
${suggestion.where}

## ${useShadcn ? "Code (using shadcn/ui hooks pattern)" : "Code (using FeatureDrop components)"}
\`\`\`tsx
${code}
\`\`\`

${useShadcn ? "This uses FeatureDrop hooks + your shadcn primitives. The component lives in your codebase." : "This uses FeatureDrop's built-in component. For custom UI, set useShadcn=true to get the hooks pattern."}`,
        },
      ],
    };
  }
);

server.tool(
  "featuredrop_migrate",
  "Generate migration steps and manifest conversion from a competitor tool to FeatureDrop.",
  {
    from: z
      .enum(["beamer", "headway", "announcekit", "canny", "launchnotes"])
      .describe("The tool to migrate from"),
  },
  async ({ from }) => {
    const guide = MIGRATION_GUIDES[from];
    return {
      content: [
        {
          type: "text" as const,
          text: guide || `No migration guide available for '${from}'.`,
        },
      ],
    };
  }
);

// ─── Resources ─────────────────────────────────────────────────────────────

server.resource(
  "quickstart",
  "featuredrop://docs/quickstart",
  { description: "FeatureDrop quickstart guide", mimeType: "text/markdown" },
  async () => ({
    contents: [
      { uri: "featuredrop://docs/quickstart", mimeType: "text/markdown", text: DOCS.quickstart },
    ],
  })
);

server.resource(
  "hooks",
  "featuredrop://docs/hooks",
  { description: "All FeatureDrop hooks with signatures and examples", mimeType: "text/markdown" },
  async () => ({
    contents: [
      { uri: "featuredrop://docs/hooks", mimeType: "text/markdown", text: DOCS.hooks },
    ],
  })
);

server.resource(
  "components",
  "featuredrop://docs/components",
  { description: "FeatureDrop component API reference", mimeType: "text/markdown" },
  async () => ({
    contents: [
      { uri: "featuredrop://docs/components", mimeType: "text/markdown", text: DOCS.components },
    ],
  })
);

server.resource(
  "adapters",
  "featuredrop://docs/adapters",
  { description: "Storage adapter options and setup", mimeType: "text/markdown" },
  async () => ({
    contents: [
      { uri: "featuredrop://docs/adapters", mimeType: "text/markdown", text: DOCS.adapters },
    ],
  })
);

server.resource(
  "shadcn",
  "featuredrop://docs/shadcn",
  { description: "Using FeatureDrop with shadcn/ui", mimeType: "text/markdown" },
  async () => ({
    contents: [
      { uri: "featuredrop://docs/shadcn", mimeType: "text/markdown", text: DOCS.shadcn },
    ],
  })
);

server.resource(
  "manifest-schema",
  "featuredrop://schema/manifest",
  { description: "JSON schema for the FeatureDrop feature manifest", mimeType: "text/markdown" },
  async () => ({
    contents: [
      { uri: "featuredrop://schema/manifest", mimeType: "text/markdown", text: DOCS.manifest },
    ],
  })
);

// ─── Start ─────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("FeatureDrop MCP server running on stdio");
