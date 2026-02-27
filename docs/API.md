# API Reference

## Core Functions

### `isNew(feature, watermark, dismissedIds, now?)`

Check if a single feature should show as "new".

```ts
import { isNew } from 'featuredrop'

const result = isNew(
  feature,           // FeatureEntry
  watermark,         // string | null (ISO date)
  dismissedIds,      // ReadonlySet<string>
  now,               // Date (optional, defaults to new Date())
)
```

Returns `true` when ALL conditions are met:
1. Feature is not in `dismissedIds`
2. If `publishAt` is set, current time is after `publishAt`
3. Current time is before `feature.showNewUntil`
4. Feature was released after `watermark` (or watermark is null)
5. Dependency requirements (`dependsOn`) are satisfied when dependency state is provided

### `getNewFeatures(manifest, storage, now?)`

Get all features currently "new" for this user.

```ts
import { getNewFeatures } from 'featuredrop'

const newFeatures = getNewFeatures(FEATURES, storage)
// → FeatureEntry[]
```

### `getNewFeatureCount(manifest, storage, now?)`

Get the count of new features.

```ts
import { getNewFeatureCount } from 'featuredrop'

const count = getNewFeatureCount(FEATURES, storage) // → number
```

### `hasNewFeature(manifest, sidebarKey, storage, now?)`

Check if a specific sidebar key has any new features.

```ts
import { hasNewFeature } from 'featuredrop'

if (hasNewFeature(FEATURES, '/journal', storage)) {
  // show badge
}
```

### `getNewFeaturesSorted(manifest, storage, now?)`

Get new features sorted by priority (critical first) then by release date (newest first).

```ts
import { getNewFeaturesSorted } from 'featuredrop'

const sorted = getNewFeaturesSorted(FEATURES, storage)
// → FeatureEntry[] — critical first, then normal, then low
```

## Helpers

### `createManifest(entries)`

Create a frozen, typed manifest from an array.

```ts
import { createManifest } from 'featuredrop'

export const FEATURES = createManifest([
  { id: 'ai-journal', label: 'AI Journal', releasedAt: '...', showNewUntil: '...' },
])
```

### `getFeatureById(manifest, id)`

Find a feature by its ID. Returns `undefined` if not found.

```ts
import { getFeatureById } from 'featuredrop'

const feature = getFeatureById(FEATURES, 'ai-journal')
```

### `getNewFeaturesByCategory(manifest, category, storage, now?)`

Filter new features by category.

```ts
import { getNewFeaturesByCategory } from 'featuredrop'

const aiFeatures = getNewFeaturesByCategory(FEATURES, 'ai', storage)
```

### `parseDescription(markdown)`

Parse markdown into sanitized HTML for feature descriptions.

```ts
import { parseDescription } from 'featuredrop'

const html = parseDescription('**Bold** and `code`')
```

- Uses optional peer dep `marked` when installed, falls back to a tiny built-in parser.
- Built-in XSS guards strip `<script>`, inline event handlers, and `javascript:` / `data:` URLs.
- If `shiki` is installed, code fences are syntax highlighted; otherwise plain `<pre><code>`.

### Theme Utilities

```ts
import {
  FEATUREDROP_THEMES,
  createTheme,
  resolveTheme,
  themeToCSSVariables,
} from 'featuredrop'

const customTheme = createTheme({
  colors: { primary: '#6366f1' },
})

const resolved = resolveTheme('auto', { prefersDark: true })
const vars = themeToCSSVariables(customTheme)
```

- `FEATUREDROP_THEMES` — built-in presets (`light`, `dark`, `minimal`, `vibrant`)
- `createTheme(overrides, base?)` — deep-merge overrides onto base theme (default: light)
- `resolveTheme(input, options?)` — resolve preset/custom input, including `auto`
- `themeToCSSVariables(theme)` — map theme tokens to featuredrop CSS custom properties

### i18n Utilities

```ts
import { FEATUREDROP_TRANSLATIONS, resolveTranslations } from 'featuredrop'

const fr = resolveTranslations('fr')
const custom = resolveTranslations('es', { submit: 'Enviar ahora' })
```

- `FEATUREDROP_TRANSLATIONS` — built-in locale packs (`en`, `es`, `fr`, `de`, `pt`, `zh-cn`, `ja`, `ko`, `ar`, `hi`)
- `resolveTranslations(locale?, overrides?)` — resolve locale defaults + optional overrides

### `generateRSS(manifest, options?)`

Produce an RSS 2.0 feed string from a feature manifest.

```ts
import { generateRSS } from 'featuredrop'

const xml = generateRSS(FEATURES, {
  title: 'Product Updates',
  link: 'https://example.com/changelog',
  description: 'Latest releases',
})
```

- Orders entries by `releasedAt` (newest first)
- Uses `parseDescription` for sanitized HTML in `<description>` CDATA

## Analytics

### `AnalyticsCollector`

Batches and flushes adoption events to any analytics adapter.

```ts
import { AnalyticsCollector, PostHogAdapter } from 'featuredrop'

const collector = new AnalyticsCollector({
  adapter: new PostHogAdapter(posthog),
  batchSize: 20,
  flushInterval: 10_000,
  sampleRate: 1,
})

collector.track({ type: 'feature_seen', featureId: 'ai-journal' })
await collector.flush()
```

Built-in adapters:
- `PostHogAdapter`
- `AmplitudeAdapter`
- `MixpanelAdapter`
- `SegmentAdapter`
- `CustomAdapter`

### `createAdoptionMetrics(events)`

```ts
import { createAdoptionMetrics } from 'featuredrop'

const metrics = createAdoptionMetrics(events)
metrics.getAdoptionRate('ai-journal')
metrics.getTourCompletionRate('onboarding')
metrics.getChecklistCompletionRate('getting-started')
metrics.getFeatureEngagement('ai-journal')
metrics.getVariantPerformance('ai-journal')
```

### `applyAnnouncementThrottle(features, options?, state, now?)`

Apply Phase C throttling rules to pending announcements.

```ts
import { applyAnnouncementThrottle } from 'featuredrop'

const { visible, queued } = applyAnnouncementThrottle(features, {
  maxSimultaneousBadges: 3,
  sessionCooldown: 5000,
  respectDoNotDisturb: true,
}, {
  sessionStartedAt: Date.now(),
  quietMode: false,
})
```

- Sorts by priority (`critical` > `normal` > `low`) then recency
- Applies `sessionCooldown` deferral
- Applies quiet mode filtering when `respectDoNotDisturb` is enabled
- Returns `{ visible, queued }`

### `resolveDependencyOrder(manifest)`

Return feature IDs sorted in dependency-safe order (prerequisites first).

```ts
import { resolveDependencyOrder } from 'featuredrop'

const order = resolveDependencyOrder(FEATURES)
```

