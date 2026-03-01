import { Tour } from 'featuredrop/react'
import { useTour } from 'featuredrop/react'
import { CodeDemoCard } from '../code-demo-card'

const TourView = Tour as any

const demoCode = `import { Tour as TourComponent } from "featuredrop/react"
import { Tour } from "@/components/featuredrop/tour"

const steps = [
  { id: "dashboard", target: "#dashboard", title: "Dashboard", content: "Your overview lives here." },
  { id: "settings", target: "#settings", title: "Settings", content: "Configure your workspace." },
]

export function App() {
  return (
    <>
      <TourComponent id="onboarding" steps={steps} />
      <Tour tourId="onboarding" />
    </>
  )
}`

const steps = [
  {
    id: 'tour-s-filters',
    target: '#tour-s-filters',
    title: 'Filters',
    content: 'Filter releases by type or audience.'
  },
  {
    id: 'tour-s-history',
    target: '#tour-s-history',
    title: 'History',
    content: 'Review rollout history and user impact.'
  }
]

function TourPreview() {
  const { isActive, currentStep, currentStepIndex, totalSteps, startTour, nextStep, prevStep, skipTour, closeTour } = useTour('shadcn-tour-demo')

  const isFirst = currentStepIndex === 0
  const isLast = currentStepIndex === totalSteps - 1
  const percent = totalSteps > 0 ? ((currentStepIndex + 1) / totalSteps) * 100 : 0

  return (
    <div className="w-full max-w-lg space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div
          id="tour-s-filters"
          className={`rounded-lg border-2 p-4 transition-colors ${currentStep?.id === 'tour-s-filters' ? 'border-brand bg-brand/5 dark:bg-brand/10' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-[#070b14]'}`}
        >
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Release Filters</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Category, type, and audience.</p>
        </div>
        <div
          id="tour-s-history"
          className={`rounded-lg border-2 p-4 transition-colors ${currentStep?.id === 'tour-s-history' ? 'border-brand bg-brand/5 dark:bg-brand/10' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-[#070b14]'}`}
        >
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Rollout History</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Launches, visibility, trends.</p>
        </div>
      </div>

      {isActive && currentStep ? (
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-md dark:border-slate-700 dark:bg-[#070b14]">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Step {currentStepIndex + 1} of {totalSteps}
          </p>
          <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">{currentStep.title}</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{String(currentStep.content)}</p>
          <div className="mt-3 h-1 w-full rounded-full bg-slate-100 dark:bg-slate-800">
            <div className="h-1 rounded-full bg-slate-900 transition-all dark:bg-slate-100" style={{ width: `${percent}%` }} />
          </div>
          <div className="mt-3 flex items-center justify-between">
            <button type="button" onClick={skipTour} className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
              Skip
            </button>
            <div className="flex gap-2">
              {!isFirst && (
                <button type="button" onClick={prevStep} className="rounded-md border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                  Back
                </button>
              )}
              <button
                type="button"
                onClick={isLast ? closeTour : nextStep}
                className="rounded-md bg-slate-900 px-3 py-1 text-xs font-medium text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
              >
                {isLast ? 'Done' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-[#070b14]">
          <p className="text-sm text-slate-600 dark:text-slate-400">Run the tour to preview guided onboarding.</p>
          <button type="button" onClick={startTour} className="rounded-md bg-slate-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300">
            Start tour
          </button>
        </div>
      )}
    </div>
  )
}

export function TourShadcnDemo() {
  return (
    <CodeDemoCard
      title="Tour (shadcn/ui)"
      description="Step-by-step product tour with popover positioning. Uses useTour() hook."
      code={demoCode}
    >
      <TourView id="shadcn-tour-demo" steps={steps} persistence={false}>
        {() => <TourPreview />}
      </TourView>
    </CodeDemoCard>
  )
}
