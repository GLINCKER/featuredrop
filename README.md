<p align="center">
  <h1 align="center">featuredrop</h1>
  <p align="center">
    <strong>"New" badges that actually expire.</strong>
    <br />
    Lightweight feature discovery for SaaS sidebars, dashboards, and nav menus.
  </p>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/featuredrop"><img src="https://img.shields.io/npm/v/featuredrop?color=f59e0b&label=npm" alt="npm version"></a>
  <a href="https://bundlephobia.com/package/featuredrop"><img src="https://img.shields.io/bundlephobia/minzip/featuredrop?color=22c55e&label=size" alt="bundle size"></a>
  <a href="https://github.com/GLINCKER/featuredrop/actions/workflows/ci.yml"><img src="https://github.com/GLINCKER/featuredrop/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://github.com/GLINCKER/featuredrop/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/featuredrop?color=blue" alt="license"></a>
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> &bull;
  <a href="#components">Components</a> &bull;
  <a href="#react">React</a> &bull;
  <a href="https://github.com/GLINCKER/featuredrop/blob/main/docs/API.md">API Docs</a> &bull;
  <a href="https://github.com/GLINCKER/featuredrop/blob/main/docs/ARCHITECTURE.md">Architecture</a>
</p>

---

## The Problem

Every SaaS ships features. Users miss them. You need "New" badges on sidebar items, but:

- **LaunchDarkly / PostHog** — Feature flags, not discovery badges. Overkill.
- **Beamer / Headway** — External widget, vendor lock-in, $59-299/mo.
- **Joyride / Shepherd.js** — Product tours, not persistent badges.
- **DIY** — You build it, forget expiry, badges stay forever. Users stop noticing.

## The Solution

**featuredrop** is a free, self-hosted alternative to Beamer, Headway, and AnnounceKit. Zero deps, < 10 kB, headless-first.

```
npm install featuredrop          # 0 dependencies, < 2 kB core
```

```
┌─────────────────────────────────────────┐
│  ☰  My SaaS App                    🔔  │
├──────────┬──────────────────────────────┤
│          │                              │
│ Dashboard│   Welcome back, Sarah!       │
│          │                              │
│ Journal ●│   ┌─────────────────────┐    │
│          │   │  What's New (2)     │    │
│ Analytics│   │                     │    │
│     NEW  │   │  ★ AI Journal       │    │
│          │   │  Track decisions    │    │
│ Billing  │   │  with AI insights.  │    │
│          │   │       [Try it →]    │    │
│ Settings │   │                     │    │
│          │   │  ★ Analytics v2     │    │
│          │   │  Real-time charts   │    │
│          │   │  and CSV export.    │    │
│          │   │                     │    │
│          │   │  [Mark all as read] │    │
│          │   └─────────────────────┘    │
│          │                              │
└──────────┴──────────────────────────────┘

  ● = dot badge    NEW = pill badge    (2) = count badge
```

## Quick Start

**1. Define features** (just an array of objects):

```ts
import { createManifest } from 'featuredrop'

export const FEATURES = createManifest([
  {
    id: 'ai-journal',
    label: 'AI Decision Journal',
    description: 'Track decisions with AI-powered insights.',
    releasedAt: '2026-02-20T00:00:00Z',
    showNewUntil: '2026-03-20T00:00:00Z',
    sidebarKey: '/journal',
    type: 'feature',
    priority: 'critical',
    cta: { label: 'Try it', url: '/journal' },
  },
  {
    id: 'scheduled-reports',
    label: 'Scheduled Reports',
    releasedAt: '2026-02-23T00:00:00Z',
    showNewUntil: '2026-03-23T00:00:00Z',
    dependsOn: { clicked: ['ai-journal'] }, // progressive rollout
    trigger: { type: 'page', match: '/reports/*' }, // contextual trigger
  },
])
```

**2. Create a storage adapter:**

```ts
import { LocalStorageAdapter } from 'featuredrop'

const storage = new LocalStorageAdapter({
  watermark: user.featuresSeenAt, // from your server
  onDismissAll: (now) => api.markFeaturesSeen(now), // optional server sync
})
```

**3. Check what's new:**

```ts
import { getNewFeatures, hasNewFeature } from 'featuredrop'

const newFeatures = getNewFeatures(FEATURES, storage)
hasNewFeature(FEATURES, '/journal', storage) // true/false
```

Works with **any framework**. Zero React dependency for vanilla use.

## Adoption Analytics

Pipe structured adoption events to PostHog/Amplitude/Mixpanel/Segment or your own endpoint.