### `hasDependencyCycle(manifest)`

Detect whether the dependency graph contains a cycle.

```ts
import { hasDependencyCycle } from 'featuredrop'

if (hasDependencyCycle(FEATURES)) {
  throw new Error('Fix circular dependsOn relationships')
}
```

### `sortFeaturesByDependencies(features)`

Sort an already-filtered feature list so prerequisites come before dependents.

```ts
import { sortFeaturesByDependencies } from 'featuredrop'

const ordered = sortFeaturesByDependencies(newFeatures)
```

### `TriggerEngine` + `isTriggerMatch(trigger, context)`

Evaluate contextual trigger rules (page, usage, time, milestone, frustration, scroll, custom).

```ts
import { TriggerEngine, isTriggerMatch } from 'featuredrop'

const engine = new TriggerEngine({ path: '/reports' })
engine.trackUsage('mouse-heavy-session')
engine.trackMilestone('first-team-member-invited')

const matched = isTriggerMatch(
  { type: 'usage', event: 'mouse-heavy-session', minActions: 1 },
  engine.getContext(),
)
```

### Variant Helpers

```ts
import {
  applyFeatureVariant,
  applyFeatureVariants,
  getFeatureVariantName,
  getOrCreateVariantKey,
} from 'featuredrop'
```

## Types

### `FeatureEntry`

```ts
interface FeatureEntry {
  id: string                    // Unique identifier
  label: string                 // Human-readable label
  description?: string          // Optional longer description (supports markdown in UI)
  version?: string | {          // Semantic version targeting
    introduced?: string         // feature exists from this app version (inclusive)
    showNewUntil?: string       // stop showing "new" at this app version (exclusive)
    deprecatedAt?: string       // hide feature at/after this version
    showIn?: string             // range string, e.g. ">=2.5.0 <3.0.0"
  }
  releasedAt: string            // ISO date — when feature shipped
  showNewUntil: string          // ISO date — when badge auto-expires
  sidebarKey?: string           // Optional key to match nav items
  category?: string             // Optional grouping category
  url?: string                  // Optional link (docs, changelog)
  type?: FeatureType            // 'feature' | 'improvement' | 'fix' | 'breaking'
  priority?: FeaturePriority    // 'critical' | 'normal' | 'low'
  image?: string                // Optional image/screenshot URL
  cta?: FeatureCTA              // Optional call-to-action button
  publishAt?: string            // ISO date — hidden until this date
  meta?: Record<string, unknown> // Arbitrary metadata
  variants?: Record<string, FeatureVariant> // A/B announcement variants
  variantSplit?: number[]       // weighted split per variant
  dependsOn?: {                // Progressive dependency chains
    seen?: string[]
    clicked?: string[]
    dismissed?: string[]
  }
  trigger?: FeatureTrigger      // Contextual trigger rule
}
```

### `FeatureDependencies`

```ts
interface FeatureDependencies {
  seen?: string[]
  clicked?: string[]
  dismissed?: string[]
}
```

### `FeatureDependencyState`

```ts
interface FeatureDependencyState {
  seenIds?: ReadonlySet<string>
  clickedIds?: ReadonlySet<string>
  dismissedIds?: ReadonlySet<string>
}
```

### `FeatureTrigger`

```ts
type FeatureTrigger =
  | { type: 'page'; match: string | RegExp }
  | { type: 'usage'; event: string; minActions?: number }
  | { type: 'time'; minSeconds: number }
  | { type: 'milestone'; event: string }
  | { type: 'frustration'; pattern: string; threshold?: number }
  | { type: 'scroll'; minPercent?: number }
  | { type: 'custom'; evaluate: (context: TriggerContext) => boolean }
```

### `TriggerContext`

```ts
interface TriggerContext {
  path?: string
  events?: ReadonlySet<string>
  milestones?: ReadonlySet<string>
  usage?: Record<string, number>
  elapsedMs?: number
  scrollPercent?: number
  metadata?: Record<string, unknown>
}
```

### `FeatureVariant`

```ts
interface FeatureVariant {
  label?: string
  description?: string
  image?: string
  cta?: FeatureCTA
  meta?: Record<string, unknown>
}
```

### `ThrottleOptions`

```ts
interface ThrottleOptions {
  maxSimultaneousBadges?: number
  maxSimultaneousSpotlights?: number
  maxToastsPerSession?: number
  minTimeBetweenModals?: number
  minTimeBetweenTours?: number
  sessionCooldown?: number
  respectDoNotDisturb?: boolean
}
```

### `FeatureType`

```ts
type FeatureType = 'feature' | 'improvement' | 'fix' | 'breaking'
```

Entry type determines default icon/color in built-in UI components.

### `FeaturePriority`

```ts
type FeaturePriority = 'critical' | 'normal' | 'low'
```

Priority level for sorting and display. Critical entries surface first in widgets and toasts.

### `FeatureCTA`

```ts
interface FeatureCTA {
  label: string   // Button/link text
  url: string     // URL to navigate to
}
```

### `StorageAdapter`

```ts
interface StorageAdapter {
  getWatermark(): string | null
  getDismissedIds(): ReadonlySet<string>
  dismiss(id: string): void
  dismissAll(now: Date): Promise<void>
}
```

### `ServerStorageAdapter`

```ts
interface ServerStorageAdapter extends StorageAdapter {
  userId: string
  sync(): Promise<void>
  dismissBatch(ids: string[]): Promise<void>
  resetUser(userId: string): Promise<void>
  getBulkState(userIds: string[]): Promise<Map<string, DismissalState>>
  isHealthy(): Promise<boolean>
  destroy(): Promise<void>
}
```

### `AnalyticsCallbacks`

```ts
interface AnalyticsCallbacks {
  onFeatureSeen?: (feature: FeatureEntry) => void
  onFeatureDismissed?: (feature: FeatureEntry) => void
  onFeatureClicked?: (feature: FeatureEntry) => void
  onWidgetOpened?: () => void
  onWidgetClosed?: () => void
  onAllDismissed?: () => void
}
```

## Built-in Adapters

### `LocalStorageAdapter`

Browser localStorage + server watermark. SSR-safe.

```ts
import { LocalStorageAdapter } from 'featuredrop'

const storage = new LocalStorageAdapter({
  prefix: 'featuredrop',       // localStorage key prefix (default)
  watermark: user.featuresSeenAt,  // from server/API
  onDismissAll: async (now) => {   // optional server callback
    await api.updateUser({ featuresSeenAt: now.toISOString() })
  },
})
```

### `MemoryAdapter`

In-memory storage for testing and SSR.

```ts
import { MemoryAdapter } from 'featuredrop'

const storage = new MemoryAdapter({ watermark: '2026-02-20T00:00:00Z' })
```

