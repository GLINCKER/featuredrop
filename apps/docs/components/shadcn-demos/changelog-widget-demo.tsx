import { useMemo, useState } from 'react'
import { MemoryAdapter } from 'featuredrop'
import { FeatureDropProvider } from 'featuredrop/react'
import { useChangelog } from 'featuredrop/react'
import { CodeDemoCard } from '../code-demo-card'
import { demoManifest } from '../demos/demo-manifest'

const FeatureDropProviderView = FeatureDropProvider as any

const demoCode = `import { ChangelogWidget } from "@/components/featuredrop/changelog-widget"

export function Header() {
  return (
    <header className="flex items-center justify-between p-4">
      <h1>My App</h1>
      <ChangelogWidget title="Release Notes" side="right" />
    </header>
  )
}`

function ChangelogPanel() {
  const { features, newCount, isNew, dismiss, markAllSeen } = useChangelog()
  const [open, setOpen] = useState(false)

  const handleClose = () => {
    setOpen(false)
    markAllSeen()
  }

  return (
    <div className="w-full max-w-sm">
      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-[#070b14]">
        <span className="text-sm font-medium text-slate-900 dark:text-slate-100">My App</span>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="relative inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-900 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
        >
          What&apos;s New
          {newCount > 0 && (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
              {newCount}
            </span>
          )}
        </button>
      </div>

      {open && (
        <div className="mt-2 rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-[#070b14]">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Release Notes</p>
            <button type="button" onClick={handleClose} className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
              Close
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {features.map((f, i) => (
              <div key={f.id}>
                <button
                  type="button"
                  className="w-full px-4 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  onClick={() => dismiss(f.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{f.label}</p>
                      {f.description && (
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{f.description}</p>
                      )}
                    </div>
                    {isNew(f.sidebarKey ?? f.id) && (
                      <span className="shrink-0 rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-medium text-white dark:bg-slate-100 dark:text-slate-900">
                        New
                      </span>
                    )}
                  </div>
                </button>
                {i < features.length - 1 && <hr className="border-slate-100 dark:border-slate-800" />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function ChangelogWidgetShadcnDemo() {
  const storage = useMemo(() => new MemoryAdapter(), [])

  return (
    <CodeDemoCard
      title="Changelog Widget (shadcn/ui)"
      description="Slide-out changelog panel with unread count. Uses useChangelog() hook."
      code={demoCode}
    >
      <FeatureDropProviderView manifest={demoManifest} storage={storage}>
        <ChangelogPanel />
      </FeatureDropProviderView>
    </CodeDemoCard>
  )
}