```ts
import { AnalyticsCollector, PostHogAdapter } from 'featuredrop'

const collector = new AnalyticsCollector({
  adapter: new PostHogAdapter(posthog),
  batchSize: 20,
  flushInterval: 10_000,
  sampleRate: 1,
})
```

```tsx
<FeatureDropProvider
  manifest={FEATURES}
  storage={storage}
  collector={collector}
>
  <App />
</FeatureDropProvider>
```

## A/B Announcement Variants

Run deterministic per-user announcement variants with weighted splits.

```ts
{
  id: 'ai-journal',
  label: 'AI Decision Journal',
  variants: {
    control: { description: 'Track decisions with AI-powered insights.' },
    treatment: { description: 'Never second-guess decisions again.' },
  },
  variantSplit: [50, 50],
}
```

```tsx
<FeatureDropProvider
  manifest={FEATURES}
  storage={storage}
  variantKey={user.id} // stable key for deterministic assignment
>
  <App />
</FeatureDropProvider>
```

## Theme Engine

Theme all featuredrop components with CSS variables (no CSS-in-JS runtime).

```tsx
import { ThemeProvider, ChangelogWidget } from 'featuredrop/react'

<ThemeProvider theme="dark">
  <ChangelogWidget />
</ThemeProvider>
```

```tsx
import { createTheme } from 'featuredrop'
import { ThemeProvider, ChangelogPage } from 'featuredrop/react'

const myTheme = createTheme({
  colors: { primary: '#7c3aed' },
  radii: { lg: '16px' },
})

<ThemeProvider theme={myTheme}>
  <ChangelogPage />
</ThemeProvider>
```

Presets: `light`, `dark`, `auto`, `minimal`, `vibrant`.
You can also pass `theme` directly to `ChangelogWidget` and `ChangelogPage` for component-scoped overrides.

## Internationalization

Use built-in locale packs or supply partial overrides:

```tsx
<FeatureDropProvider
  manifest={FEATURES}
  storage={storage}
  locale="fr"
  translations={{
    submit: 'Envoyer maintenant',
  }}
>
  <App />
</FeatureDropProvider>
```

Built-in locales: `en`, `es`, `fr`, `de`, `pt`, `zh-cn`, `ja`, `ko`, `ar`, `hi`.

## Changelog-as-Code

Manage announcements as markdown files in your repo and compile to a manifest:

```bash
npx featuredrop init --format markdown
npx featuredrop add --label "AI Journal" --category ai --description "Track decisions with AI."
npx featuredrop build --pattern "features/**/*.md" --out featuredrop.manifest.json
npx featuredrop validate --pattern "features/**/*.md"
npx featuredrop stats --pattern "features/**/*.md"
npx featuredrop doctor --pattern "features/**/*.md"
npx featuredrop generate-rss --pattern "features/**/*.md" --out featuredrop.rss.xml
npx featuredrop generate-changelog --pattern "features/**/*.md" --out CHANGELOG.generated.md
npx featuredrop migrate --from beamer --input beamer-export.json --out featuredrop.manifest.json
```

Example feature file:

```md
---
id: ai-journal
label: AI Journal
type: feature
category: ai
releasedAt: 2026-02-15T00:00:00Z
showNewUntil: 2026-03-15T00:00:00Z
cta:
  label: Try it now
  url: /journal
---
Track decisions and outcomes with AI-powered insights.
```

## Schema Validation

Validate manifest JSON in CI or tooling pipelines.

```ts
import {
  featureEntrySchema,
  featureEntryJsonSchema,
  validateManifest,
} from 'featuredrop/schema'

featureEntrySchema.parse({
  id: 'ai-journal',
  label: 'AI Journal',
  releasedAt: '2026-02-15T00:00:00Z',
  showNewUntil: '2026-03-15T00:00:00Z',
})

const result = validateManifest(data)
if (!result.valid) {
  throw new Error(result.errors.map((e) => `${e.path}: ${e.message}`).join("; "))
}

console.log(featureEntryJsonSchema.properties.id.type) // "string"
```

## Testing Utilities

Use `featuredrop/testing` to speed up unit and component tests.

```tsx
import { render, screen } from '@testing-library/react'
import { useNewCount } from 'featuredrop/react'
import { createMockManifest, createMockStorage, createTestProvider } from 'featuredrop/testing'

const manifest = createMockManifest([{ label: 'AI Journal', releasedAt: 'today', showNewUntil: '+14d' }])
const storage = createMockStorage()
const Wrapper = createTestProvider({ manifest, storage })

function Count() {
  return <span>{useNewCount()}</span>
}

render(<Count />, { wrapper: Wrapper })
expect(screen.getByText('1')).toBeInTheDocument()
```