### `RemoteAdapter`

HTTP-backed adapter for manifest/state sync.

```ts
import { RemoteAdapter } from 'featuredrop'

const storage = new RemoteAdapter({
  url: 'https://api.example.com/api/features',
  userId: currentUser.id,
  headers: { Authorization: `Bearer ${token}` },
})
```

### `PostgresAdapter`

Dependency-free Postgres integration via user-provided query function.

```ts
import { PostgresAdapter } from 'featuredrop'

const storage = new PostgresAdapter({
  userId: currentUser.id,
  query: (sql, params) => pool.query(sql, params),
  tableName: 'featuredrop_state',
  autoMigrate: true,
})
```

### `RedisAdapter`

Redis-backed adapter for fast watermark + dismissed-id state.

```ts
import { RedisAdapter } from 'featuredrop'

const storage = new RedisAdapter({
  userId: currentUser.id,
  client: redisClient,
  keyPrefix: 'fd:',
})
```

### `MySQLAdapter`

Dependency-free MySQL integration via user-provided query function.

```ts
import { MySQLAdapter } from 'featuredrop'

const storage = new MySQLAdapter({
  userId: currentUser.id,
  query: (sql, params) => mysqlPool.query(sql, params).then(([rows]) => ({ rows })),
  tableName: 'featuredrop_state',
  autoMigrate: true,
})
```

### `MongoAdapter`

MongoDB-backed adapter using an existing collection instance.

```ts
import { MongoAdapter } from 'featuredrop'

const storage = new MongoAdapter({
  userId: currentUser.id,
  collection: db.collection('featuredrop_state'),
})
```

### `SQLiteAdapter`

SQLite/libsql/D1-friendly adapter via user-provided query function.

```ts
import { SQLiteAdapter } from 'featuredrop'

const storage = new SQLiteAdapter({
  userId: currentUser.id,
  query: async (sql, params) => ({ rows: await sqlite.execute(sql, params) }),
  tableName: 'featuredrop_state',
  autoMigrate: true,
})
```

### `SupabaseAdapter`

Supabase-backed adapter with optional realtime resync.

```ts
import { SupabaseAdapter } from 'featuredrop'

const storage = new SupabaseAdapter({
  userId: currentUser.id,
  client: supabase,
  tableName: 'featuredrop_state',
  realtime: true,
})
```

### `HybridAdapter`

Combines local and server adapters for immediate UX plus durable sync.

```ts
import { HybridAdapter, MemoryAdapter, RedisAdapter } from 'featuredrop'

const storage = new HybridAdapter({
  local: new MemoryAdapter(),
  remote: new RedisAdapter({ userId: currentUser.id, client: redisClient }),
})
```

### Custom Adapters

Implement the `StorageAdapter` interface:

```ts
import type { StorageAdapter } from 'featuredrop'

class RedisAdapter implements StorageAdapter {
  getWatermark(): string | null {
    return this.cache.get('watermark')
  }
  getDismissedIds(): ReadonlySet<string> {
    return new Set(this.cache.get('dismissed') ?? [])
  }
  dismiss(id: string): void {
    this.cache.append('dismissed', id)
  }
  async dismissAll(now: Date): Promise<void> {
    await this.cache.set('watermark', now.toISOString())
    await this.cache.delete('dismissed')
  }
}
```

## CLI

### `featuredrop init`

Scaffold a new featuredrop project with markdown files or JSON manifest.

```bash
npx featuredrop init --format markdown
```

Flags:
- `--format markdown|json` (default: markdown)
- `--force` overwrite sample output if target exists
- `--cwd` working directory

### `featuredrop add`

Add a feature entry to `features/**/*.md` or `features.json`.

```bash
npx featuredrop add --label "AI Journal" --category ai --description "Track decisions with AI"
```

Flags:
- `--label` required in non-interactive mode
- `--id`, `--type`, `--category`, `--description`, `--url`
- `--releasedAt`, `--showNewUntil`, `--show-days`
- `--format markdown|json`, `--cwd`

### `featuredrop migrate`

Convert external changelog exports into a featuredrop manifest.

```bash
npx featuredrop migrate --from beamer --input beamer-export.json --out featuredrop.manifest.json
```

Flags:
- `--from beamer` currently supported source
- `--input` source JSON file (default: `beamer-export.json`)
- `--out` output file path
- `--cwd` working directory

### `featuredrop build`

Compile markdown feature files into a manifest JSON.

```bash
npx featuredrop build --pattern "features/**/*.md" --out featuredrop.manifest.json
```

Flags:
- `--pattern` glob-like pattern (`features/**/*.md` style)
- `--out` output JSON file path (default: `featuredrop.manifest.json`)
- `--cwd` working directory (default: current directory)

### `featuredrop validate`

Validate feature markdown files (schema + duplicate IDs) without writing output.

```bash
npx featuredrop validate --pattern "features/**/*.md"
```

### `featuredrop stats`

Print manifest statistics (count, type/category breakdown, release range).

```bash
npx featuredrop stats --pattern "features/**/*.md"
```

### `featuredrop doctor`

Run diagnostics (date quality, description coverage, dependency cycles, expiry/schedule warnings).

```bash
npx featuredrop doctor --pattern "features/**/*.md"
```

### `featuredrop generate-rss`

Generate RSS feed XML from markdown feature files.

```bash
npx featuredrop generate-rss --pattern "features/**/*.md" --out featuredrop.rss.xml --title "Product Updates"
```

Flags:
- `--title` RSS channel title
- `--link` RSS channel link
- `--description` RSS channel description

### `featuredrop generate-changelog`

Generate markdown changelog file from parsed feature entries.

```bash
npx featuredrop generate-changelog --pattern "features/**/*.md" --out CHANGELOG.generated.md
```

## Schema (`featuredrop/schema`)

```ts
import {
  featureEntrySchema,
  featureManifestSchema,
  featureEntryJsonSchema,
  featureManifestJsonSchema,
  validateManifest,
} from 'featuredrop/schema'
```

### `validateManifest(data)`

Validate unknown manifest data and return structured issues.

```ts
const result = validateManifest(data)
if (!result.valid) {
  console.error(result.errors)
}
```

Validation includes:
- Required field/type checks for `id`, `label`, `releasedAt`, `showNewUntil`
- Date validity and `showNewUntil > releasedAt`
- Duplicate IDs
- Circular dependency detection (`dependsOn`)

Notes:
- `featureEntrySchema` + `featureManifestSchema` are Zod schemas
- `featureEntryJsonSchema` + `featureManifestJsonSchema` are JSON schema objects

## Testing (`featuredrop/testing`)

```ts
import {
  createMockManifest,
  createMockStorage,
  createTestProvider,
  advanceTime,
  MockAnalyticsCollector,
} from 'featuredrop/testing'
```

