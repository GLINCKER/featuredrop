# Architecture

## Overview

featuredrop uses a **hybrid watermark + localStorage** architecture to determine which features should show as "new" to each user.

## Core Concept: The Three-Check Algorithm

When checking if a feature should display a "New" badge, three conditions must ALL be true:

```
isNew(feature) = !dismissed AND !expired AND afterWatermark
```

### 1. Not Dismissed (Client-Side)

Individual feature dismissals are stored in `localStorage`. When a user clicks a "New" badge (or you call `dismiss(id)`), that feature ID is added to the dismissed set. This is:
- **Instant** — no server round-trip
- **Per-device** — dismissing on mobile doesn't affect desktop
- **Lightweight** — just a JSON array in localStorage

### 2. Not Expired (Time-Based)

Each feature has a `showNewUntil` ISO date. After this time, the badge automatically disappears — no user action needed, no cron job, no cleanup. Features naturally age out.

### 3. After Watermark (Server-Side)

The "watermark" is a server-side timestamp representing "the last time this user saw what's new." When `dismissAll()` is called, the watermark is updated on the server. This means:
- **Cross-device** — marking all as seen on desktop applies to mobile too
- **New user experience** — no watermark = all recent features show as new
- **Single DB write** — one timestamp update, not N feature updates

## Data Flow

```
┌──────────────────────────────────────────────────────────────┐
│                    Feature Manifest                          │
│                    (static, in code)                         │
│                                                              │
│  [{ id, label, releasedAt, showNewUntil, sidebarKey }, ...] │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                    StorageAdapter                            │
│                                                              │
│  ┌─────────────────────┐  ┌────────────────────────────┐    │
│  │  getWatermark()      │  │  getDismissedIds()          │   │
│  │  ← server timestamp  │  │  ← localStorage array       │   │
│  └─────────────────────┘  └────────────────────────────┘    │
│                                                              │
│  ┌─────────────────────┐  ┌────────────────────────────┐    │
│  │  dismiss(id)         │  │  dismissAll(now)             │   │
│  │  → localStorage      │  │  → server + clear localStorage│  │
│  └─────────────────────┘  └────────────────────────────┘    │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                    Core Functions                            │
│                                                              │
│  isNew()  →  single feature check                           │
│  getNewFeatures()  →  filter manifest                       │
│  hasNewFeature()  →  sidebar key check                      │
│  getNewFeatureCount()  →  badge count                       │
└──────────────────────────────────────────────────────────────┘
```

## StorageAdapter Contract

The `StorageAdapter` interface is the extension point. Built-in adapters:

### LocalStorageAdapter
- **Watermark**: Passed at construction (from server/API)
- **Dismissed IDs**: Read/write from `localStorage`
- **dismissAll**: Optional async callback for server update
- **SSR safe**: Checks for `window` before accessing `localStorage`

### MemoryAdapter
- **Watermark**: In-memory variable
- **Dismissed IDs**: In-memory `Set`
- **Use cases**: Testing, SSR, serverless functions

### Custom Adapters

Implement `StorageAdapter` for any persistence layer:
- Redis (server-side feature gating)
- IndexedDB (larger storage, async)
- React Native AsyncStorage
- Database-backed (full server-side)

## React Architecture

```
FeatureDropProvider
  │
  ├── manifest + storage → getNewFeatures()
  │
  ├── Context: { newFeatures, newCount, isNew, dismiss, dismissAll }
  │
  └── Children
       ├── useFeatureDrop()    — full context
       ├── useNewFeature(key)  — single nav item
       ├── useNewCount()       — badge count
       └── <NewBadge />        — headless component
```

The provider computes the initial state from `getNewFeatures(manifest, storage)`, then re-renders children when `dismiss()` or `dismissAll()` is called.

## Cross-Device Sync

```
Device A (laptop)                      Server
─────────────────                      ──────
User clicks "Mark all as seen"
  │
  ├── localStorage.clear()             watermark = now
  └── POST /api/mark-features-seen ──→ UPDATE users SET features_seen_at = $1
                                              │
Device B (phone)                              │
─────────────────                              │
User opens app                                │
  │                                           │
  ├── GET /api/me ←───────────────────────────┘
  │   { featuresSeenAt: "2026-02-25T..." }
  │
  └── new LocalStorageAdapter({ watermark: user.featuresSeenAt })
      → Features before watermark are hidden
      → Only truly new features show badges
```

## Bundle Architecture

```
featuredrop (npm package)
├── dist/
│   ├── index.js       ← ESM entry (core + adapters)
│   ├── index.cjs      ← CJS entry (core + adapters)
│   ├── index.d.ts     ← TypeScript types
│   ├── react.js       ← ESM entry (React bindings) — "use client"
│   ├── react.cjs      ← CJS entry (React bindings)
│   └── react.d.ts     ← React TypeScript types
```

Two subpath exports:
- `featuredrop` → core functions + adapters (zero deps)
- `featuredrop/react` → provider + hooks + NewBadge (peer dep: react)

Tree-shaking removes unused exports. The core entry has zero dependencies.
