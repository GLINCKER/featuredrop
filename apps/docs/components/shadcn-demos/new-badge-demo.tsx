import { useMemo, useState } from 'react'
import { MemoryAdapter } from 'featuredrop'
import { FeatureDropProvider, useNewCount } from 'featuredrop/react'
import { useNewFeature } from 'featuredrop/react'
import { CodeDemoCard } from '../code-demo-card'
import { demoManifest } from '../demos/demo-manifest'

const FeatureDropProviderView = FeatureDropProvider as any

const demoCode = `import { NewBadge } from "@/components/featuredrop/new-badge"

export function Sidebar() {
  return (
    <nav>
      <a href="/analytics">
        Analytics <NewBadge featureKey="analytics" />
      </a>
      <a href="/settings">
        Settings <NewBadge featureKey="settings" label="Updated" />
      </a>
    </nav>
  )
}`

function BadgeItem({ featureKey, label, badgeLabel = 'New' }: { featureKey: string; label: string; badgeLabel?: string }) {
  const { isNew, dismiss } = useNewFeature(featureKey)

  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3 dark:border-slate-700">
      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{label}</span>
      {isNew && (
        <button
          type="button"
          onClick={dismiss}
          className="rounded-full bg-slate-900 px-2.5 py-0.5 text-xs font-medium text-white transition-colors hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
        >
          {badgeLabel}
        </button>
      )}
    </div>
  )
}

function DemoContent() {
  return (
    <div className="w-full max-w-xs space-y-2">
      <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Navigation</p>
      <BadgeItem featureKey="usage-insights" label="Usage Insights" />
      <BadgeItem featureKey="guided-rollouts" label="Guided Rollouts" badgeLabel="Updated" />
      <BadgeItem featureKey="security-audit" label="Security Audit" />
      <p className="pt-2 text-xs text-slate-500 dark:text-slate-400">Click a badge to dismiss it.</p>
    </div>
  )
}

export function NewBadgeShadcnDemo() {
  const storage = useMemo(() => new MemoryAdapter(), [])

  return (
    <CodeDemoCard
      title="New Badge (shadcn/ui)"
      description="Auto-expiring badge using useNewFeature() hook. Click to dismiss."
      code={demoCode}
    >
      <FeatureDropProviderView manifest={demoManifest} storage={storage}>
        <DemoContent />
      </FeatureDropProviderView>
    </CodeDemoCard>
  )
}