### `createMockManifest(entries, now?)`

Builds a frozen manifest for tests. Supports relative date shortcuts:
- `releasedAt: "today"`
- `showNewUntil: "+14d"` / `"-1d"`

### `createMockStorage(initial?)`

In-memory storage adapter for tests with helpers:
- `setWatermark(value)`
- `setDismissedIds(ids)`
- `reset()`

### `createTestProvider(props)`

Returns a React wrapper component for Testing Library `render(..., { wrapper })`.

### `advanceTime(ms)`

Advances fake timers via `vi` or `jest` controller.

### `MockAnalyticsCollector`

`AnalyticsCollector` variant that stores emitted events in `collector.events`.

## Playground

Lightweight component playground for local UI development:

```bash
pnpm --dir examples/sandbox-react install
pnpm playground
pnpm playground:build
```

Playground source lives in `examples/sandbox-react/`.

## React (`featuredrop/react`)

### `FeatureDropProvider`

Context provider. Wrap your app or subtree.

```tsx
import { FeatureDropProvider } from 'featuredrop/react'

<FeatureDropProvider
  manifest={FEATURES}
  storage={storage}
  appVersion="2.5.1" // optional: semver string for version-pinned features
  analytics={{
    onFeatureSeen: (f) => track('feature_seen', f.id),
    onFeatureDismissed: (f) => track('feature_dismissed', f.id),
    onAllDismissed: () => track('all_dismissed'),
  }}
>
  {children}
</FeatureDropProvider>
```

Props:
- `manifest: FeatureManifest` — your feature array
- `storage: StorageAdapter` — adapter instance
- `appVersion?: string` — current app version (semver) for version-pinned features
- `variantKey?: string` — stable user key for deterministic A/B variant assignment
- `throttle?: ThrottleOptions` — queue/cooldown/DND controls
- `collector?: AnalyticsCollector` — adoption analytics collector integration
- `locale?: string` — locale code for built-in UI strings (default: `en`)
- `translations?: Partial<FeatureDropTranslations>` — override built-in copy
- `analytics?: AnalyticsCallbacks` — optional analytics callbacks
- `children: ReactNode`

### `ThemeProvider`

Apply theme tokens as CSS variables for all nested featuredrop components.

```tsx
import { ThemeProvider } from 'featuredrop/react'

<ThemeProvider theme="dark">
  <ChangelogWidget />
</ThemeProvider>
```

```tsx
import { createTheme } from 'featuredrop'

const customTheme = createTheme({
  colors: { primary: '#7c3aed' },
})

<ThemeProvider theme={customTheme}>
  <ChangelogPage />
</ThemeProvider>
```

Props:
- `theme?: FeatureDropThemeInput` — preset or custom theme (default: light)
- `className?: string`
- `style?: CSSProperties`
- `children: ReactNode`

### `useFeatureDrop()`

Full feature discovery context. Throws if used outside provider.

```tsx
const {
  newFeatures,        // FeatureEntry[]
  queuedFeatures,     // FeatureEntry[] (throttled queue)
  newCount,           // number
  totalNewCount,      // number (before throttling)
  newFeaturesSorted,  // FeatureEntry[] — sorted by priority then date
  isNew,              // (sidebarKey: string) => boolean
  dismiss,            // (id: string) => void
  dismissAll,         // () => Promise<void>
  getFeature,         // (sidebarKey: string) => FeatureEntry | undefined
  quietMode,          // boolean
  setQuietMode,       // (enabled: boolean) => void
  markFeatureSeen,    // (featureId: string) => void
  markFeatureClicked, // (featureId: string) => void
  getRemainingToastSlots, // () => number
  markToastsShown,    // (featureIds: string[]) => void
  canShowModal,       // (priority?: FeaturePriority) => boolean
  markModalShown,     // () => void
  canShowTour,        // () => boolean
  markTourShown,      // () => void
  acquireSpotlightSlot, // (id: string, priority?: FeaturePriority) => boolean
  releaseSpotlightSlot, // (id: string) => void
  activeSpotlightCount, // number
  trackAdoptionEvent, // (event: AdoptionEventInput) => void
  trackUsageEvent,    // (event: string, delta?: number) => void
  trackTriggerEvent,  // (event: string) => void
  trackMilestone,     // (event: string) => void
  setTriggerPath,     // (path: string) => void
} = useFeatureDrop()
```

### `useNewFeature(sidebarKey)`

Single navigation item helper.

```tsx
const {
  isNew,    // boolean
  feature,  // FeatureEntry | undefined
  dismiss,  // () => void
} = useNewFeature('/journal')
```

### `useNewCount()`

Just the badge count.

```tsx
const count = useNewCount() // number
```

### `useTabNotification(options?)`

Updates the browser tab title with the unread feature count.

```tsx
import { useTabNotification } from 'featuredrop/react'

// Default: "(3) My App"
useTabNotification()

// Custom template
useTabNotification({ template: '[{count} new] {title}' })

// With flash/blink effect
useTabNotification({ flash: true, flashInterval: 1500 })

// Disabled
useTabNotification({ enabled: false })
```

Options:
- `enabled?: boolean` — enable/disable (default: true)
- `template?: string` — template with `{count}` and `{title}` placeholders
- `flash?: boolean` — alternating title flash (default: false)
- `flashInterval?: number` — flash interval in ms (default: 1500)

### `useAdoptionAnalytics(events)`

React memoized wrapper around `createAdoptionMetrics`.

```tsx
import { useAdoptionAnalytics } from 'featuredrop/react'

const analytics = useAdoptionAnalytics(events)
const adoptionRate = analytics.getAdoptionRate('ai-journal')
```

### `useTour(id)`

Imperative controls and state snapshot for a registered tour instance.

```tsx
import { Tour, useTour } from 'featuredrop/react'

<Tour id="onboarding" steps={steps} />

const {
  startTour,
  nextStep,
  prevStep,
  skipTour,
  closeTour,
  currentStep,
  currentStepIndex,
  totalSteps,
  isActive,
} = useTour('onboarding')
```

### `useTourSequencer(sequence)`

Sequence multiple tours by feature readiness (including `dependsOn` gating).

```tsx
import { useTourSequencer } from 'featuredrop/react'

const { nextTourId, remainingTours, startNextTour } = useTourSequencer([
  { featureId: 'base-feature', tourId: 'tour-base' },
  { featureId: 'dependent-feature', tourId: 'tour-dependent' },
])
```

Returns:
- `nextTourId: string | null`
- `nextFeatureId: string | null`
- `remainingTours: number`
- `startNextTour(): boolean`

### `useChecklist(id)`

Imperative checklist controls + progress snapshot.

