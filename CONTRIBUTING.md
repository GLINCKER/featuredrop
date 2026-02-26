# Contributing to featuredrop

We welcome contributions! Whether it's a bug fix, new adapter, framework binding, or documentation improvement.

## Development Setup

```bash
# Fork and clone
git clone https://github.com/YOUR_USERNAME/featuredrop.git
cd featuredrop

# Install dependencies
pnpm install

# Run the full check suite
pnpm test        # 121 tests
pnpm typecheck   # TypeScript strict mode
pnpm build       # Dual ESM/CJS output
```

## Project Structure

```
src/
├── core.ts              # isNew, getNewFeatures, getNewFeaturesSorted
├── types.ts             # FeatureEntry, StorageAdapter, AnalyticsCallbacks
├── helpers.ts           # createManifest, getFeatureById, etc.
├── adapters/
│   ├── local-storage.ts # Browser localStorage + watermark
│   └── memory.ts        # In-memory (testing/SSR)
├── react/
│   ├── provider.tsx     # FeatureDropProvider (React context + analytics)
│   ├── context.ts       # Context type with sorted features
│   ├── hooks/
│   │   ├── use-feature-drop.ts      # Full context hook
│   │   ├── use-new-feature.ts       # Single nav item hook
│   │   ├── use-new-count.ts         # Badge count hook
│   │   └── use-tab-notification.ts  # Browser tab title hook
│   └── components/
│       ├── new-badge.tsx            # Headless badge (pill/dot/count)
│       ├── changelog-widget.tsx     # Changelog feed (panel/modal/popover)
│       ├── spotlight.tsx            # Pulsing beacon + tooltip
│       ├── banner.tsx               # Announcement banner
│       └── toast.tsx                # Stackable toast notifications
└── __tests__/           # Vitest test files (6 files, 121 tests)
```

**Two entry points:**
- `src/index.ts` → `featuredrop` (core, zero deps)
- `src/react/index.ts` → `featuredrop/react` (React bindings, hooks, components)

## Making Changes

1. **Branch** from `main`: `git checkout -b feat/my-feature`
2. **Write code** — TypeScript strict, no `any` types
3. **Add tests** — every new feature needs tests
4. **Run checks**: `pnpm test && pnpm typecheck && pnpm build`
5. **Commit** using [Conventional Commits](https://www.conventionalcommits.org/)
6. **Open PR** against `main`

## Commit Format

```
<type>(<scope>): <description>
```

| Type | Release Effect | Example |
|------|---------------|---------|
| `feat` | Minor (1.x.0) | `feat: add Vue composables` |
| `fix` | Patch (1.0.x) | `fix: handle null watermark in SSR` |
| `feat!` | Major (x.0.0) | `feat!: rename StorageAdapter methods` |
| `perf` | Patch | `perf: memoize getNewFeatures result` |
| `refactor` | Patch | `refactor: extract adapter base class` |
| `docs` | None | `docs: add Vue integration example` |
| `test` | None | `test: add SSR fallback tests` |
| `chore` | None | `chore: update dev dependencies` |

**Scopes** (optional): `core`, `react`, `adapters`, `ci`, `deps`

Commitlint enforces this format on PRs via CI.

## How Releases Work

Releases are **fully automated** via GitHub Actions:

1. PR merged to `main` with `feat:` or `fix:` commits
2. CI scans all commits since last tag for the highest-priority release type
3. Version bumped, npm published with OIDC provenance, GitHub Release created
4. Manual release: Actions → Auto Release → Run workflow

**No manual version bumping needed.** Just write good commit messages.

## Writing a Custom Adapter

Adapters implement the `StorageAdapter` interface:

```ts
import type { StorageAdapter } from 'featuredrop'

export class MyAdapter implements StorageAdapter {
  getWatermark(): string | null { /* ... */ }
  getDismissedIds(): ReadonlySet<string> { /* ... */ }
  dismiss(id: string): void { /* ... */ }
  async dismissAll(now: Date): Promise<void> { /* ... */ }
}
```

Key rules:
- `getWatermark()` and `getDismissedIds()` must be **synchronous**
- `dismissAll()` is the only async method (for server writes)
- Handle missing `window`/`localStorage` for SSR
- Return `new Set()` (not `null`) from `getDismissedIds()` when empty

## Adding Framework Bindings

Follow the React pattern in `src/react/`:

1. Create `src/<framework>/` directory
2. Add entry point in `tsup.config.ts`
3. Add subpath export in `package.json`
4. Framework should be an optional `peerDependency`
5. Add `"use client"` banner for SSR frameworks (handled in tsup config)
6. Write tests with the framework's testing library

## Testing Patterns

- **Core logic**: Pure functions, test with `makeFeature()` and `makeStorage()` helpers
- **Adapters**: Mock `localStorage` with `vi.stubGlobal`, test SSR by deleting `window`
- **React**: Use `@testing-library/react`, wrap components in test `FeatureDropProvider`

```bash
pnpm test              # Run all tests
pnpm test:watch        # Watch mode
pnpm test:coverage     # With coverage report
```

## Code Style

- TypeScript **strict mode** — no `any`, no `as` casts without justification
- Zero CSS framework coupling in components — use CSS custom properties
- `vitest` for all tests
- Keep imports from `featuredrop` (not relative paths) in framework bindings

## Reporting Issues

- Use the [bug report](https://github.com/GLINCKER/featuredrop/issues/new?template=bug_report.md) or [feature request](https://github.com/GLINCKER/featuredrop/issues/new?template=feature_request.md) templates
- Include reproduction steps and your environment (Node version, framework, browser)
- For security issues, email hello@glincker.com directly
