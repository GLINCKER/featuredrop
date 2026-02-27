import { Hotspot, TooltipGroup } from 'featuredrop/react'
import { CodeDemoCard } from '../code-demo-card'

const HotspotView = Hotspot as any
const TooltipGroupView = TooltipGroup as any

const hotspotDemoCode = `import { Hotspot, TooltipGroup } from 'featuredrop/react'

export function HotspotDemo() {
  return (
    <TooltipGroup maxVisible={2}>
      <div id="docs-hotspot-editor">Editor panel</div>
      <div id="docs-hotspot-analytics">Analytics panel</div>
      <Hotspot id="editor-tip" target="#docs-hotspot-editor">Try markdown parser for release notes.</Hotspot>
      <Hotspot id="analytics-tip" target="#docs-hotspot-analytics">Track changelog engagement.</Hotspot>
    </TooltipGroup>
  )
}`

export function HotspotDemo() {
  return (
    <CodeDemoCard
      title="Hotspot demo"
      description="Attach contextual hints to specific UI targets."
      code={hotspotDemoCode}
    >
      <TooltipGroupView maxVisible={2}>
        <div className="grid gap-3 md:grid-cols-2">
          <div id="docs-hotspot-editor" className="rounded-xl border border-slate-300/60 bg-white/70 p-4 dark:border-slate-200/10 dark:bg-slate-900/40">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Release editor</p>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Draft and schedule feature entries.</p>
          </div>
          <div id="docs-hotspot-analytics" className="rounded-xl border border-slate-300/60 bg-white/70 p-4 dark:border-slate-200/10 dark:bg-slate-900/40">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Adoption analytics</p>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Measure opens, clicks, and completion rates.</p>
          </div>
        </div>
        <HotspotView id="editor-tip" target="#docs-hotspot-editor" type="new" frequency="always">
          Try markdown parser for release notes and keep each launch summary concise.
        </HotspotView>
        <HotspotView id="analytics-tip" target="#docs-hotspot-analytics" type="info" frequency="always">
          Track changelog engagement before adding more onboarding surfaces.
        </HotspotView>
      </TooltipGroupView>
    </CodeDemoCard>
  )
}
