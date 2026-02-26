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

<FeatureDropProvider manifest={FEATURES} storage={storage}>
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
| `<NewBadge />` | Headless badge: `pill`, `dot`, or `count` variant |
| `<ChangelogWidget />` | Full changelog feed with trigger button |
| `<Spotlight />` | Pulsing beacon attached to DOM elements |
| `<Banner />` | Announcement banner with variants |
| `<Toast />` | Stackable toast notifications |

**Analytics integration:**

```tsx
<FeatureDropProvider
  manifest={FEATURES}
  storage={storage}
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
| Spotlight/beacon | Yes | - | - | - | - |
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
| Vue 3 | Planned | `featuredrop/vue` |
| Svelte 5 | Planned | `featuredrop/svelte` |

## Documentation

- [API Reference](docs/API.md) — All functions, adapters, hooks, components
- [Architecture](docs/ARCHITECTURE.md) — Three-check algorithm, cross-device sync, custom adapters
- [Next.js Example](examples/nextjs/) — Full App Router integration
- [Vanilla Example](examples/vanilla/) — Plain HTML, zero build step

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
