# featuredrop

**Lightweight feature discovery system. Show "New" badges that auto-expire.**

[![npm version](https://img.shields.io/npm/v/featuredrop)](https://www.npmjs.com/package/featuredrop)
[![license](https://img.shields.io/npm/l/featuredrop)](https://github.com/GLINCKER/featuredrop/blob/main/LICENSE)
[![bundle size](https://img.shields.io/bundlephobia/minzip/featuredrop)](https://bundlephobia.com/package/featuredrop)
[![CI](https://github.com/GLINCKER/featuredrop/actions/workflows/ci.yml/badge.svg)](https://github.com/GLINCKER/featuredrop/actions/workflows/ci.yml)

---

## Why featuredrop?

Every SaaS needs "New" badges on sidebar items when features ship. But most solutions are either too complex (LaunchDarkly), too coupled (Beamer), or don't actually expire.

**featuredrop** solves this with a dead-simple API:

- Define features in a manifest (just an array of objects)
- Badges auto-expire based on time windows
- Users can dismiss individually or "mark all as seen"
- Works with any framework — React bindings included
- Zero dependencies, < 2 kB minzipped

## Quick Start

### Install

```bash
npm install featuredrop
# or
pnpm add featuredrop
```

### 1. Define your feature manifest

```ts
import { createManifest } from 'featuredrop'

export const FEATURES = createManifest([
  {
    id: 'ai-journal',
    label: 'AI Decision Journal',
    description: 'Track decisions with AI-powered insights',
    releasedAt: '2026-02-20T00:00:00Z',
    showNewUntil: '2026-03-20T00:00:00Z',
    sidebarKey: '/journal',
    category: 'ai',
  },
  {
    id: 'analytics-v2',
    label: 'Analytics Dashboard v2',
    releasedAt: '2026-02-25T00:00:00Z',
    showNewUntil: '2026-03-25T00:00:00Z',
    sidebarKey: '/analytics',
  },
])
```

### 2. Create a storage adapter

```ts
import { LocalStorageAdapter } from 'featuredrop'

const storage = new LocalStorageAdapter({
  // Server-side watermark from user profile (e.g. user.featuresSeenAt)
  watermark: user.featuresSeenAt,
  // Optional: callback when user clicks "Mark all as seen"
  onDismissAll: async (now) => {
    await api.updateUser({ featuresSeenAt: now.toISOString() })
  },
})
```

### 3. Check what's new

```ts
import { getNewFeatures, hasNewFeature } from 'featuredrop'

// Get all new features
const newFeatures = getNewFeatures(FEATURES, storage)
console.log(`${newFeatures.length} new features!`)

// Check a specific sidebar item
if (hasNewFeature(FEATURES, '/journal', storage)) {
  showBadge('/journal')
}
```

## React Integration

```bash
# React is an optional peer dependency — only needed if you use featuredrop/react
npm install featuredrop react
```

### Wrap your app with the provider

```tsx
import { FeatureDropProvider } from 'featuredrop/react'
import { LocalStorageAdapter } from 'featuredrop'

const storage = new LocalStorageAdapter({
  watermark: user.featuresSeenAt,
  onDismissAll: (now) => api.markFeaturesSeen(now),
})

function App() {
  return (
    <FeatureDropProvider manifest={FEATURES} storage={storage}>
      <Sidebar />
    </FeatureDropProvider>
  )
}
```

### Use hooks in your components

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

### "What's New" panel

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

## How It Works

```
  Feature Manifest (static)     Storage Adapter
  ┌─────────────────────┐      ┌──────────────────────┐
  │ id: "ai-journal"    │      │ watermark: server     │
  │ releasedAt: Feb 20  │      │ dismissed: localStorage│
  │ showNewUntil: Mar 20│      └──────────┬───────────┘
  └─────────┬───────────┘                 │
            │                             │
            ▼                             ▼
       ┌─────────────────────────────────────┐
       │            isNew(feature)            │
       │                                     │
       │  1. Not dismissed?          ✓       │
       │  2. Before showNewUntil?    ✓       │
       │  3. Released after watermark? ✓     │
       │                                     │
       │  → Show "New" badge                 │
       └─────────────────────────────────────┘
```

**Three-check algorithm:**

1. **Dismissed?** — Has the user clicked to dismiss this specific feature? (client-side, per-device)
2. **Expired?** — Is the current time past `showNewUntil`? (automatic, no user action needed)
3. **After watermark?** — Was the feature released after the user's "features seen at" timestamp? (server-side, cross-device)

This hybrid approach means:
- New users see all recent features (no watermark = everything is new)
- Returning users only see features released since their last visit
- Individual dismissals are instant (localStorage, no server call)
- "Mark all as seen" syncs across devices (server watermark update)

## API Reference

### Core Functions

| Function | Description |
|----------|-------------|
| `isNew(feature, watermark, dismissedIds, now?)` | Check if a single feature is "new" |
| `getNewFeatures(manifest, storage, now?)` | Get all currently new features |
| `getNewFeatureCount(manifest, storage, now?)` | Get count of new features |
| `hasNewFeature(manifest, sidebarKey, storage, now?)` | Check if a sidebar key has new features |

### Helpers

| Function | Description |
|----------|-------------|
| `createManifest(entries)` | Create a frozen, typed manifest |
| `getFeatureById(manifest, id)` | Find a feature by ID |
| `getNewFeaturesByCategory(manifest, category, storage, now?)` | Filter new features by category |

### Adapters

| Adapter | Description |
|---------|-------------|
| `LocalStorageAdapter` | Browser localStorage + server watermark |
| `MemoryAdapter` | In-memory (testing, SSR) |

### React (`featuredrop/react`)

| Export | Description |
|--------|-------------|
| `FeatureDropProvider` | Context provider — wraps your app |
| `useFeatureDrop()` | Full context: `{ newFeatures, newCount, isNew, dismiss, dismissAll }` |
| `useNewFeature(key)` | Single item: `{ isNew, feature, dismiss }` |
| `useNewCount()` | Just the count number |
| `NewBadge` | Headless badge: `variant="pill" \| "dot" \| "count"` |

### NewBadge Styling

Zero CSS framework dependency. Style via CSS custom properties:

```css
/* In your global CSS or CSS-in-JS */
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

## Custom Storage Adapter

Implement the `StorageAdapter` interface for your persistence layer:

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

## Comparison

| Feature | featuredrop | LaunchDarkly | Beamer | Joyride |
|---------|------------|-------------|--------|---------|
| Auto-expiring badges | Yes | No | No | No |
| Zero dependencies | Yes | No | No | No |
| Framework agnostic | Yes | Yes | No | No |
| React bindings | Yes | Yes | No | Yes |
| Server watermark | Yes | N/A | Yes | No |
| Per-feature dismiss | Yes | N/A | No | No |
| < 2 kB bundle | Yes | No | No | No |
| TypeScript | Yes | Yes | No | Partial |
| Free & OSS | Yes | No | Freemium | Yes |

## License

MIT - [Glincker](https://glincker.com)

---

<p align="center">
  <strong>A <a href="https://glincker.com">GLINCKER</a> Open Source Project</strong>
</p>