## Playground & Online Demos

Use the lightweight component playground for quick UI iteration:

```bash
pnpm --dir examples/sandbox-react install
pnpm playground
pnpm playground:build
```

One-click editable demos:

- React sandbox source: `examples/sandbox-react`
- StackBlitz: https://stackblitz.com/github/GLINCKER/featuredrop/tree/main/examples/sandbox-react
- CodeSandbox: https://codesandbox.io/p/sandbox/github/GLINCKER/featuredrop/tree/main/examples/sandbox-react

## Components

Everything you'd expect from Beamer or Headway — but free, self-hosted, and headless-first.

### Changelog Widget

The #1 feature people install these tools for. Trigger button with unread count badge, slide-out panel with rich changelog feed.

```tsx
import { ChangelogWidget } from 'featuredrop/react'

// Default: slide-out panel with all features
<ChangelogWidget />

// Or modal / popover variant
<ChangelogWidget variant="modal" title="Release Notes" />

// Enable emoji reactions on entries
<ChangelogWidget showReactions />

// Fully headless
<ChangelogWidget>
  {({ isOpen, toggle, features, count, dismissAll }) => (
    <YourCustomUI />
  )}
</ChangelogWidget>
```

### Spotlight Beacon

Pulsing beacon that attaches to any DOM element. Click to see feature tooltip.

```tsx
import { Spotlight } from 'featuredrop/react'

const ref = useRef<HTMLButtonElement>(null)
<button ref={ref}>Analytics</button>
<Spotlight featureId="analytics-v2" targetRef={ref} />

// Or with CSS selector
<Spotlight featureId="analytics-v2" targetSelector="#analytics-btn" />
```

### Announcement Banner

Top-of-page or inline banner for major announcements. Auto-expires like badges.

```tsx
import { Banner } from 'featuredrop/react'

<Banner featureId="v2-launch" variant="announcement" />
<Banner featureId="breaking-change" variant="warning" />
<Banner featureId="security-fix" variant="info" position="fixed" />
```

### Toast Notifications

Brief popup notifications for new features. Auto-dismiss, stackable, configurable position.

```tsx
import { Toast } from 'featuredrop/react'

<Toast position="bottom-right" maxVisible={3} />

// Specific features only
<Toast featureIds={["ai-journal"]} autoDismissMs={5000} />
```

### Product Tours

Guided, multi-step onboarding with keyboard navigation and persistence.

```tsx
import { Tour, useTour } from 'featuredrop/react'

<Tour id="onboarding" steps={steps} />
const { startTour, nextStep, skipTour } = useTour('onboarding')
```

### Onboarding Checklist

Task-based onboarding that can trigger tours, links, or callbacks.

```tsx
import { Checklist, useChecklist } from 'featuredrop/react'

<Checklist id="getting-started" tasks={tasks} />
const { completeTask, progress } = useChecklist('getting-started')
```

### Feedback Widget

Collect lightweight in-app feedback with optional emoji and screenshots.

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

### Survey (NPS / CSAT / CES / Custom)

Run micro-surveys with trigger rules and imperative controls.

```tsx
import { Survey, useSurvey } from 'featuredrop/react'

<Survey
  id="nps-main"
  type="nps"
  prompt="How likely are you to recommend us?"
  triggerRules={{ minDaysSinceSignup: 7, signupAt: user.createdAt }}
  onSubmit={saveSurvey}
/>

const { show } = useSurvey('nps-main')
```

### Feature Request Voting

Capture and rank product requests with local persistence and optional webhook sync.

```tsx
import { FeatureRequestButton, FeatureRequestForm } from 'featuredrop/react'

<FeatureRequestButton featureId="dark-mode" requestTitle="Dark mode" />

<FeatureRequestForm
  categories={['UI', 'Performance', 'Integration', 'Other']}
  onSubmit={async (request) => {
    await fetch('/api/requests', { method: 'POST', body: JSON.stringify(request) })
  }}
/>
```

### Hotspots & Tooltips

Persistent contextual hints attached to specific UI targets.

```tsx
import { Hotspot, TooltipGroup } from 'featuredrop/react'

<TooltipGroup maxVisible={1}>
  <Hotspot id="export-help" target="#export-btn" frequency="once">
    Export supports CSV, PDF, and Excel.
  </Hotspot>
</TooltipGroup>
```

### Announcement Modal

Priority-based modal announcements with optional slide carousel.

```tsx
import { AnnouncementModal } from 'featuredrop/react'

<AnnouncementModal
  feature={criticalFeature}
  trigger="auto"
  frequency="once"
/>
```

### Spotlight Chain

