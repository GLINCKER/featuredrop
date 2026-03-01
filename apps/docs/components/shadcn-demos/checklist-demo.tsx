import { Checklist, type ChecklistTask } from 'featuredrop/react'
import { useChecklist } from 'featuredrop/react'
import { CodeDemoCard } from '../code-demo-card'

const ChecklistView = Checklist as any

const demoCode = `import { Checklist as ChecklistComponent } from "featuredrop/react"
import { Checklist } from "@/components/featuredrop/checklist"

const tasks = [
  { id: "profile", title: "Complete your profile", description: "Add a photo and bio." },
  { id: "invite", title: "Invite a teammate" },
  { id: "first-project", title: "Create your first project" },
]

export function Onboarding() {
  return (
    <>
      <ChecklistComponent id="onboarding" tasks={tasks} position="inline" />
      <Checklist checklistId="onboarding" tasks={tasks} title="Getting Started" />
    </>
  )
}`

const tasks: ChecklistTask[] = [
  { id: 'connect-provider', title: 'Connect provider', description: 'Wrap app shell with FeatureDropProvider.' },
  { id: 'add-widget', title: 'Add changelog widget', description: 'Surface release notes in your nav.' },
  { id: 'enable-ci', title: 'Enable CI checks', description: 'Validate before merge.' }
]

function ChecklistPreview() {
  const { completeTask, resetChecklist, dismissChecklist, progress, tasks: taskStates, dismissed } = useChecklist('shadcn-checklist-demo')

  if (dismissed) {
    return (
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 text-center dark:border-slate-700 dark:bg-[#070b14]">
        <p className="text-sm text-slate-500 dark:text-slate-400">Checklist dismissed.</p>
        <button type="button" onClick={resetChecklist} className="mt-2 text-xs text-slate-900 underline dark:text-slate-100">
          Reset
        </button>
      </div>
    )
  }

  const getState = (taskId: string) => taskStates.find((t) => t.id === taskId)

  return (
    <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-[#070b14]">
      <div className="border-b border-slate-100 p-4 dark:border-slate-800">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Getting Started</p>
        <div className="mt-2 h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className="h-2 rounded-full bg-slate-900 transition-all dark:bg-slate-100"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {progress.completed} of {progress.total} complete
        </p>
      </div>
      <div className="space-y-1 p-2">
        {tasks.map((task) => {
          const state = getState(task.id)
          const completed = state?.completed ?? false
          return (
            <label
              key={task.id}
              className={`flex cursor-pointer items-start gap-3 rounded-md p-3 transition-colors ${completed ? 'opacity-60' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
            >
              <input
                type="checkbox"
                checked={completed}
                onChange={() => { if (!completed) completeTask(task.id) }}
                disabled={completed}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 dark:border-slate-600"
              />
              <div>
                <p className={`text-sm font-medium text-slate-900 dark:text-slate-100 ${completed ? 'line-through' : ''}`}>
                  {task.title}
                </p>
                {task.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">{task.description}</p>
                )}
              </div>
            </label>
          )
        })}
      </div>
      <div className="flex justify-between border-t border-slate-100 px-4 py-3 dark:border-slate-800">
        <button type="button" onClick={resetChecklist} className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
          Reset
        </button>
        <button type="button" onClick={dismissChecklist} className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
          Dismiss
        </button>
      </div>
    </div>
  )
}

export function ChecklistShadcnDemo() {
  return (
    <CodeDemoCard
      title="Checklist (shadcn/ui)"
      description="Onboarding checklist with progress tracking. Uses useChecklist() hook."
      code={demoCode}
    >
      <ChecklistView id="shadcn-checklist-demo" tasks={tasks} position="inline">
        {() => <ChecklistPreview />}
      </ChecklistView>
    </CodeDemoCard>
  )
}
