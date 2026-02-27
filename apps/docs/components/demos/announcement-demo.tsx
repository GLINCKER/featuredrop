import { useState } from 'react'
import { AnnouncementModal } from 'featuredrop/react'
import { CodeDemoCard } from '../code-demo-card'

const AnnouncementModalView = AnnouncementModal as any

const slides = [
  {
    title: 'Ship release narratives, not just changelog bullets',
    description:
      'Use announcement modals for high impact product updates where context and call to action matter.',
    primaryCta: { label: 'Read migration guide', url: '/docs/migration' },
    secondaryCta: { label: 'Open quickstart', url: '/docs/quickstart' }
  },
  {
    title: 'Coordinate rollout across channels',
    description: 'Pair announcement modals with tours and checklists for complete onboarding journeys.',
    primaryCta: { label: 'View tour docs', url: '/docs/components/tours' },
    secondaryCta: { label: 'View checklist docs', url: '/docs/components/checklist' }
  }
]

const announcementDemoCode = `import { AnnouncementModal } from 'featuredrop/react'

const slides = [
  { title: '...', description: '...', primaryCta: { label: 'Read more', url: '/docs' } }
]

export function AnnouncementDemo() {
  return (
    <AnnouncementModal
      id="launch-announcement"
      defaultOpen
      frequency="always"
      slides={slides}
    />
  )
}`

export function AnnouncementDemo() {
  const [instance, setInstance] = useState(0)

  return (
    <CodeDemoCard
      title="Announcement modal demo"
      description="Launch and re-open a modal flow using local demo slides."
      code={announcementDemoCode}
    >
      <div className="w-full max-w-sm border-2 border-slate-900 bg-white p-5 shadow-[4px_4px_0_0_#0f172a] dark:border-slate-700 dark:bg-[#070b14] dark:shadow-[4px_4px_0_0_#000]">
        <p className="mb-4 font-body text-sm font-semibold text-slate-600 dark:text-slate-400">
          Use this for major launches where users need context before taking action.
        </p>
        <button
          type="button"
          className="fd-cta whitespace-nowrap !px-4 !py-2 text-xs"
          onClick={() => setInstance((current) => current + 1)}
        >
          Open announcement modal
        </button>
      </div>
      <AnnouncementModalView
        key={instance}
        id={`docs-announcement-${instance}`}
        defaultOpen={instance > 0}
        trigger="manual"
        frequency="always"
        slides={slides}
      />
    </CodeDemoCard>
  )
}