```tsx
import { Checklist, useChecklist } from 'featuredrop/react'

<Checklist id="getting-started" tasks={tasks} />

const {
  completeTask,
  resetChecklist,
  dismissChecklist,
  toggleCollapsed,
  isComplete,
  progress,         // { completed, total, percent }
  collapsed,
  dismissed,
} = useChecklist('getting-started')
```

### `useSurvey(id)`

Imperative survey controls + snapshot state for a registered survey instance.

```tsx
import { Survey, useSurvey } from 'featuredrop/react'

<Survey id="nps-main" type="nps" trigger="manual" onSubmit={saveSurvey} />

const {
  show,       // ({ force?: boolean }) => boolean
  hide,       // () => void
  askLater,   // () => void
  isOpen,     // boolean
  submitted,  // boolean
  canShow,    // boolean
  type,       // SurveyType
} = useSurvey('nps-main')
```

---

## Components

### `NewBadge`

Headless badge component with three variants.

```tsx
<NewBadge />                          // pill (default) — "New"
<NewBadge variant="dot" />            // small dot with glow
<NewBadge variant="count" count={3} /> // count badge
<NewBadge label="Updated" />          // custom label
<NewBadge dismissOnClick onDismiss={dismiss} />  // dismiss on click
```

**Render prop:**

```tsx
<NewBadge show={isNew}>
  {({ isNew }) => isNew ? <MyCustomBadge /> : null}
</NewBadge>
```

Props:
- `variant?: 'pill' | 'dot' | 'count'` — display mode
- `show?: boolean` — whether to render (default: true)
- `count?: number` — count for "count" variant
- `label?: string` — text for "pill" variant (default: "New")
- `onDismiss?: () => void` — dismiss callback
- `dismissOnClick?: boolean` — click triggers onDismiss
- `className?: string` — additional CSS class
- `style?: CSSProperties` — inline styles (merged with defaults)
- `children?: (props: { isNew: boolean }) => ReactNode` — render prop

Accessibility defaults:
- Count badge announces updates with `aria-live="polite"`
- Dot pulse animation is disabled when `prefers-reduced-motion: reduce`

### NewBadge Styling

Zero CSS framework dependency. Style via CSS custom properties:

```css
[data-featuredrop] {
  --featuredrop-color: #b45309;
  --featuredrop-bg: rgba(245, 158, 11, 0.15);
  --featuredrop-font-size: 10px;
  --featuredrop-dot-size: 8px;
  --featuredrop-glow: rgba(245, 158, 11, 0.6);
  --featuredrop-count-size: 18px;
  --featuredrop-count-color: white;
  --featuredrop-count-bg: #f59e0b;
}
```

---

### `ChangelogWidget`

Full changelog feed with trigger button, unread count badge, and rich entry display.

```tsx
import { ChangelogWidget } from 'featuredrop/react'

// Default panel
<ChangelogWidget />

// Modal variant
<ChangelogWidget variant="modal" title="Release Notes" />

// Popover variant
<ChangelogWidget variant="popover" />

// Custom labels
<ChangelogWidget
  triggerLabel="Updates"
  markAllLabel="Clear All"
  emptyLabel="Nothing here"
/>

// Reactions on each entry
<ChangelogWidget showReactions reactions={['👍', '❤️', '🎉', '👀', '👎']} />
```

**Headless mode:**

```tsx
<ChangelogWidget>
  {({ isOpen, toggle, features, count, dismiss, dismissAll }) => (
    <div>
      <button onClick={toggle}>Updates ({count})</button>
      {isOpen && features.map(f => (
        <div key={f.id}>
          {f.label}
          <button onClick={() => dismiss(f.id)}>x</button>
        </div>
      ))}
    </div>
  )}
</ChangelogWidget>
```

**Custom entry renderer:**

```tsx
<ChangelogWidget
  renderEntry={({ feature, dismiss }) => (
    <div className="my-entry">
      <h3>{feature.label}</h3>
      <button onClick={dismiss}>Dismiss</button>
    </div>
  )}
/>
```

Props:
- `variant?: 'panel' | 'modal' | 'popover'` — display mode (default: panel)
- `title?: string` — widget header title (default: "What's New")
- `triggerLabel?: string` — trigger button text (default: "What's New")
- `showCount?: boolean` — show count badge on trigger (default: true)
- `markAllLabel?: string` — mark all button text (default: "Mark all as read")
- `showMarkAll?: boolean` — show mark all button (default: true)
- `emptyLabel?: string` — text when no features (default: "You're all caught up!")
- `maxHeight?: string` — max feed height (default: "400px")
- `analytics?: AnalyticsCallbacks` — component-level analytics
- `className?: string` — additional CSS class
- `style?: CSSProperties` — inline styles
- `theme?: FeatureDropThemeInput` — component-scoped theme preset or overrides
- `renderEntry?: (props) => ReactNode` — custom entry renderer
- `renderTrigger?: (props) => ReactNode` — custom trigger renderer
- `showReactions?: boolean` — render per-entry reaction controls
- `reactions?: string[]` — emoji/labels for reactions (default: 👍 ❤️ 🎉 👀 👎)
- `onReaction?: (feature, reaction, counts) => void` — reaction persisted callback
- `children?: (props) => ReactNode` — headless render prop

Accessibility defaults:
- Trigger exposes `aria-haspopup="dialog"` + `aria-expanded`
- Escape closes the widget
- Focus is trapped while open and returned to trigger on close
- Count updates are announced via a polite live region

**Styling:**

```css
[data-featuredrop-widget] {
  --featuredrop-panel-width: 380px;
  --featuredrop-modal-width: 480px;
  --featuredrop-widget-bg: #ffffff;
  --featuredrop-widget-radius: 12px;
  --featuredrop-widget-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  --featuredrop-widget-padding: 16px;
  --featuredrop-border-color: #e5e7eb;
  --featuredrop-title-size: 16px;
  --featuredrop-title-color: #111827;
  --featuredrop-entry-title-size: 14px;
  --featuredrop-entry-desc-size: 13px;
  --featuredrop-cta-bg: #3b82f6;
  --featuredrop-cta-color: #ffffff;
  --featuredrop-mark-all-color: #3b82f6;
  --featuredrop-trigger-bg: #ffffff;
  --featuredrop-trigger-border: #d1d5db;
  --featuredrop-badge-bg: #f59e0b;
  --featuredrop-badge-color: white;
}
```

---

### `ChangelogPage`

Full-page changelog route with filters, search, pagination, and deep links.

```tsx
import { ChangelogPage } from 'featuredrop/react'

<ChangelogPage
  pageSize={20}
  pagination="load-more" // 'load-more' | 'infinite-scroll' | 'numbered'
  showFilters
  showSearch
  showReactions
/>
```

