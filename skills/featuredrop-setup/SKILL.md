---
name: featuredrop-setup
description: >
  Configure FeatureDrop product adoption toolkit in any project. Use when adding
  changelogs, feature badges, onboarding tours, checklists, hotspots, feedback
  widgets, or surveys to an application.
---

# FeatureDrop — Product Adoption Toolkit

Open-source, zero-dependency library for in-app feature discovery. < 3 kB core.

## Setup Pattern

1. `npm install featuredrop`
2. Create a JSON manifest: `[{ id, label, description, releasedAt, showNewUntil? }]`
3. Wrap root: `<FeatureDropProvider manifest={features} storage={new LocalStorageAdapter()}>`
4. Add components or use headless hooks.

## Imports (ALWAYS use subpath imports)

```ts
// Core (no React, no UI)
import { isNew, getNewFeatures, createManifest, LocalStorageAdapter } from 'featuredrop'

// React components (ready-made UI)
import { NewBadge, ChangelogWidget, Tour, Checklist, Banner, Toast } from 'featuredrop/react'

// Headless hooks (data + actions, no JSX — for custom design systems / shadcn)
import { useChangelog, useNewFeature, useNewCount, useTour, useChecklist } from 'featuredrop/react/hooks'

// Storage adapters
import { PostgresAdapter, RedisAdapter, IndexedDBAdapter, HybridAdapter } from 'featuredrop/adapters'

// Validation
import { validateManifest } from 'featuredrop/schema'

// Testing helpers
import { createMockManifest, createMockStorage, TestProvider } from 'featuredrop/testing'

// Tailwind plugin
import { featureDropPlugin } from 'featuredrop/tailwind'
```

## Hooks (prefer these for custom UI / shadcn projects)

| Hook | Returns |
|------|---------|
| `useNewFeature(id)` | `{ isNew, feature, dismiss }` |
| `useNewCount()` | `number` — unread badge count |
| `useChangelog()` | `{ features, newFeatures, newCount, dismiss, dismissAll, markAllSeen, getByCategory }` |
| `useTour(id)` | `{ currentStep, stepIndex, totalSteps, isActive, start, next, prev, skip, complete, goTo }` |
| `useChecklist(id)` | `{ tasks, completedCount, totalCount, progress, isComplete, completeTask, resetTask }` |
| `useSurvey(id)` | `{ isVisible, questions, submit, askLater, dismiss }` |
| `useFeatureDrop()` | Full provider context (features, count, dismiss, throttle controls, engine) |
| `useTabNotification()` | Browser tab title: `"(3) My App"` |

## Components (ready-made UI)

NewBadge, ChangelogWidget, ChangelogPage, Tour, Checklist, Spotlight, SpotlightChain,
Hotspot, TooltipGroup, Banner, Toast, AnnouncementModal, Survey, FeedbackWidget,
FeatureRequestButton, FeatureRequestForm

## Feature Manifest Format

```ts
{
  id: string              // unique identifier
  label: string           // display title
  description: string     // what changed
  releasedAt: string      // ISO date
  showNewUntil?: string   // ISO date — auto-expire badge
  category?: string       // group: "ui", "api", "billing"
  type?: string           // "feature" | "improvement" | "fix" | "deprecation"
  priority?: string       // "low" | "medium" | "high" | "critical"
  cta?: { label: string; url: string }
  audience?: Record<string, string[]>  // user segmentation
}
```

## Storage Adapters

Default: `LocalStorageAdapter` (browser). Server: `PostgresAdapter`, `RedisAdapter`.
Offline: `IndexedDBAdapter`. Hybrid: `HybridAdapter` (local + remote sync).
Custom: implement `{ getWatermark, setWatermark, getDismissedIds, addDismissedId }`.

## Provider Props

```tsx
<FeatureDropProvider
  manifest={features}             // required
  storage={adapter}               // required
  analytics={{ onFeatureSeen, onFeatureDismissed, onFeatureClicked }}
  userContext={{ plan, role, region }}  // for audience targeting
  appVersion="2.1.0"             // semver gating
  throttle={{ maxToastsPerSession: 3, modalCooldownMs: 120_000 }}
  locale="en"                    // i18n (en/es/fr/de/pt/zh-cn/ja/ko/ar/hi)
  animation="normal"             // "none" | "subtle" | "normal" | "playful"
  engine={engineInstance}         // optional: FeatureDropEngine for smart delivery
/>
```

## Tailwind Integration

```ts
// tailwind.config.ts
import { featureDropPlugin } from 'featuredrop/tailwind'

export default {
  plugins: [featureDropPlugin({ prefix: 'fd' })],
}
// Adds: fd-badge, fd-badge-dot, fd-badge-count, fd-animate-pulse, fd-animate-fade-in
// CSS vars: --fd-new, --fd-changelog-bg, --fd-tour-bg (auto dark mode)
```

## Rules

- Always use subpath imports (`featuredrop/react`, not just `featuredrop`)
- Prefer hooks from `featuredrop/react/hooks` when the project uses shadcn, Radix, or custom design system
- Features auto-expire via `showNewUntil` — don't build manual expiry logic
- Zero production dependencies — don't add external deps
- TypeScript strict mode — no `any` types
- All components support headless mode via render props
- Core < 3 kB, React ~12 kB, fully tree-shakeable
