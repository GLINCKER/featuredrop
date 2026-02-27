import { useMemo } from 'react'
import { MemoryAdapter } from 'featuredrop'
import { FeatureDropProvider, Spotlight } from 'featuredrop/react'
import { CodeDemoCard } from '../code-demo-card'
import { demoManifest } from './demo-manifest'

const FeatureDropProviderView = FeatureDropProvider as any
const SpotlightView = Spotlight as any

const spotlightDemoCode = `import { Spotlight, FeatureDropProvider } from 'featuredrop/react'
import { MemoryAdapter } from 'featuredrop'

export function SpotlightDemo() {
  return (
    <FeatureDropProvider manifest={manifest} storage={new MemoryAdapter()}>
      <button id="spotlight-target">Adoption dashboard</button>
      <Spotlight featureId="usage-insights" targetSelector="#spotlight-target" />
    </FeatureDropProvider>
  )
}`

export function SpotlightDemo() {
  const storage = useMemo(() => new MemoryAdapter(), [])

  return (
    <CodeDemoCard
      title="Spotlight demo"
      description="Highlight one important action with a pulsing beacon and tooltip."
      code={spotlightDemoCode}
    >
      <FeatureDropProviderView manifest={demoManifest} storage={storage}>
        <div className="rounded-xl border border-slate-300/60 bg-white/70 p-4 dark:border-slate-200/10 dark:bg-slate-900/40">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Analytics workspace</p>
          <button
            id="docs-spotlight-target"
            type="button"
            className="mt-3 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 dark:border-slate-500 dark:bg-slate-900 dark:text-slate-200"
          >
            Adoption dashboard
          </button>
          <SpotlightView featureId="usage-insights" targetSelector="#docs-spotlight-target" placement="right" />
        </div>
      </FeatureDropProviderView>
    </CodeDemoCard>
  )
}