Props:
- `pageSize?: number` — entries per page (default 20)
- `pagination?: 'infinite-scroll' | 'load-more' | 'numbered'` (default: load-more)
- `showFilters?: boolean` — category/type pills (default: true)
- `showSearch?: boolean` — fuzzy search label+description (default: true)
- `categories?: string[]` — optional category list (auto-detected if omitted)
- `emptyState?: ReactNode` — custom empty UI
- `renderEntry?: (entry, index) => ReactNode` — headless mode
- `formatDate?: (iso: string) => string` — custom date formatter
- `basePath?: string` — base for deep links / sharing (defaults to current path in browser)
- `manifest?: FeatureManifest` — override manifest (otherwise uses provider manifest)
- `className?: string` — additional CSS class for page root
- `style?: CSSProperties` — inline styles for page root
- `theme?: FeatureDropThemeInput` — component-scoped theme preset or overrides
- `showReactions?: boolean` — render per-entry reaction controls
- `reactions?: string[]` — emoji/labels for reactions (default: 👍 ❤️ 🎉 👀 👎)
- `onReaction?: (entry, reaction, counts) => void` — reaction persisted callback

Accessibility defaults:
- Skip-link included (`Skip to changelog entries`)
- Arrow up/down keyboard navigation across rendered entries

---

### `Tour`

Guided multi-step product tours with persistence and keyboard support.

```tsx
import { Tour } from 'featuredrop/react'

<Tour
  id="onboarding"
  steps={[
    { id: 'a', target: '#nav', title: 'Navigation', content: 'Use this menu to move around' },
    { id: 'b', target: '#search', title: 'Search', content: 'Find anything quickly' },
  ]}
  persistence
  keyboard
  showProgress
/>
```

Props:
- `id: string` — unique tour identifier
- `steps: TourStep[]` — ordered steps with selector/ref targets
- `onComplete?: () => void`
- `onSkip?: (stepId: string) => void`
- `onTourStarted?: () => void`
- `onTourCompleted?: () => void`
- `onTourSkipped?: (stepId: string) => void`
- `onStepViewed?: (step, index) => void`
- `overlay?: boolean` — dim backdrop (default: true)
- `showProgress?: boolean` — "Step n of m" (default: true)
- `keyboard?: boolean` — arrows + escape support (default: true)
- `persistence?: boolean` — resume via localStorage (default: true)
- `children?: (props) => ReactNode` — headless render prop

Accessibility defaults:
- Uses a dialog role with `aria-labelledby` / `aria-describedby`
- Focus is trapped while active and returns to prior focused element on close
- Supports Escape to skip and arrow-key navigation when `keyboard` is enabled
- Progress text uses `aria-live="polite"`

---

### `Checklist`

Onboarding task list widget with progress and persistence.

```tsx
import { Checklist } from 'featuredrop/react'

<Checklist
  id="getting-started"
  tasks={[
    { id: 'profile', title: 'Complete your profile' },
    { id: 'invite', title: 'Invite teammates', estimatedTime: '2 min' },
  ]}
  position="bottom-right"
  showProgress
/>
```

Props:
- `id: string` — unique checklist identifier
- `tasks: ChecklistTask[]`
- `position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'inline'`
- `collapsible?: boolean` — allow collapse/expand (default: true)
- `showProgress?: boolean` — progress bar and counters (default: true)
- `onComplete?: () => void`
- `dismissible?: boolean` — allow dismissing widget (default: true)
- `actionHandlers?: Record<string, () => void>` — callback map for `action.type = 'callback'`
- `children?: (props) => ReactNode` — headless render prop

---

### `FeedbackWidget`

Inline feedback form with optional emoji and screenshot capture.

```tsx
import { FeedbackWidget } from 'featuredrop/react'

<FeedbackWidget
  featureId="ai-journal"
  onSubmit={async (payload) => {
    await fetch('/api/feedback', { method: 'POST', body: JSON.stringify(payload) })
  }}
  showEmoji
  showScreenshot
  rateLimit="1-per-feature"
/>
```

Props:
- `featureId?: string`
- `onSubmit: (payload: FeedbackPayload) => Promise<void> | void`
- `showScreenshot?: boolean` — enables screenshot capture button
- `showEmoji?: boolean` — thumbs/heart/reaction quick input
- `rateLimit?: 'none' | '1-per-feature' | '1-per-session'`
- `categories?: string[]` — feedback category options
- `metadata?: Record<string, unknown>`
- `screenshotCapture?: () => Promise<Blob | null | undefined>` — custom capture implementation
- `children?: (props) => ReactNode` — headless render prop

Accessibility defaults:
- Trigger exposes dialog linkage (`aria-haspopup`, `aria-expanded`, `aria-controls`)
- Panel uses dialog semantics and supports Escape to close
- Selected emoji button is exposed with `aria-pressed`
- Success and error states are exposed via status/alert semantics

---

### `Survey`

NPS/CSAT/CES/custom survey component with trigger rules and ask-later cooldown.

```tsx
import { Survey } from 'featuredrop/react'

<Survey
  id="nps-main"
  type="nps"
  prompt="How likely are you to recommend us?"
  onSubmit={saveSurvey}
  triggerRules={{
    minDaysSinceSignup: 7,
    signupAt: user.createdAt,
    sampleRate: 0.25,
    maxFrequencyDays: 30,
  }}
/>
```

Props:
- `id: string` — unique survey identifier
- `type: 'nps' | 'csat' | 'ces' | 'custom'`
- `prompt?: string`
- `questions?: SurveyQuestion[]` — required for `type="custom"`
- `trigger?: 'auto' | 'manual'` — default: `auto`
- `triggerRules?: SurveyTriggerRules`
  - `signupAt?: string | Date`
  - `minDaysSinceSignup?: number`
  - `featureUsageIds?: string[]`
  - `pageMatch?: string | RegExp | ((path: string) => boolean)`
  - `sampleRate?: number` (0-1)
  - `askLaterCooldownDays?: number` (default: 7)
  - `maxFrequencyDays?: number` (default: 30)
- `showAskLater?: boolean` — default: true
- `featureId?: string` — attached to `survey_submitted` analytics payload
- `metadata?: Record<string, unknown>`
- `onSubmit: (payload: SurveyPayload) => Promise<void> | void`
- `children?: (props) => ReactNode` — headless render prop

Accessibility defaults:
- Panel uses dialog semantics (`role="dialog"`, label/description wiring)
- Focus is trapped while open and Escape closes
- Score and single-choice options expose pressed state with `aria-pressed`

---

### `FeatureRequestButton`

Per-feature upvote button with one-vote-per-user persistence.

```tsx
import { FeatureRequestButton } from 'featuredrop/react'

<FeatureRequestButton
  featureId="dark-mode"
  requestTitle="Dark mode"
  onVote={({ voted, request }) => {
    console.log(voted, request.votes)
  }}
/>
```

