import { FeatureRequestButton, FeatureRequestForm } from 'featuredrop/react'
import { CodeDemoCard } from '../code-demo-card'

const FeatureRequestButtonView = FeatureRequestButton as any
const FeatureRequestFormView = FeatureRequestForm as any

const featureRequestDemoCode = `import { FeatureRequestButton, FeatureRequestForm } from 'featuredrop/react'

export function FeatureRequestDemo() {
  return (
    <>
      <FeatureRequestButton featureId="usage-insights" requestTitle="Advanced segmentation filters" />
      <FeatureRequestForm />
    </>
  )
}`

export function FeatureRequestDemo() {
  return (
    <CodeDemoCard
      title="Feature request demo"
      description="Capture request ideas and let users vote on priorities."
      code={featureRequestDemoCode}
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-300/60 bg-white/70 p-4 dark:border-slate-200/10 dark:bg-slate-900/40">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Vote on roadmap item</p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
            Example request: advanced segmentation filters
          </p>
          <div className="mt-3">
            <FeatureRequestButtonView featureId="usage-insights" requestTitle="Advanced segmentation filters" />
          </div>
        </div>
        <FeatureRequestFormView />
      </div>
    </CodeDemoCard>
  )
}
