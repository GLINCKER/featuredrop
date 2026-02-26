# featuredrop — Next.js Example

This example shows how to integrate featuredrop with a Next.js 15 App Router application.

## Setup

```bash
npx create-next-app@latest my-app
cd my-app
npm install featuredrop
```

## Files

### `lib/features.ts` — Feature manifest

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
    category: 'ai',
  },
  {
    id: 'analytics-v2',
    label: 'Analytics Dashboard v2',
    description: 'Redesigned analytics with real-time charts.',
    releasedAt: '2026-02-25T00:00:00Z',
    showNewUntil: '2026-03-25T00:00:00Z',
    sidebarKey: '/analytics',
    category: 'core',
  },
])
```

### `providers/feature-drop-provider.tsx` — Client provider

```tsx
'use client'

import { FeatureDropProvider } from 'featuredrop/react'
import { LocalStorageAdapter } from 'featuredrop'
import { FEATURES } from '@/lib/features'
import { useMemo } from 'react'

export function FeatureDropClientProvider({
  featuresSeenAt,
  children,
}: {
  featuresSeenAt: string | null
  children: React.ReactNode
}) {
  const storage = useMemo(
    () =>
      new LocalStorageAdapter({
        watermark: featuresSeenAt,
        onDismissAll: async (now) => {
          await fetch('/api/mark-features-seen', {
            method: 'POST',
            body: JSON.stringify({ seenAt: now.toISOString() }),
          })
        },
      }),
    [featuresSeenAt],
  )

  return (
    <FeatureDropProvider manifest={FEATURES} storage={storage}>
      {children}
    </FeatureDropProvider>
  )
}
```

### `app/layout.tsx` — Root layout

```tsx
import { FeatureDropClientProvider } from '@/providers/feature-drop-provider'
import { getUser } from '@/lib/auth'

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser()

  return (
    <html lang="en">
      <body>
        <FeatureDropClientProvider featuresSeenAt={user?.featuresSeenAt ?? null}>
          <Sidebar />
          <main>{children}</main>
        </FeatureDropClientProvider>
      </body>
    </html>
  )
}
```

### `components/sidebar-item.tsx` — Sidebar with badges

```tsx
'use client'

import Link from 'next/link'
import { useNewFeature, NewBadge } from 'featuredrop/react'

export function SidebarItem({ path, label }: { path: string; label: string }) {
  const { isNew, dismiss } = useNewFeature(path)

  return (
    <Link href={path} onClick={() => isNew && dismiss()}>
      <span>{label}</span>
      {isNew && <NewBadge variant="pill" />}
    </Link>
  )
}
```

### `components/whats-new-panel.tsx` — Feature list

```tsx
'use client'

import { useFeatureDrop, NewBadge } from 'featuredrop/react'

export function WhatsNewPanel() {
  const { newFeatures, newCount, dismissAll } = useFeatureDrop()

  if (newCount === 0) return null

  return (
    <div>
      <div>
        <h2>What's New</h2>
        <NewBadge variant="count" count={newCount} />
      </div>
      {newFeatures.map((feature) => (
        <div key={feature.id}>
          <h3>{feature.label}</h3>
          <p>{feature.description}</p>
        </div>
      ))}
      <button onClick={dismissAll}>Mark all as seen</button>
    </div>
  )
}
```

## Key Points

- `FeatureDropProvider` uses `"use client"` — it wraps around Server Components fine
- `LocalStorageAdapter` is created client-side with the server watermark
- The `onDismissAll` callback makes a single API call to update the server watermark
- Individual dismissals stay in localStorage (zero server calls)
- `NewBadge` is styled via CSS custom properties — works with Tailwind, CSS modules, or plain CSS
