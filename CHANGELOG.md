# Changelog

All notable changes to this project will be documented in this file.

## [2.0.0] - 2026-02-27

### Breaking Changes

- **Core barrel slimmed**: `src/index.ts` no longer re-exports bridges, CMS adapters, admin components, analytics, schema validation, or database adapters. Import these from their subpaths instead:
  - `featuredrop/bridges` — SlackBridge, DiscordBridge, etc.
  - `featuredrop/admin` — ManifestEditor, AudienceBuilder, etc.
  - `featuredrop/schema` — validateManifest, featureEntrySchema, etc.
  - `featuredrop/ci` — diffManifest, validateManifestForCI, etc.
  - `featuredrop/flags` — createFlagBridge, LaunchDarklyBridge, etc.
  - `featuredrop/analytics` — AnalyticsCollector, PostHogAdapter, etc.
- **Zod moved to optional peer dependency**: Only needed if you use `featuredrop/schema`. Core no longer requires it.

### Performance

- Core bundle reduced from 34.31 kB to 3.01 kB gzip (91% reduction)
- Strict bundle budgets enforced: core < 5 kB, react < 55 kB, vue < 10 kB, svelte < 5 kB
- Tree-shaking now works correctly — importing `isNew` from `featuredrop` pulls < 3 kB

### Documentation

- Added 6 framework adapter docs: Vue, Svelte, Solid, Preact, Angular, Web Components
- Redesigned landing page with 13 sections, live interactive demos, comparison table, animated stats
- Expanded release lifecycle, launch flow, admin components, and migration guide
- Component gallery upgraded with live demos, props tables, and install snippets
- Redesigned footer with 3-column layout
- Total docs pages: 57 (up from 48)

### Fixes

- Fixed README size claims (< 3 kB core, not < 2 kB)
- Fixed broken imports in README examples (subpath imports for analytics, CMS, renderer)
- Updated tagline to "The open-source product adoption toolkit"
- Added landing page comparison table vs Beamer and Pendo

## [1.3.0] - 2026-02-27

### Added

- Expanded docs site with live component demos
- Code demo cards with preview/code tabs
- 14 interactive component demos
- Docs analytics tracking
- SEO optimization with sitemap and robots.txt

## [1.2.0] - 2026-02-27

### Added

- Security audit script and CI checks
- Error boundaries for production resilience
- Accessibility testing with axe-core
- Schema validation with Zod
- Bundle budget monitoring

## [1.1.0] - 2026-02-26

### Added

- ChangelogWidget with Markdown support and emoji reactions
- Spotlight and SpotlightChain components
- Banner and Toast notification components
- Tour and Checklist onboarding components
- FeedbackWidget and Survey components
- Feature request voting widget
- useTabNotification hook
- 8 framework adapters: React, Vue, Svelte, Solid, Preact, Angular, Web Components, vanilla JS
- User segmentation with audience rules
- Feature flag bridges (LaunchDarkly, generic)
- Notification bridges (Slack, Discord, Email, Webhook, RSS)
- CMS adapters (Contentful, Sanity, Strapi, Notion, Markdown)
- Database adapters (Postgres, Redis, MySQL, MongoDB, SQLite, Supabase)
- Admin components (ManifestEditor, ScheduleCalendar, PreviewPanel, AudienceBuilder)
- CLI tooling (validate, doctor, build, diff)
- CI utilities for manifest validation
- Theme engine with presets
- Animation system with reduced-motion support
- Internationalization (i18n) support

## [1.0.0] - 2026-02-26

### Added

- Core engine: `isNew()`, `getNewFeatures()`, `getNewFeatureCount()`, `hasNewFeature()`, `getNewFeaturesSorted()`
- Watermark + dismissed IDs dual-layer newness model
- `MemoryAdapter` and `LocalStorageAdapter` storage adapters
- React bindings: `FeatureDropProvider`, `NewBadge`, `useFeatureDrop`, `useNewFeature`, `useNewCount`
- `createManifest()`, `getFeatureById()`, `getNewFeaturesByCategory()` helpers
- Full TypeScript types with zero `any`
- Dual ESM/CJS build with tsup
- 121 passing tests
- CI/CD with GitHub Actions