Lightweight chained spotlights for "here are 3 new things" flows.

```tsx
import { SpotlightChain } from 'featuredrop/react'

<SpotlightChain
  steps={[
    { target: '#sidebar', content: 'New navigation' },
    { target: '#search', content: 'Global search' },
  ]}
/>
```

### NewBadge

Headless badge component with variants. Zero CSS framework dependency.

```tsx
import { NewBadge } from 'featuredrop/react'

<NewBadge />                          // "New" pill
<NewBadge variant="dot" />            // Pulsing dot
<NewBadge variant="count" count={3} /> // Count badge
```

### Tab Title Notification

Updates the browser tab title with unread count. Restores when all read.

```tsx
import { useTabNotification } from 'featuredrop/react'

useTabNotification() // "(3) My App"
useTabNotification({ template: "[{count} new] {title}", flash: true })
```

## React

```bash
npm install featuredrop react    # react is an optional peer dep
```

**Wrap your app:**

```tsx
import { FeatureDropProvider } from 'featuredrop/react'

<FeatureDropProvider manifest={FEATURES} storage={storage} appVersion="2.5.1">
  <App />
</FeatureDropProvider>
```

**Throttling + quiet mode:**

```tsx
<FeatureDropProvider
  manifest={FEATURES}
  storage={storage}
  throttle={{
    maxSimultaneousBadges: 3,
    maxSimultaneousSpotlights: 1,
    maxToastsPerSession: 3,
    minTimeBetweenModals: 30000,
    minTimeBetweenTours: 86400000,
    sessionCooldown: 5000,
    respectDoNotDisturb: true,
  }}
>
  <App />
</FeatureDropProvider>
```

**Add badges to your sidebar:**

```tsx
import { useNewFeature, NewBadge } from 'featuredrop/react'

function SidebarItem({ path, label }: { path: string; label: string }) {
  const { isNew, dismiss } = useNewFeature(path)
  return (
    <a href={path} onClick={() => isNew && dismiss()}>
      {label}
      {isNew && <NewBadge />}
    </a>
  )
}
```

**Or drop in the full changelog widget:**

```tsx
import { ChangelogWidget } from 'featuredrop/react'

<ChangelogWidget variant="panel" />
```

**Hooks & Components:**

| Export | What it does |
|--------|-------------|
| `useFeatureDrop()` | Full context: features, count, dismiss, dismissAll |
| `useNewFeature(key)` | Single nav item: `{ isNew, feature, dismiss }` |
| `useNewCount()` | Just the badge count |
| `useTabNotification()` | Updates browser tab title with count |
| `useTour(id)` | Imperative tour controls and current step snapshot |
| `useTourSequencer(sequence)` | Ordered multi-tour orchestration by feature readiness |
| `useChecklist(id)` | Imperative checklist controls + progress |
| `useSurvey(id)` | Imperative survey controls (`show`, `hide`, `askLater`) + state |
| `<NewBadge />` | Headless badge: `pill`, `dot`, or `count` variant |
| `<ChangelogWidget />` | Full changelog feed with trigger button + optional reactions |
| `<ChangelogPage />` | Full-page changelog with filters/search/pagination |
| `<Spotlight />` | Pulsing beacon attached to DOM elements |
| `<Banner />` | Announcement banner with variants |
| `<Toast />` | Stackable toast notifications |
| `<Tour />` | Multi-step guided product tour |
| `<Checklist />` | Onboarding task checklist |
| `<FeedbackWidget />` | In-app feedback form with category/emoji/screenshot support |
| `<Survey />` | NPS/CSAT/CES/custom survey engine with trigger rules |
| `<FeatureRequestButton />` | Per-feature voting button with persisted vote guard |
| `<FeatureRequestForm />` | Request capture form + sortable request list |
| `<Hotspot />` / `<TooltipGroup />` | Contextual tooltips with visibility caps |
| `<AnnouncementModal />` | Priority/frequency-gated modal announcements |
| `<SpotlightChain />` | Lightweight chained spotlight walkthrough |

`useFeatureDrop()` also exposes queue/throttle controls: `queuedFeatures`, `totalNewCount`, `quietMode`, `setQuietMode`, `markFeatureSeen`, `markFeatureClicked`, toast-slot helpers, modal/tour pacing checks, and spotlight slot controls.
It also exposes trigger runtime helpers: `trackUsageEvent`, `trackTriggerEvent`, `trackMilestone`, and `setTriggerPath`.

**Analytics integration:**

