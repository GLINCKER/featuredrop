# FeatureDrop + Next.js + shadcn/ui Example

A full runnable example app demonstrating all 5 FeatureDrop [shadcn/ui registry components](https://featuredrop.dev/docs/shadcn).

## Stack

- **Next.js 15** (App Router)
- **shadcn/ui** (new-york style)
- **Tailwind CSS v4**
- **featuredrop** (npm)

## Quick Start

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## What's Included

All 5 registry components pre-installed in `components/featuredrop/`:

| Component | Description |
|-----------|-------------|
| **NewBadge** | Auto-expiring "New" badge powered by `useNewFeature()` |
| **ChangelogWidget** | Slide-out sheet with unread count and per-item dismiss |
| **FeedbackWidget** | Dialog feedback form with category select |
| **Tour** | Step-by-step product tour popover with progress |
| **Checklist** | Onboarding card with checkbox progress tracking |

## Try It Online

- [Open in StackBlitz](https://stackblitz.com/github/GLINCKER/featuredrop/tree/main/examples/nextjs-shadcn)
- [Open in CodeSandbox](https://codesandbox.io/p/devbox/github/GLINCKER/featuredrop/tree/main/examples/nextjs-shadcn)

## How It Works

1. **`lib/features.ts`** — Feature manifest created with `createManifest()`
2. **`app/layout.tsx`** — `FeatureDropProvider` wraps the app with features + storage adapter
3. **`app/page.tsx`** — Demo page using all 5 components
4. **`components/featuredrop/`** — Registry components (what `npx shadcn@latest add` installs)
5. **`components/ui/`** — shadcn primitives used by the registry components

## Adding to Your Own Project

Instead of copying this example, install components directly:

```bash
npx shadcn@latest add https://featuredrop.dev/r/changelog-widget.json
npx shadcn@latest add https://featuredrop.dev/r/new-badge.json
npx shadcn@latest add https://featuredrop.dev/r/tour.json
npx shadcn@latest add https://featuredrop.dev/r/checklist.json
npx shadcn@latest add https://featuredrop.dev/r/feedback-widget.json
```

Components land in `components/featuredrop/` — you own the code.
