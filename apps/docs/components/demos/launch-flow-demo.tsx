import { useMemo } from 'react'
import { MemoryAdapter } from 'featuredrop'
import { Banner, Checklist, FeatureDropProvider, Tour, useChecklist, useTour } from 'featuredrop/react'
import { CodeDemoCard } from '../code-demo-card'
import { demoManifest } from './demo-manifest'

const FeatureDropProviderView = FeatureDropProvider as any
const BannerView = Banner as any
const ChecklistView = Checklist as any
const TourView = Tour as any

const TOUR_ID = 'docs-launch-flow-tour'
const CHECKLIST_ID = 'docs-launch-flow-checklist'

const launchFlowDemoCode = `import { MemoryAdapter } from 'featuredrop'
import { Banner, Checklist, FeatureDropProvider, Tour, useChecklist, useTour } from 'featuredrop/react'

const tourId = 'launch-flow-tour'
const checklistId = 'launch-flow-checklist'

function LaunchFlow() {
  const tour = useTour(tourId)
  const checklist = useChecklist(checklistId)

  return (
    <FeatureDropProvider manifest={manifest} storage={new MemoryAdapter()}>
      <Banner featureId="guided-rollouts" position="inline" />
      <Tour id={tourId} steps={steps} persistence={false} />
      <Checklist id={checklistId} tasks={tasks} position="inline" />
      <button onClick={() => tour.startTour()}>Run launch flow</button>
    </FeatureDropProvider>
  )
}`

function LaunchFlowCanvas() {
  const tour = useTour(TOUR_ID)
  const checklist = useChecklist(CHECKLIST_ID)

  return (
    <div className="space-y-3">
      <BannerView featureId="guided-rollouts" position="inline" variant="announcement" />

      <div className="grid gap-3 md:grid-cols-2">
        <div
          id="launch-flow-step-1"
          className="rounded-xl border border-slate-300/60 bg-white/70 p-4 dark:border-slate-200/10 dark:bg-slate-900/40"
        >
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Launch setup</p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
            Configure audience and release schedule for the new feature.
          </p>
        </div>
        <div
          id="launch-flow-step-2"
          className="rounded-xl border border-slate-300/60 bg-white/70 p-4 dark:border-slate-200/10 dark:bg-slate-900/40"
        >
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Measure impact</p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
            Track opens, clicks, and completion rates after rollout.
          </p>
        </div>
      </div>

      <TourView
        id={TOUR_ID}
        persistence={false}
        steps={[
          {
            id: 'setup',
            target: '#launch-flow-step-1',
            title: 'Set up launch scope',
            content: 'Define the audience and timing for your release.',
            placement: 'bottom'
          },
          {
            id: 'measure',
            target: '#launch-flow-step-2',
            title: 'Review adoption',
            content: 'Inspect metrics and decide if more onboarding is needed.',
            placement: 'bottom'
          }
        ]}
        onTourStarted={() => checklist.completeTask('start-tour')}
        onTourCompleted={() => checklist.completeTask('finish-tour')}
      />

      <ChecklistView
        id={CHECKLIST_ID}
        position="inline"
        tasks={[
          {
            id: 'start-tour',
            title: 'Run launch walkthrough',
            description: 'Start the guided tour for release setup.',
            estimatedTime: '2m'
          },
          {
            id: 'finish-tour',
            title: 'Complete walkthrough',
            description: 'Finish all steps and verify rollout metrics.',
            estimatedTime: '3m'
          },
          {
            id: 'ship',
            title: 'Ship release update',
            description: 'Publish changelog and monitor adoption for 24h.',
            estimatedTime: '4m'
          }
        ]}
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="fd-cta !px-3 !py-1.5 text-xs"
          onClick={() => {
            checklist.resetChecklist()
            tour.startTour()
          }}
        >
          Run launch flow
        </button>
        <button
          type="button"
          className="fd-cta-secondary !px-3 !py-1.5 text-xs"
          onClick={() => checklist.completeTask('ship')}
        >
          Mark release shipped
        </button>
      </div>
    </div>
  )
}

export function LaunchFlowDemo() {
  const storage = useMemo(() => new MemoryAdapter(), [])

  return (
    <CodeDemoCard
      title="Launch flow demo"
      description="Orchestrate Banner, Tour, and Checklist to guide a full release workflow."
      code={launchFlowDemoCode}
    >
      <FeatureDropProviderView manifest={demoManifest} storage={storage}>
        <LaunchFlowCanvas />
      </FeatureDropProviderView>
    </CodeDemoCard>
  )
}
