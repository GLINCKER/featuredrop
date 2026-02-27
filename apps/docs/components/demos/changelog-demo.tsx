import { useMemo } from 'react'
import { MemoryAdapter } from 'featuredrop'
import { ChangelogWidget, FeatureDropProvider, NewBadge, useNewCount } from 'featuredrop/react'
import { CodeDemoCard } from '../code-demo-card'
import { demoManifest } from './demo-manifest'

const FeatureDropProviderView = FeatureDropProvider as any
const ChangelogWidgetView = ChangelogWidget as any
const NewBadgeView = NewBadge as any

const changelogDemoCode = `import { MemoryAdapter } from 'featuredrop'
import { FeatureDropProvider, ChangelogWidget, NewBadge, useNewCount } from 'featuredrop/react'

const manifest = [/* ...feature entries... */]
const storage = new MemoryAdapter()

function HeaderBadge() {
  const count = useNewCount()
  return <NewBadge variant="count" show={count > 0} count={count} />
}

export function Demo() {
  return (
    <FeatureDropProvider manifest={manifest} storage={storage}>
      <HeaderBadge />
      <ChangelogWidget title="Product updates" />
    </FeatureDropProvider>
  )
}`

function HeaderBadge() {
  const count = useNewCount()
  return <NewBadgeView variant="count" show={count > 0} count={count} />
}

export function ChangelogDemo() {
  const storage = useMemo(() => new MemoryAdapter(), [])

  return (
    <CodeDemoCard
      title="FeatureDrop changelog widget"
      description="Interactive in-repo demo using the real FeatureDrop React components."
      code={changelogDemoCode}
    >
      <FeatureDropProviderView manifest={demoManifest} storage={storage}>
        <div className="w-full max-w-sm border-2 border-slate-900 bg-white p-5 shadow-[4px_4px_0_0_#0f172a] dark:border-slate-700 dark:bg-[#070b14] dark:shadow-[4px_4px_0_0_#000]">
          <div className="mb-4 flex items-center justify-between border-b-2 border-slate-900 pb-3 dark:border-slate-700">
            <p className="font-display font-bold uppercase tracking-tight text-slate-900 dark:text-slate-100">Dashboard</p>
            <HeaderBadge />
          </div>
          <p className="mb-6 font-body text-sm text-slate-600 dark:text-slate-400">
            Open the widget to inspect demo release notes and dismissal behavior.
          </p>
          <ChangelogWidgetView title="Product updates" triggerLabel="Open changelog" />
        </div>
      </FeatureDropProviderView>
    </CodeDemoCard>
  )
}
