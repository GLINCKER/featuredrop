import { useMemo } from 'react'
import { MemoryAdapter } from 'featuredrop'
import { ChangelogPage, FeatureDropProvider } from 'featuredrop/react'
import { CodeDemoCard } from '../code-demo-card'
import { demoManifest } from './demo-manifest'

const FeatureDropProviderView = FeatureDropProvider as any
const ChangelogPageView = ChangelogPage as any

const changelogPageDemoCode = `import { MemoryAdapter } from 'featuredrop'
import { FeatureDropProvider, ChangelogPage } from 'featuredrop/react'

const storage = new MemoryAdapter()

export function ChangelogPageDemo() {
  return (
    <FeatureDropProvider manifest={manifest} storage={storage}>
      <ChangelogPage pageSize={3} showFilters showSearch pagination="load-more" />
    </FeatureDropProvider>
  )
}`

export function ChangelogPageDemo() {
  const storage = useMemo(() => new MemoryAdapter(), [])

  return (
    <CodeDemoCard
      title="Changelog page demo"
      description="Full release history with search, filters, and pagination."
      code={changelogPageDemoCode}
    >
      <FeatureDropProviderView manifest={demoManifest} storage={storage}>
        <div className="rounded-2xl border border-slate-300/50 bg-white/70 dark:border-slate-200/10 dark:bg-slate-900/45">
          <ChangelogPageView pageSize={3} showFilters showSearch pagination="load-more" />
        </div>
      </FeatureDropProviderView>
    </CodeDemoCard>
  )
}
