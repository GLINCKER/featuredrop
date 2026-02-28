# FeatureDrop — Setup & Configuration Skill

## What it is
Open-source product adoption toolkit. Changelogs, badges, tours, checklists, feedback.
Zero dependencies. < 3 kB core. MIT licensed.

## Quick Setup
1. `npm install featuredrop`
2. Create features.json manifest
3. Wrap root in `<FeatureDropProvider manifest={features} storage={new LocalStorageAdapter()}>`
4. Drop components or use hooks

## Imports (ALWAYS use subpath imports)
```
featuredrop                — core functions (isNew, getNewFeatures, createManifest)
featuredrop/react          — components + hooks (NewBadge, ChangelogWidget, Tour, Checklist)
featuredrop/react/hooks    — headless hooks only (useChangelog, useTour, useChecklist, useNewFeature)
featuredrop/adapters       — storage (PostgresAdapter, RedisAdapter, IndexedDBAdapter, etc.)
featuredrop/schema         — Zod validation (featureEntrySchema, validateManifest)
featuredrop/testing        — test helpers (createMockManifest, createMockStorage, createTestProvider)
featuredrop/tailwind       — Tailwind plugin (featureDropPlugin)
```

## Hooks Reference (prefer these for custom UI)
```
useNewFeature(sidebarKey)  → { isNew, feature, dismiss }
useNewCount()              → number
useChangelog()             → { features, newFeatures, newCount, dismiss, dismissAll, markAllSeen, getByCategory }
useTour(id)                → { currentStep, stepIndex, totalSteps, isActive, start, next, prev, skip, complete }
useChecklist(id)           → { tasks, progress, isComplete, completeTask, resetChecklist }
useSurvey(id)              → { isOpen, show, hide, askLater, submitted, canShow }
useFeatureDrop()           → full provider context (low-level)
```

## Components (ready-made UI with headless render prop mode)
NewBadge, ChangelogWidget, ChangelogPage, Tour, Checklist, Spotlight, SpotlightChain,
Hotspot, TooltipGroup, Banner, Toast, AnnouncementModal, Survey, FeedbackWidget,
FeatureRequestButton, FeatureRequestForm

## Manifest Format
```json
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
```

## Storage Adapters
- LocalStorageAdapter (browser default, zero-config)
- MemoryAdapter (testing, SSR)
- IndexedDBAdapter (offline-first PWAs)
- PostgresAdapter, RedisAdapter, MySQLAdapter, MongoAdapter, SQLiteAdapter (server)
- SupabaseAdapter (Supabase with optional realtime)
- RemoteAdapter (HTTP API with retry + circuit breaker)
- HybridAdapter (local + remote with batched sync)

## Provider Props
```tsx
<FeatureDropProvider
  manifest={features}           // required: FeatureEntry[]
  storage={adapter}             // required: StorageAdapter
  userContext={{ plan, role }}   // optional: audience targeting
  analytics={{ onFeatureSeen }} // optional: event callbacks
  locale="en"                   // optional: i18n
  animation="normal"            // optional: "none" | "subtle" | "normal" | "playful"
  throttle={{ sessionCooldown: 5000 }} // optional: rate limiting
/>
```

## Common Patterns

### Using with shadcn/ui
```tsx
import { useChangelog } from 'featuredrop/react/hooks'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'

function MyChangelog() {
  const { newFeatures, newCount, dismiss, markAllSeen } = useChangelog()
  return (
    <Sheet onOpenChange={() => markAllSeen()}>
      <SheetTrigger>
        What's New {newCount > 0 && <Badge>{newCount}</Badge>}
      </SheetTrigger>
      <SheetContent>
        {newFeatures.map(f => (
          <div key={f.id} onClick={() => dismiss(f.id)}>
            <h3>{f.label}</h3>
            <p>{f.description}</p>
          </div>
        ))}
      </SheetContent>
    </Sheet>
  )
}
```

## Rules
- Always use subpath imports (never bare 'featuredrop' for React code)
- Prefer hooks over components when user has a custom design system
- Features auto-expire via showNewUntil — don't build manual expiry logic
- Zero production dependencies must be maintained
- TypeScript strict — no any types
