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

## Types

### `FeatureEntry`

```ts
interface FeatureEntry {
  id: string                    // Unique identifier
  label: string                 // Human-readable label
  description?: string          // Optional longer description (supports markdown in UI)
  releasedAt: string            // ISO date — when feature shipped
  showNewUntil: string          // ISO date — when badge auto-expires
  sidebarKey?: string           // Optional key to match nav items
  category?: string             // Optional grouping category
  url?: string                  // Optional link (docs, changelog)
  version?: string              // Optional version string
  type?: FeatureType            // 'feature' | 'improvement' | 'fix' | 'breaking'
  priority?: FeaturePriority    // 'critical' | 'normal' | 'low'
  image?: string                // Optional image/screenshot URL
  cta?: FeatureCTA              // Optional call-to-action button
  publishAt?: string            // ISO date — hidden until this date
  meta?: Record<string, unknown> // Arbitrary metadata
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

<FeatureDropProvider
  manifest={FEATURES}
  storage={storage}
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
- `analytics?: AnalyticsCallbacks` — optional analytics callbacks
- `children: ReactNode`

### `useFeatureDrop()`

Full feature discovery context. Throws if used outside provider.

```tsx
const {
  newFeatures,        // FeatureEntry[]
  newCount,           // number
  newFeaturesSorted,  // FeatureEntry[] — sorted by priority then date
  isNew,              // (sidebarKey: string) => boolean
  dismiss,            // (id: string) => void
  dismissAll,         // () => Promise<void>
  getFeature,         // (sidebarKey: string) => FeatureEntry | undefined
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
- `renderEntry?: (props) => ReactNode` — custom entry renderer
- `renderTrigger?: (props) => ReactNode` — custom trigger renderer
- `children?: (props) => ReactNode` — headless render prop

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