Props:
- `featureId: string`
- `requestId?: string` — target existing request directly
- `requestTitle?: string` — fallback title when creating missing record
- `label?: string` — default: `"Vote"`
- `onVote?: ({ voted, request }) => void`
- `children?: (props) => ReactNode` — headless render prop

---

### `FeatureRequestForm`

Collect structured requests and render a sortable request list.

```tsx
import { FeatureRequestForm } from 'featuredrop/react'

<FeatureRequestForm
  categories={['UI', 'Performance', 'Integration', 'Other']}
  defaultSort="votes"
  onSubmit={async (request) => saveRequest(request)}
  onWebhook={async (request) => pushToLinear(request)}
/>
```

Props:
- `categories?: string[]`
- `defaultSort?: 'votes' | 'recent'`
- `metadata?: Record<string, unknown>`
- `onSubmit?: (request: FeatureRequestPayload) => Promise<void> | void`
- `onWebhook?: (request: FeatureRequestPayload) => Promise<void> | void`
- `children?: (props) => ReactNode` — headless render prop

---

### `Hotspot` + `TooltipGroup`

Contextual helper beacons with frequency control.

```tsx
import { Hotspot, TooltipGroup } from 'featuredrop/react'

<TooltipGroup maxVisible={1}>
  <Hotspot id="export-hint" target="#export-btn" type="new" frequency="once">
    Export supports CSV, PDF, and Excel.
  </Hotspot>
</TooltipGroup>
```

`Hotspot` props:
- `id: string`
- `target: string` — CSS selector
- `type?: 'info' | 'new' | 'help'` (default: `info`)
- `frequency?: 'once' | 'every-session' | 'always'` (default: `once`)
- `children: ReactNode` — tooltip content

Accessibility defaults:
- Beacon exposes dialog linkage (`aria-haspopup`, `aria-expanded`, `aria-controls`)
- Tooltip uses dialog semantics for interactive content
- Escape closes tooltip and returns focus to beacon

`TooltipGroup` props:
- `maxVisible?: number` — cap concurrent tooltips (default: 3)

---

### `AnnouncementModal`

Modal announcements with priority-based auto trigger, slide carousel, and media support.

```tsx
import { AnnouncementModal } from 'featuredrop/react'

<AnnouncementModal
  feature={criticalFeature}
  trigger="auto"
  frequency="once"
  slides={[
    { title: 'Big release', description: 'Welcome to v2' },
    { title: 'Watch demo', videoUrl: 'https://youtu.be/abc123xyz' },
  ]}
/>
```

Props:
- `id?: string` — override persistence key (defaults to feature id)
- `featureId?: string` — resolve feature from provider
- `feature?: FeatureEntry` — direct feature object
- `trigger?: 'auto' | 'manual'` — auto opens critical items (default: `manual`)
- `defaultOpen?: boolean` — open immediately on mount
- `slides?: AnnouncementSlide[]` — optional multi-slide content
- `frequency?: 'once' | 'every-session' | 'always'` (default: `once`)
- `dismissible?: boolean` (default: true)
- `mobileBreakpoint?: number` — full-screen cutoff (default: 768)
- `onOpen?: () => void`
- `onDismiss?: () => void`
- `onPrimaryCtaClick?: (slide, index) => void`
- `onSecondaryCtaClick?: (slide, index) => void`
- `children?: (props) => ReactNode` — headless render prop

Accessibility defaults:
- Uses a modal dialog role with `aria-labelledby` / `aria-describedby`
- Focus is trapped while open and returns to prior focused element on close
- Escape dismisses when `dismissible` is true
- Left/Right arrows move between slides when multiple slides are present

---

### `SpotlightChain`

Lightweight chained spotlight flow (mini tours without overlay).

```tsx
import { SpotlightChain } from 'featuredrop/react'

<SpotlightChain
  steps={[
    { target: '#sidebar', content: 'New navigation' },
    { target: '#search', content: 'Global search is here' },
  ]}
  autoAdvance={false}
/>
```

Props:
- `steps: SpotlightChainStep[]`
- `startOnMount?: boolean` — begin immediately (default: true)
- `autoAdvance?: boolean` — move to next step automatically
- `autoAdvanceMs?: number` — fallback delay (default: 2500)
- `onComplete?: () => void`
- `onStepViewed?: (step, index) => void`
- `onSkip?: (step, index) => void`
- `children?: (props) => ReactNode` — headless render prop

Accessibility defaults:
- Active panel uses dialog semantics with label/description wiring
- Escape closes current chain and Right Arrow advances
- Focus is trapped while active
- Beacon pulse respects `prefers-reduced-motion`

---

### `Spotlight`

Pulsing beacon that attaches to any DOM element to spotlight a new feature.

```tsx
import { Spotlight } from 'featuredrop/react'

// With ref
const ref = useRef<HTMLButtonElement>(null)
<button ref={ref}>Analytics</button>
<Spotlight featureId="analytics-v2" targetRef={ref} />

// With CSS selector
<Spotlight featureId="analytics-v2" targetSelector="#analytics-btn" />

// Auto-dismiss after seeing
<Spotlight featureId="analytics-v2" targetRef={ref} autoDismiss autoDismissDelay={5000} />
```

**Headless mode:**

```tsx
<Spotlight featureId="analytics-v2" targetRef={ref}>
  {({ isActive, isTooltipOpen, openTooltip, dismiss }) => (
    isActive && <MyCustomBeacon onClick={openTooltip} />
  )}
</Spotlight>
```

Props:
- `featureId: string` — the feature ID to spotlight
- `targetRef?: RefObject<HTMLElement>` — ref to position beacon over
- `targetSelector?: string` — CSS selector for target element
- `placement?: 'top' | 'bottom' | 'left' | 'right'` — tooltip position (default: top)
- `beaconSize?: number` — beacon diameter in px (default: 12)
- `autoDismiss?: boolean` — auto-dismiss after tooltip seen (default: false)
- `autoDismissDelay?: number` — delay before auto-dismiss in ms (default: 5000)
- `tooltipContent?: ReactNode` — custom tooltip content
- `analytics?: AnalyticsCallbacks` — component-level analytics
- `className?: string` — additional CSS class
- `children?: (props) => ReactNode` — headless render prop

Accessibility defaults:
- Beacon exposes `aria-haspopup`, `aria-expanded`, and `aria-controls`
- Tooltip uses dialog semantics with label/description linkage
- Escape closes tooltip and returns focus to beacon
- Pulse animation disables automatically when `prefers-reduced-motion: reduce`

**Styling:**

