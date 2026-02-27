import { useMemo, useState } from 'react'
import { MemoryAdapter } from 'featuredrop'
import { FeatureDropProvider, FeedbackWidget } from 'featuredrop/react'
import { CodeDemoCard } from '../code-demo-card'
import { demoManifest } from './demo-manifest'

const FeatureDropProviderView = FeatureDropProvider as any
const FeedbackWidgetView = FeedbackWidget as any

const feedbackDemoCode = `import { MemoryAdapter } from 'featuredrop'
import { FeatureDropProvider, FeedbackWidget } from 'featuredrop/react'

export function FeedbackDemo() {
  return (
    <FeatureDropProvider manifest={manifest} storage={new MemoryAdapter()}>
      <FeedbackWidget
        featureId="usage-insights"
        onSubmit={async (payload) => sendToApi(payload)}
        rateLimit="1-per-session"
      />
    </FeatureDropProvider>
  )
}`

export function FeedbackDemo() {
  const [status, setStatus] = useState<string | null>(null)
  const storage = useMemo(() => new MemoryAdapter(), [])

  return (
    <CodeDemoCard
      title="Feedback widget demo"
      description="Collect contextual product feedback and route payloads to your own endpoint."
      code={feedbackDemoCode}
    >
      <FeatureDropProviderView manifest={demoManifest} storage={storage}>
        <FeedbackWidgetView
          featureId="usage-insights"
          rateLimit="1-per-session"
          categories={['bug', 'suggestion', 'praise']}
          onSubmit={async (payload: { category?: string }) => {
            setStatus(`Feedback sent (${payload.category || 'general'})`)
          }}
        >
          {({
            isOpen,
            open,
            close,
            text,
            setText,
            category,
            setCategory,
            submit,
            isSubmitting,
            error
          }: any) => (
            <div className="space-y-3">
              {!isOpen ? (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-300/60 bg-white/70 p-3 dark:border-slate-200/10 dark:bg-slate-900/40">
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Capture user feedback directly from release touchpoints.
                  </p>
                  <button className="fd-cta !px-3 !py-1.5 text-xs" type="button" onClick={open}>
                    Open feedback form
                  </button>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-300/60 bg-white/70 p-4 dark:border-slate-200/10 dark:bg-slate-900/40">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Feedback form</p>
                  <select
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                    className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm dark:border-slate-500 dark:bg-slate-900"
                  >
                    <option value="bug">Bug</option>
                    <option value="suggestion">Suggestion</option>
                    <option value="praise">Praise</option>
                  </select>
                  <textarea
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    rows={4}
                    placeholder="Tell us what is working or broken."
                    className="mt-3 w-full rounded-lg border border-slate-300 bg-white p-2 text-sm dark:border-slate-500 dark:bg-slate-900"
                  />
                  {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button className="fd-cta !px-3 !py-1.5 text-xs" type="button" onClick={submit} disabled={isSubmitting}>
                      Submit
                    </button>
                    <button className="fd-cta-secondary !px-3 !py-1.5 text-xs" type="button" onClick={close}>
                      Close
                    </button>
                  </div>
                </div>
              )}
              {status ? <p className="text-xs text-emerald-700 dark:text-emerald-300">{status}</p> : null}
            </div>
          )}
        </FeedbackWidgetView>
      </FeatureDropProviderView>
    </CodeDemoCard>
  )
}
