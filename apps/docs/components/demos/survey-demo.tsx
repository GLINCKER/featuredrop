import { useState } from 'react'
import { Survey } from 'featuredrop/react'
import { CodeDemoCard } from '../code-demo-card'

const surveyDemoCode = `import { Survey } from 'featuredrop/react'

export function SurveyDemo() {
  return (
    <Survey
      id="docs-survey-demo"
      type="nps"
      trigger="manual"
      prompt="How likely are you to recommend FeatureDrop?"
      onSubmit={async (payload) => console.log(payload)}
    >
      {({ show, submit, setScore }) => (
        <button onClick={() => show({ force: true })}>Open survey</button>
      )}
    </Survey>
  )
}`

const SurveyView = Survey as any

export function SurveyDemo() {
  const [submittedAt, setSubmittedAt] = useState<string | null>(null)

  return (
    <CodeDemoCard
      title="Survey demo"
      description="Manual NPS survey trigger with in-page preview controls."
      code={surveyDemoCode}
    >
      <SurveyView
        id="docs-survey-demo"
        type="nps"
        trigger="manual"
        prompt="How likely are you to recommend FeatureDrop to another product team?"
        showAskLater
        onSubmit={async (payload: { score?: number; feedback?: string }) => {
          setSubmittedAt(`Submitted with score ${payload.score ?? 'n/a'}${payload.feedback ? ' and feedback' : ''}`)
        }}
      >
        {({
          isOpen,
          show,
          hide,
          askLater,
          submit,
          score,
          setScore,
          feedback,
          setFeedback,
          isSubmitting,
          error
        }: any) => (
          <div className="w-full max-w-sm space-y-4">
            {!isOpen ? (
              <div className="flex items-center justify-between gap-3 border-2 border-slate-900 bg-white p-4 shadow-[4px_4px_0_0_#0f172a] dark:border-slate-700 dark:bg-[#070b14] dark:shadow-[4px_4px_0_0_#000]">
                <p className="font-body text-sm font-bold text-slate-600 dark:text-slate-400">Open the survey and submit a sample response.</p>
                <button className="fd-cta whitespace-nowrap !px-4 !py-2 text-xs" type="button" onClick={() => show({ force: true })}>
                  Open survey
                </button>
              </div>
            ) : (
              <div className="border-2 border-slate-900 bg-white p-5 shadow-[4px_4px_0_0_#0f172a] dark:border-slate-700 dark:bg-[#070b14] dark:shadow-[4px_4px_0_0_#000]">
                <p className="font-display text-base font-bold uppercase tracking-tight text-slate-900 dark:text-slate-100">NPS survey</p>
                <p className="mt-2 font-body text-sm font-semibold text-slate-600 dark:text-slate-300">
                  How likely are you to recommend FeatureDrop?
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {Array.from({ length: 11 }).map((_, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setScore(index)}
                      className={`h-8 w-8 border-2 text-xs font-bold transition-all ${
                        score === index
                          ? 'border-brand bg-brand text-white dark:border-brand dark:bg-brand dark:text-slate-900'
                          : 'border-slate-300 bg-transparent text-slate-700 hover:border-slate-900 dark:border-slate-600 dark:text-slate-300 dark:hover:border-white'
                      }`}
                    >
                      {index}
                    </button>
                  ))}
                </div>
                <textarea
                  value={feedback}
                  onChange={(event) => setFeedback(event.target.value)}
                  rows={3}
                  placeholder="Optional: what can we improve?"
                  className="mt-4 w-full border-2 border-slate-300 bg-slate-50 p-3 font-body text-sm outline-none transition-colors focus:border-brand dark:border-slate-700 dark:bg-slate-900/50"
                />
                {error ? <p className="mt-2 font-body text-xs font-bold text-red-600 dark:text-red-400">{error}</p> : null}
                <div className="mt-5 flex flex-wrap gap-3">
                  <button className="fd-cta !px-4 !py-2 text-xs" type="button" disabled={isSubmitting} onClick={submit}>
                    Submit
                  </button>
                  <button className="fd-cta-secondary !px-4 !py-2 text-xs" type="button" onClick={askLater}>
                    Ask later
                  </button>
                  <button className="fd-cta-secondary !border-transparent !px-4 !py-2 text-xs" type="button" onClick={hide}>
                    Close
                  </button>
                </div>
              </div>
            )}
            {submittedAt ? <p className="font-body text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-acid">{submittedAt}</p> : null}
          </div>
        )}
      </SurveyView>
    </CodeDemoCard>
  )
}
