import { useState } from 'react'
import { SpotlightChain } from 'featuredrop/react'
import { CodeDemoCard } from '../code-demo-card'

const SpotlightChainView = SpotlightChain as any

const spotlightChainDemoCode = `import { SpotlightChain } from 'featuredrop/react'

const steps = [
  { id: 'targeting', target: '#segment-target', title: 'Audience targeting', content: 'Define rollout segments.' },
  { id: 'measure', target: '#segment-measure', title: 'Measure', content: 'Track adoption and iterate.' }
]

export function SpotlightChainDemo() {
  return <SpotlightChain steps={steps} startOnMount />
}`

const steps = [
  {
    id: 'targeting',
    target: '#segment-target',
    title: 'Audience targeting',
    content: 'Define rollout segments before launch.'
  },
  {
    id: 'measure',
    target: '#segment-measure',
    title: 'Measure impact',
    content: 'Track interaction rates and update sequence timing.'
  }
]

export function SpotlightChainDemo() {
  const [instance, setInstance] = useState(0)

  return (
    <CodeDemoCard
      title="Spotlight chain demo"
      description="Sequence multiple spotlight hints across related actions."
      code={spotlightChainDemoCode}
    >
      <div className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          <div id="segment-target" className="rounded-xl border border-slate-300/60 bg-white/70 p-4 dark:border-slate-200/10 dark:bg-slate-900/40">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Segment builder</p>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Choose plan, role, and region constraints.</p>
          </div>
          <div id="segment-measure" className="rounded-xl border border-slate-300/60 bg-white/70 p-4 dark:border-slate-200/10 dark:bg-slate-900/40">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Impact metrics</p>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Compare completion and click-through rates.</p>
          </div>
        </div>
        <button
          type="button"
          className="fd-cta !px-3 !py-1.5 text-xs"
          onClick={() => setInstance((current) => current + 1)}
        >
          Restart spotlight chain
        </button>
      </div>
      <SpotlightChainView key={instance} steps={steps} startOnMount={instance > 0} />
    </CodeDemoCard>
  )
}
