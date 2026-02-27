import { Tour } from 'featuredrop/react'
import { CodeDemoCard } from '../code-demo-card'

const TourView = Tour as any

const tourDemoCode = `import { Tour } from 'featuredrop/react'

const steps = [
  { id: 'filters', target: '#tour-filters', title: 'Filters', content: 'Filter releases by type or audience.' },
  { id: 'history', target: '#tour-history', title: 'History', content: 'Review rollout history and user impact.' }
]

export function TourDemo() {
  return (
    <Tour id="docs-tour-demo" steps={steps} persistence={false}>
      {({ isActive, step, startTour, nextStep, prevStep, skipTour }) => (
        <div>{/* custom controls + preview canvas */}</div>
      )}
    </Tour>
  )
}`

const steps = [
  {
    id: 'filters',
    target: '#tour-filters',
    title: 'Filters',
    content: 'Filter releases by type or audience.'
  },
  {
    id: 'history',
    target: '#tour-history',
    title: 'History',
    content: 'Review rollout history and user impact.'
  }
]

export function TourDemo() {
  return (
    <CodeDemoCard
      title="Tour flow demo"
      description="Start a guided flow and navigate through tour steps with in-repo controls."
      code={tourDemoCode}
    >
      <TourView id="docs-tour-demo" steps={steps} persistence={false}>
        {({
          isActive,
          step,
          stepIndex,
          totalSteps,
          startTour,
          nextStep,
          prevStep,
          skipTour
        }: any) => (
          <div className="w-full max-w-lg space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div
                id="tour-filters"
                className={`border-2 p-4 transition-colors ${step?.id === 'filters' ? 'border-brand bg-brand/5 dark:bg-brand/10' : 'border-slate-900 bg-white dark:border-slate-700 dark:bg-[#070b14]'}`}
              >
                <p className="font-display font-bold uppercase tracking-tight text-slate-900 dark:text-slate-100">Release filters</p>
                <p className="mt-2 font-body text-xs text-slate-600 dark:text-slate-400">Category, type, and audience segments.</p>
              </div>
              <div
                id="tour-history"
                className={`border-2 p-4 transition-colors ${step?.id === 'history' ? 'border-brand bg-brand/5 dark:bg-brand/10' : 'border-slate-900 bg-white dark:border-slate-700 dark:bg-[#070b14]'}`}
              >
                <p className="font-display font-bold uppercase tracking-tight text-slate-900 dark:text-slate-100">Rollout history</p>
                <p className="mt-2 font-body text-xs text-slate-600 dark:text-slate-400">Recent launches, visibility, and adoption trends.</p>
              </div>
            </div>

            <div className="border-2 border-slate-900 bg-white p-5 shadow-[4px_4px_0_0_#0f172a] dark:border-slate-700 dark:bg-[#070b14] dark:shadow-[4px_4px_0_0_#000]">
              {isActive && step ? (
                <div>
                  <p className="font-body text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    Step {stepIndex + 1} of {totalSteps}
                  </p>
                  <p className="mt-2 font-display text-lg font-bold text-slate-900 dark:text-slate-100">{step.title}</p>
                  <p className="mt-2 font-body text-sm text-slate-600 dark:text-slate-300">{String(step.content)}</p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <button className="fd-cta-secondary !px-4 !py-2 text-xs" type="button" onClick={prevStep}>
                      Previous
                    </button>
                    <button className="fd-cta !px-4 !py-2 text-xs" type="button" onClick={nextStep}>
                      Next
                    </button>
                    <button className="fd-cta-secondary !border-transparent !px-4 !py-2 text-xs" type="button" onClick={skipTour}>
                      Stop
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <p className="font-body text-sm text-slate-600 dark:text-slate-400">Run the tour to preview guided onboarding behavior.</p>
                  <button className="fd-cta whitespace-nowrap !px-5 !py-2.5 text-xs" type="button" onClick={startTour}>
                    Start tour
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </TourView>
    </CodeDemoCard>
  )
}