```css
[data-featuredrop-spotlight] {
  --featuredrop-beacon-color: #f59e0b;
  --featuredrop-tooltip-bg: #ffffff;
  --featuredrop-tooltip-radius: 8px;
  --featuredrop-tooltip-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
  --featuredrop-tooltip-max-width: 260px;
  --featuredrop-tooltip-padding: 12px 16px;
}
```

---

### `Banner`

Announcement banner for major features or important notices.

```tsx
import { Banner } from 'featuredrop/react'

<Banner featureId="v2-launch" variant="announcement" />
<Banner featureId="breaking-change" variant="warning" />
<Banner featureId="update" variant="info" position="fixed" />
<Banner featureId="success" variant="success" position="inline" />
```

**Headless mode:**

```tsx
<Banner featureId="v2-launch">
  {({ feature, isActive, dismiss }) => (
    isActive && <MyBanner>{feature?.label} <button onClick={dismiss}>x</button></MyBanner>
  )}
</Banner>
```

Props:
- `featureId: string` — the feature ID to show as banner
- `variant?: 'info' | 'success' | 'warning' | 'announcement'` — visual style (default: announcement)
- `dismissible?: boolean` — show close button (default: true)
- `position?: 'sticky' | 'inline' | 'fixed'` — positioning (default: sticky)
- `analytics?: AnalyticsCallbacks` — component-level analytics
- `className?: string` — additional CSS class
- `style?: CSSProperties` — inline styles
- `children?: (props) => ReactNode` — headless render prop

**Styling:**

```css
[data-featuredrop-banner] {
  --featuredrop-banner-padding: 10px 16px;
  --featuredrop-banner-font-size: 14px;
  --featuredrop-banner-info-bg: #eff6ff;
  --featuredrop-banner-success-bg: #f0fdf4;
  --featuredrop-banner-warning-bg: #fffbeb;
  --featuredrop-banner-announce-bg: #faf5ff;
}
```

---

### `Toast`

Stackable toast notifications for feature announcements.

```tsx
import { Toast } from 'featuredrop/react'

// Show all new features as toasts
<Toast position="bottom-right" maxVisible={3} />

// Specific features only
<Toast featureIds={["ai-journal"]} autoDismissMs={5000} />

// Disable auto-dismiss
<Toast autoDismissMs={0} />
```

**Headless mode:**

```tsx
<Toast>
  {({ toasts, dismiss, dismissAll }) => (
    toasts.map(t => (
      <div key={t.id}>
        {t.label} <button onClick={() => dismiss(t.id)}>x</button>
      </div>
    ))
  )}
</Toast>
```

Props:
- `featureIds?: string[]` — specific features to toast (default: all new)
- `maxVisible?: number` — max simultaneous toasts (default: 3)
- `autoDismissMs?: number` — auto-dismiss delay in ms (default: 8000, 0 to disable)
- `position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center'` — screen position (default: bottom-right)
- `analytics?: AnalyticsCallbacks` — component-level analytics
- `className?: string` — additional CSS class
- `style?: CSSProperties` — inline styles
- `renderToast?: (props) => ReactNode` — custom toast renderer
- `children?: (props) => ReactNode` — headless render prop

Accessibility defaults:
- Toast container is a polite live region (`aria-live="polite"`)
- Each toast is announced with status semantics

**Styling:**

```css
[data-featuredrop-toast-container] {
  --featuredrop-toast-z-index: 10000;
  --featuredrop-toast-width: 340px;
  --featuredrop-toast-bg: #ffffff;
  --featuredrop-toast-radius: 10px;
  --featuredrop-toast-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
  --featuredrop-toast-border: #e5e7eb;
  --featuredrop-toast-padding: 12px 16px;
  --featuredrop-toast-title-size: 14px;
  --featuredrop-toast-desc-size: 13px;
  --featuredrop-toast-cta-color: #3b82f6;
}
```

---

## Preact (`featuredrop/preact`)

```ts
import {
  FeatureDropProvider,
  useFeatureDrop,
  useNewFeature,
  useNewCount,
  ChangelogWidget,
  ChangelogPage,
} from 'featuredrop/preact'
```

Current preact adapter is compat-based and reuses React bindings.
Use `preact/compat` aliases for `react` and `react-dom` in your app bundler config.

---

## Solid (`featuredrop/solid`)

```ts
import {
  FeatureDropProvider,
  useFeatureDrop,
  useNewFeature,
  useNewCount,
  useTabNotification,
  createFeatureDropStore,
} from 'featuredrop/solid'
```

Solid adapter ships signal-based hooks and provider bindings:
- `FeatureDropProvider`
- `useFeatureDrop()`
- `useNewFeature(sidebarKey)`
- `useNewCount()`
- `useTabNotification(options?)`
- `createFeatureDropStore(options)` for headless signal stores

---

## Web Components (`featuredrop/web-components`)

```ts
import {
  configureFeatureDropWebComponents,
  registerFeatureDropWebComponents,
  refreshFeatureDropWebComponents,
} from 'featuredrop/web-components'
```

Usage:
- `configureFeatureDropWebComponents({ manifest, storage?, userContext?, matchAudience?, appVersion? })`
- `registerFeatureDropWebComponents({ badgeTag?, changelogTag? })`
- `refreshFeatureDropWebComponents()` to force rerender after external state changes

Default tags:
- `<feature-drop-badge sidebar-key="..."></feature-drop-badge>`
- `<feature-drop-changelog></feature-drop-changelog>`

---

## Angular (`featuredrop/angular`)

```ts
import { createFeatureDropService, FeatureDropService } from 'featuredrop/angular'
```

Angular adapter exposes a signal-compatible service layer:
- `createFeatureDropService({ manifest, storage, createSignal, ... })`
- `FeatureDropService` class wrapper over the same service API

`createSignal` should be compatible with Angular's `signal()` behavior
(`() => value` getter plus `.set(value)` mutator).

---

## Vue (`featuredrop/vue`)

```ts
import {
  FeatureDropProvider,
  useFeatureDrop,
  useNewFeature,
  useNewCount,
  useTabNotification,
  NewBadge,
  ChangelogWidget,
  Spotlight,
  Banner,
  Toast,
} from 'featuredrop/vue'
```

Provider props match React provider (`manifest`, `storage`, `analytics`, `userContext`, `matchAudience`, `appVersion`).

---

## Svelte (`featuredrop/svelte`)

```ts
import {
  createFeatureDropStore,
  createNewCountStore,
  createNewFeatureStore,
  attachTabNotification,
} from 'featuredrop/svelte'
```

Current Svelte entry ships store-based bindings:
- `createFeatureDropStore({ manifest, storage, userContext?, matchAudience?, appVersion? })`
- `createNewCountStore(store)`
- `createNewFeatureStore(store, sidebarKey)`
- `attachTabNotification(store, options?)`
