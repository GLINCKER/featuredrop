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
2. Current time is before `feature.showNewUntil`
3. Feature was released after `watermark` (or watermark is null)

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

## Types

### `FeatureEntry`

```ts
interface FeatureEntry {
  id: string              // Unique identifier
  label: string           // Human-readable label
  description?: string    // Optional longer description
  releasedAt: string      // ISO date — when feature shipped
  showNewUntil: string    // ISO date — when badge auto-expires
  sidebarKey?: string     // Optional key to match nav items
  category?: string       // Optional grouping category
  url?: string            // Optional link (docs, changelog)
  version?: string        // Optional version string
  meta?: Record<string, unknown>  // Arbitrary metadata
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

## React (`featuredrop/react`)

### `FeatureDropProvider`

Context provider. Wrap your app or subtree.

```tsx
import { FeatureDropProvider } from 'featuredrop/react'

<FeatureDropProvider manifest={FEATURES} storage={storage}>
  {children}
</FeatureDropProvider>
```

Props:
- `manifest: FeatureManifest` — your feature array
- `storage: StorageAdapter` — adapter instance
- `children: ReactNode`

### `useFeatureDrop()`

Full feature discovery context. Throws if used outside provider.

```tsx
const {
  newFeatures,   // FeatureEntry[]
  newCount,      // number
  isNew,         // (sidebarKey: string) => boolean
  dismiss,       // (id: string) => void
  dismissAll,    // () => Promise<void>
  getFeature,    // (sidebarKey: string) => FeatureEntry | undefined
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

**Tailwind override example:**

```tsx
<NewBadge className="!bg-blue-500/15 !text-blue-600" />
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
