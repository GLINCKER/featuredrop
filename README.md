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
  <a href="#react">React</a> &bull;
  <a href="https://github.com/GLINCKER/featuredrop/blob/main/docs/API.md">API Docs</a> &bull;
  <a href="https://github.com/GLINCKER/featuredrop/blob/main/docs/ARCHITECTURE.md">Architecture</a>
</p>

---

## The Problem

Every SaaS ships features. Users miss them. You need "New" badges on sidebar items, but:

- **LaunchDarkly / PostHog** — Feature flags, not discovery badges. Overkill.
- **Beamer / Headway** — External widget, vendor lock-in, monthly fee.
- **Joyride / Shepherd.js** — Product tours, not persistent badges.
- **DIY** — You build it, forget expiry, badges stay forever. Users stop noticing.

## The Solution

**featuredrop** is a tiny library that answers one question: *"Should this feature show a 'New' badge right now?"*

```
npm install featuredrop          # 0 dependencies, < 2 kB
```

Three rules. That's it:

| Check | Source | Purpose |
|-------|--------|---------|
| Not expired? | `showNewUntil` date | Badges auto-disappear |
| After watermark? | Server timestamp | Cross-device "mark all seen" |
| Not dismissed? | localStorage | Instant per-feature dismiss |

## Quick Start

**1. Define features** (just an array of objects):

```ts
import { createManifest } from 'featuredrop'

export const FEATURES = createManifest([
  {
    id: 'ai-journal',
    label: 'AI Decision Journal',
    releasedAt: '2026-02-20T00:00:00Z',
    showNewUntil: '2026-03-20T00:00:00Z', // auto-expires in 30 days
    sidebarKey: '/journal',
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

const newFeatures = getNewFeatures(FEATURES, storage) // all new features
hasNewFeature(FEATURES, '/journal', storage)           // true/false for a nav item
```

Works with **any framework**. Zero React dependency for vanilla use.

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

**Build a "What's New" panel:**

```tsx
import { useFeatureDrop } from 'featuredrop/react'

function WhatsNew() {
  const { newFeatures, newCount, dismissAll } = useFeatureDrop()
  return (
    <div>
      <h2>What's New ({newCount})</h2>
      {newFeatures.map(f => (
        <div key={f.id}>
          <h3>{f.label}</h3>
          <p>{f.description}</p>
        </div>
      ))}
      <button onClick={dismissAll}>Mark all as seen</button>
    </div>
  )
}
```

**Three hooks, one component:**

| Export | What it does |
|--------|-------------|
| `useFeatureDrop()` | Full context: features, count, dismiss, dismissAll |
| `useNewFeature(key)` | Single nav item: `{ isNew, feature, dismiss }` |
| `useNewCount()` | Just the badge count |
| `<NewBadge />` | Headless badge: `pill`, `dot`, or `count` variant |

`NewBadge` uses CSS custom properties — works with Tailwind, CSS modules, or plain CSS. See [styling docs](docs/API.md#newbadge-styling).

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
              └───────┬───────┘
                      │
                 true / false
```

New users see everything (no watermark). Returning users only see features shipped since their last visit. Individual dismissals are instant (localStorage). "Mark all seen" syncs across devices (one server write).

Read the full [Architecture doc](docs/ARCHITECTURE.md) for cross-device sync flow and custom adapter patterns.

## Comparison

| | featuredrop | LaunchDarkly | Beamer | Joyride |
|---|:---:|:---:|:---:|:---:|
| Auto-expiring badges | Yes | - | - | - |
| Zero dependencies | Yes | - | - | - |
| Framework agnostic | Yes | Yes | - | - |
| React bindings | Yes | Yes | - | Yes |
| Cross-device sync | Yes | N/A | Yes | - |
| Per-feature dismiss | Yes | N/A | - | - |
| < 2 kB minzipped | Yes | - | - | - |
| TypeScript | Yes | Yes | - | Partial |
| Free & open source | Yes | - | Freemium | Yes |

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