```tsx
<FeatureDropProvider
  manifest={FEATURES}
  storage={storage}
  appVersion="2.5.1" // optional semver for version-pinned features
  analytics={{
    onFeatureSeen: (f) => posthog.capture('feature_seen', { id: f.id }),
    onFeatureDismissed: (f) => posthog.capture('feature_dismissed', { id: f.id }),
    onFeatureClicked: (f) => posthog.capture('feature_clicked', { id: f.id }),
    onWidgetOpened: () => posthog.capture('changelog_opened'),
  }}
>
```

All components accept an optional `analytics` prop for component-level tracking too.

## How It Works

```
  Manifest (static)              Storage (runtime)
  ┌───────────────────┐         ┌──────────────────────┐
  │ releasedAt: Feb 20 │         │ watermark ← server   │
  │ showNewUntil: Mar 20│         │ dismissed ← localStorage│
  └────────┬──────────┘         └──────────┬───────────┘
           │                               │
           └──────────┐  ┌────────────────┘
                      ▼  ▼
              ┌───────────────┐
              │   isNew()     │
              │               │
              │ !dismissed    │
              │ !expired      │
              │ afterWatermark│
              │ afterPublishAt│
              └───────┬───────┘
                      │
                 true / false
```

New users see everything (no watermark). Returning users only see features shipped since their last visit. Individual dismissals are instant (localStorage). "Mark all seen" syncs across devices (one server write).

**Scheduled publishing**: Set `publishAt` to hide entries until a specific date — ship code now, reveal later.

**Priority sorting**: Critical features surface first in widgets and toasts. Priority levels: `critical`, `normal`, `low`.

**Entry types**: `feature`, `improvement`, `fix`, `breaking` — each with default icon/color in built-in components.

Read the full [Architecture doc](docs/ARCHITECTURE.md) for cross-device sync flow and custom adapter patterns.

## Comparison

| | featuredrop | Beamer | Headway | AnnounceKit | Canny |
|---|:---:|:---:|:---:|:---:|:---:|
| **Price** | **Free** | $59-399/mo | $49-249/mo | $79-299/mo | $79+ |
| Auto-expiring badges | Yes | - | - | - | - |
| Changelog widget | Yes | Yes | Yes | Yes | Yes |
| Product tours | Yes | - | - | - | - |
| Onboarding checklists | Yes | - | - | - | - |
| Spotlight/beacon | Yes | - | - | - | - |
| Hotspot tooltips | Yes | - | - | - | - |
| Announcement modal | Yes | - | - | - | - |
| Spotlight chaining | Yes | - | - | - | - |
| Toast notifications | Yes | - | - | - | - |
| Announcement banner | Yes | - | - | - | - |
| Tab title notification | Yes | - | - | - | - |
| Zero dependencies | Yes | - | - | - | - |
| Framework agnostic | Yes | - | - | - | - |
| React bindings | Yes | - | - | - | - |
| Headless mode | Yes | - | - | - | - |
| Cross-device sync | Yes | Yes | Yes | Yes | Yes |
| Per-feature dismiss | Yes | - | - | - | - |
| Scheduled publishing | Yes | Yes | Yes | Yes | - |
| Priority levels | Yes | - | - | - | - |
| Analytics callbacks | Yes | Built-in | Built-in | Built-in | Built-in |
| < 10 kB minzipped | Yes | - | - | - | - |
| Self-hosted | Yes | - | - | - | - |
| Open source | Yes | - | - | - | - |

## Framework Support

| Framework | Status | Import |
|-----------|--------|--------|
| React / Next.js | Stable | `featuredrop/react` |
| Vanilla JS | Stable | `featuredrop` |
| SolidJS | Preview | `featuredrop/solid` |
| Preact (compat) | Preview | `featuredrop/preact` |
| Web Components | Preview | `featuredrop/web-components` |
| Angular | Preview | `featuredrop/angular` |
| Vue 3 | Preview | `featuredrop/vue` |
| Svelte 5 | Preview (store bindings) | `featuredrop/svelte` |

## Documentation

- [API Reference](docs/API.md) — All functions, adapters, hooks, components
- [Architecture](docs/ARCHITECTURE.md) — Three-check algorithm, cross-device sync, custom adapters
- [Next.js Example](examples/nextjs/) — Full App Router integration
- [Vanilla Example](examples/vanilla/) — Plain HTML, zero build step
- [React Sandbox](examples/sandbox-react/) — Interactive local/online playground

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, commit conventions, and how releases work.

## License

MIT &copy; [Glincker](https://glincker.com)

---

<p align="center">
  <sub>Built and battle-tested at <a href="https://askverdict.ai">AskVerdict</a>.</sub>
  <br />
  <strong>A <a href="https://glincker.com">GLINCKER</a> open source project.</strong>
</p>
