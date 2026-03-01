import { useState } from 'react'
import { CodeDemoCard } from '../code-demo-card'

const demoCode = `import { FeedbackWidget } from "@/components/featuredrop/feedback-widget"

export function App() {
  return (
    <FeedbackWidget
      categories={["Bug", "Feature Request", "Question"]}
      onSubmit={async (payload) => {
        await fetch("/api/feedback", {
          method: "POST",
          body: JSON.stringify(payload),
        })
      }}
    />
  )
}`

const categories = ['Bug', 'Feature Request', 'Improvement', 'Other']

export function FeedbackWidgetShadcnDemo() {
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState(categories[0])
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = () => {
    if (!message.trim()) return
    setIsSubmitting(true)
    setTimeout(() => {
      setStatus(`Feedback sent (${category})`)
      setMessage('')
      setCategory(categories[0])
      setOpen(false)
      setIsSubmitting(false)
    }, 500)
  }

  return (
    <CodeDemoCard
      title="Feedback Widget (shadcn/ui)"
      description="Dialog-based feedback form with category select. Standalone — no FeatureDrop provider needed."
      code={demoCode}
    >
      <div className="w-full max-w-sm space-y-3">
        {!open ? (
          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-[#070b14]">
            <span className="text-sm text-slate-600 dark:text-slate-400">How are we doing?</span>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-900 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              Feedback
            </button>
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-lg dark:border-slate-700 dark:bg-[#070b14]">
            <div className="mb-4">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Send Feedback</p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">We&apos;d love to hear from you.</p>
            </div>
            <div className="space-y-3">
              <div>
                <label htmlFor="fd-demo-category" className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">Category</label>
                <select
                  id="fd-demo-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="fd-demo-message" className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">Message</label>
                <textarea
                  id="fd-demo-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us what's on your mind..."
                  rows={3}
                  className="w-full rounded-md border border-slate-200 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting || !message.trim()}
                  className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
                >
                  {isSubmitting ? 'Sending...' : 'Submit'}
                </button>
              </div>
            </div>
          </div>
        )}
        {status && <p className="text-xs text-emerald-600 dark:text-emerald-400">{status}</p>}
      </div>
    </CodeDemoCard>
  )
}
