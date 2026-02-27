import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowRight, ArrowDown, BookOpen, FlaskConical, Github, Rocket, ShieldCheck,
  Workflow, Bell, Navigation, CheckCircle2, TerminalSquare, Zap, Heart,
  DollarSign, Lock, Code2, Package, Users, Palette, BarChart3,
  MessageSquare, ListChecks, Star, Eye, MousePointerClick, ChevronDown,
  Sparkles, Layers, Globe, Box, FileJson, Cpu
} from 'lucide-react'
import { MemoryAdapter } from 'featuredrop'
import {
  FeatureDropProvider, ChangelogWidget, NewBadge, useNewCount,
  Tour, Checklist, Banner, Toast, Spotlight, FeedbackWidget,
  type ChecklistTask
} from 'featuredrop/react'
import type { FeatureManifest } from 'featuredrop'
import { FeatureDropLogoLockup } from '../components/featuredrop-logo'
import { ThemeToggle } from '../components/theme-toggle'
import { trackDocsEvent, type DocsEventName } from '../components/docs-analytics'

// Cast components to any to bypass strict type checks in demo context
const FeatureDropProviderView = FeatureDropProvider as any
const ChangelogWidgetView = ChangelogWidget as any
const NewBadgeView = NewBadge as any
const TourView = Tour as any
const ChecklistView = Checklist as any
const BannerView = Banner as any
const ToastView = Toast as any
const SpotlightView = Spotlight as any
const FeedbackWidgetView = FeedbackWidget as any

// --- Demo Manifest ---
const demoManifest: FeatureManifest = [
  {
    id: 'usage-insights',
    label: 'Usage insights dashboard',
    description: 'Track activation and retention signals without leaving your workspace.',
    releasedAt: '2026-02-20',
    showNewUntil: '2027-06-30',
    category: 'analytics',
    version: '2.1.0',
    type: 'feature'
  },
  {
    id: 'guided-rollouts',
    label: 'Guided rollout templates',
    description: 'Ship coordinated banner, tour, and checklist flows faster.',
    releasedAt: '2026-02-10',
    showNewUntil: '2027-06-30',
    category: 'onboarding',
    version: '2.0.0',
    type: 'improvement'
  },
  {
    id: 'security-audit',
    label: 'Security audit checks',
    description: 'Run security checks in CI before release merges.',
    releasedAt: '2026-01-25',
    showNewUntil: '2027-06-30',
    category: 'platform',
    version: '1.9.0',
    type: 'fix'
  }
]

const checklistTasks: ChecklistTask[] = [
  { id: 'connect-provider', title: 'Connect provider', description: 'Wrap app shell with FeatureDropProvider.', estimatedTime: '2m' },
  { id: 'add-widget', title: 'Add changelog widget', description: 'Surface release notes where users navigate.', estimatedTime: '3m' },
  { id: 'enable-ci', title: 'Enable CI checks', description: 'Run validate + security + size checks before merge.', estimatedTime: '4m' }
]

const tourSteps = [
  { id: 'filters', target: '#lp-tour-filters', title: 'Filters', content: 'Filter releases by type or audience.' },
  { id: 'history', target: '#lp-tour-history', title: 'History', content: 'Review rollout history and user impact.' }
]

// --- Types ---
type ValueCard = {
  title: string
  body: string
  icon: LucideIcon
}

// --- Data ---
const frameworks = [
  { name: 'React', color: '#61DAFB' },
  { name: 'Vue', color: '#42B883' },
  { name: 'Svelte', color: '#FF3E00' },
  { name: 'Solid', color: '#2C4F7C' },
  { name: 'Preact', color: '#673AB8' },
  { name: 'Angular', color: '#DD0031' },
  { name: 'Web Components', color: '#29ABE2' },
  { name: 'Vanilla JS', color: '#F7DF1E' },
]

const valueCards: ValueCard[] = [
  {
    title: 'Zero vendor lock-in',
    body: 'Your features live in a JSON manifest you own. No dashboards, no login walls, no tracking pixels. Ship from your repo.',
    icon: Lock
  },
  {
    title: '< 3 kB core, zero deps',
    body: 'Tree-shakable subpath exports. The core engine adds less weight than a single icon. React bindings are optional.',
    icon: Zap
  },
  {
    title: 'Production-hardened',
    body: 'Schema validation, offline-safe adapters, CI checks, security audits, and 374 passing tests. Not a toy.',
    icon: ShieldCheck
  }
]

const comparisonRows = [
  { feature: 'Self-hosted / OSS', featuredrop: true, saas: false, enterprise: false },
  { feature: 'Changelog widget', featuredrop: true, saas: true, enterprise: true },
  { feature: 'Tours & checklists', featuredrop: true, saas: false, enterprise: true },
  { feature: 'Feedback & surveys', featuredrop: true, saas: true, enterprise: true },
  { feature: 'Feature flags bridge', featuredrop: true, saas: false, enterprise: true },
  { feature: 'User segmentation', featuredrop: true, saas: true, enterprise: true },
  { feature: 'Bundle size', fdVal: '< 3 kB', saasVal: 'N/A (SaaS)', entVal: '~300 kB agent' },
  { feature: 'Price', fdVal: 'Free forever', saasVal: '$49\u2013249/mo', entVal: '$7k+/yr' },
]

const heroTaglines = [
  'Ship changelogs from your own codebase.',
  'Drop your SaaS adoption bill to $0.',
  'Onboard users with guided tours.',
  '< 3 kB. Zero dependencies.',
]

type ShowcaseTab = 'changelog' | 'tour' | 'checklist' | 'banner' | 'feedback'

const showcaseTabs: { id: ShowcaseTab; label: string; icon: LucideIcon; desc: string }[] = [
  { id: 'changelog', label: 'Changelog', icon: Bell, desc: 'In-app release notes with reactions and read-state tracking.' },
  { id: 'tour', label: 'Tours', icon: Navigation, desc: 'Guided product tours with step-by-step navigation.' },
  { id: 'checklist', label: 'Checklist', icon: ListChecks, desc: 'Onboarding checklists with progress persistence.' },
  { id: 'banner', label: 'Banner & Toast', icon: Sparkles, desc: 'Persistent announcements and ephemeral notifications.' },
  { id: 'feedback', label: 'Feedback', icon: MessageSquare, desc: 'Contextual feedback collection with rate limiting.' },
]

// --- Hooks ---
function useScrollDirection() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return scrolled
}

function useIntersectionObserver(opts?: { threshold?: number }) {
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<Element | null>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: opts?.threshold ?? 0.1, rootMargin: '0px 0px -50px 0px' }
    )

    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return { ref, isVisible }
}

function useAnimatedCounter(target: number, duration = 1500) {
  const [count, setCount] = useState(0)
  const { ref, isVisible } = useIntersectionObserver({ threshold: 0.3 })

  useEffect(() => {
    if (!isVisible) return
    if (target === 0) { setCount(0); return }
    const startTime = performance.now()
    function easeOutExpo(t: number): number {
      return t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
    }
    let raf: number
    function animate(now: number) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      setCount(Math.round(easeOutExpo(progress) * target))
      if (progress < 1) raf = requestAnimationFrame(animate)
    }
    raf = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(raf)
  }, [isVisible, target, duration])

  return { ref, count }
}

function useTypewriter(phrases: string[], typingSpeed = 50, deletingSpeed = 30, pauseMs = 2500) {
  const [display, setDisplay] = useState(phrases[0])
  const phase = useRef<'paused' | 'deleting' | 'typing'>('paused')
  const idx = useRef(0)
  const charPos = useRef(phrases[0].length)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    function tick() {
      const currentPhrase = phrases[idx.current]
      if (phase.current === 'paused') {
        timer = setTimeout(() => {
          phase.current = 'deleting'
          tick()
        }, pauseMs)
        return
      }
      if (phase.current === 'deleting') {
        charPos.current--
        setDisplay(currentPhrase.slice(0, charPos.current))
        if (charPos.current === 0) {
          idx.current = (idx.current + 1) % phrases.length
          phase.current = 'typing'
        }
        timer = setTimeout(tick, deletingSpeed)
        return
      }
      if (phase.current === 'typing') {
        const nextPhrase = phrases[idx.current]
        charPos.current++
        setDisplay(nextPhrase.slice(0, charPos.current))
        if (charPos.current === nextPhrase.length) {
          phase.current = 'paused'
          timer = setTimeout(tick, pauseMs)
        } else {
          timer = setTimeout(tick, typingSpeed)
        }
      }
    }
    timer = setTimeout(tick, pauseMs)
    return () => clearTimeout(timer)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return display
}

// --- Components ---
function RevealSection({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, isVisible } = useIntersectionObserver()

  return (
    <div
      // @ts-ignore
      ref={ref}
      className={`transition-all duration-1000 ease-out will-change-[opacity,transform] ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-24'
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

function SectionHeading({ chip, title, subtitle }: { chip?: string; title: string; subtitle: string }) {
  const { ref, isVisible } = useIntersectionObserver({ threshold: 0.2 })
  const words = title.split(' ')

  return (
    <div
      // @ts-ignore
      ref={ref}
      className="mx-auto max-w-2xl text-center mb-12 md:mb-16"
    >
      {chip && (
        <span className={`fd-chip mb-4 inline-block transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>{chip}</span>
      )}
      <h2 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-white md:text-4xl lg:text-5xl">
        {words.map((word, i) => (
          <span
            key={i}
            className={`inline-block transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
            style={{ transitionDelay: isVisible ? `${i * 80}ms` : '0ms' }}
          >
            {word}{i < words.length - 1 ? '\u00A0' : ''}
          </span>
        ))}
      </h2>
      <p
        className={`mt-4 text-lg text-slate-600 dark:text-slate-400 leading-relaxed transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        style={{ transitionDelay: isVisible ? `${words.length * 80 + 100}ms` : '0ms' }}
      >
        {subtitle}
      </p>
    </div>
  )
}

function ScrollProgressBar() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const update = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight
      setProgress(h > 0 ? Math.min(window.scrollY / h, 1) : 0)
    }
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [])

  return <div className="fd-scroll-progress" style={{ width: `${progress * 100}%` }} />
}

function InteractiveCard({ children, className = '', glow = false, tilt = false }: {
  children: React.ReactNode; className?: string; glow?: boolean; tilt?: boolean
}) {
  const cardRef = useRef<HTMLDivElement>(null)

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current
    if (!card) return
    const rect = card.getBoundingClientRect()
    if (glow) {
      card.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`)
      card.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`)
    }
    if (tilt) {
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const rotateX = ((y - rect.height / 2) / (rect.height / 2)) * -6
      const rotateY = ((x - rect.width / 2) / (rect.width / 2)) * 6
      card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-2px)`
    }
  }, [glow, tilt])

  const handleMouseLeave = useCallback(() => {
    const card = cardRef.current
    if (!card) return
    if (glow) {
      card.style.removeProperty('--mouse-x')
      card.style.removeProperty('--mouse-y')
    }
    if (tilt) {
      card.style.transform = ''
    }
  }, [glow, tilt])

  return (
    <div
      ref={cardRef}
      className={`${glow ? 'fd-glow-card' : ''} ${tilt ? 'fd-tilt-card' : ''} ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </div>
  )
}

function SocialProofStrip() {
  return (
    <section className="my-16 md:my-20">
      <div className="text-center space-y-8">
        <p className="text-sm font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Trusted by developers shipping with
        </p>

        <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-brand" />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">500+ npm downloads/week</span>
          </div>
          <div className="hidden sm:block h-4 w-px bg-slate-300 dark:bg-slate-700" />
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Open source on GitHub</span>
          </div>
          <div className="hidden sm:block h-4 w-px bg-slate-300 dark:bg-slate-700" />
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">374 tests passing</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4">
          {frameworks.map((fw) => (
            <div
              key={fw.name}
              className="fd-glass-surface flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 transition-all hover:scale-105"
            >
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: fw.color }} />
              {fw.name}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function CodeSnippetSection() {
  return (
    <section className="my-24 md:my-32">
      <SectionHeading
        chip="10-minute setup"
        title="Define. Wrap. Ship."
        subtitle="A JSON manifest and one provider component. That's the entire API surface."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Step 1: manifest */}
        <div className="fd-glass-surface fd-gradient-border overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-200/50 dark:border-white/5 px-4 py-3">
            <FileJson className="h-4 w-4 text-amber-500" />
            <span className="text-xs font-mono font-medium text-slate-500 dark:text-slate-400">features.json</span>
            <span className="ml-auto fd-chip !text-[10px] !py-0">Step 1</span>
          </div>
          <pre className="p-5 text-[13px] leading-[1.8] overflow-x-auto text-slate-700 dark:text-slate-300">
            <code>{`[
  {
    "id": "dark-mode",
    "title": "Dark Mode",
    "description": "Full dark theme support",
    "publishAt": "2025-03-01T00:00:00Z",
    "expiresAt": "2025-04-01T00:00:00Z"
  }
]`}</code>
          </pre>
        </div>

        {/* Step 2: React code */}
        <div className="fd-glass-surface fd-gradient-border overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-200/50 dark:border-white/5 px-4 py-3">
            <Code2 className="h-4 w-4 text-blue-500" />
            <span className="text-xs font-mono font-medium text-slate-500 dark:text-slate-400">App.tsx</span>
            <span className="ml-auto fd-chip !text-[10px] !py-0">Step 2</span>
          </div>
          <pre className="p-5 text-[13px] leading-[1.8] overflow-x-auto text-slate-700 dark:text-slate-300">
            <code>{`import { FeatureDropProvider, NewBadge }
  from 'featuredrop/react'
import features from './features.json'

<FeatureDropProvider manifest={features}>
  <nav>
    Settings <NewBadge id="dark-mode" />
  </nav>
</FeatureDropProvider>`}</code>
          </pre>
        </div>
      </div>

      <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2 fd-glass-surface px-4 py-2.5">
          <Package className="h-4 w-4 text-brand" />
          <code className="text-xs font-mono font-semibold">npm i featuredrop</code>
        </div>
        <span className="hidden sm:inline text-slate-300 dark:text-slate-700">then</span>
        <span className="text-slate-600 dark:text-slate-300 font-medium">Badges auto-expire. Zero config.</span>
      </div>
    </section>
  )
}

// --- Live Demos for Showcase ---
function ChangelogShowcase() {
  const storage = useMemo(() => new MemoryAdapter(), [])

  function HeaderBadge() {
    const count = useNewCount()
    return <NewBadgeView variant="count" show={count > 0} count={count} />
  }

  return (
    <FeatureDropProviderView manifest={demoManifest} storage={storage}>
      <div className="w-full max-w-sm mx-auto">
        <div className="fd-glass-surface overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200/50 p-4 dark:bg-slate-900/50 dark:border-white/5 flex items-center justify-between">
            <span className="font-semibold text-slate-900 dark:text-white text-sm">Dashboard</span>
            <HeaderBadge />
          </div>
          <div className="p-4">
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
              Click to open the interactive changelog widget.
            </p>
            <ChangelogWidgetView title="Product updates" triggerLabel="Open changelog" />
          </div>
        </div>
      </div>
    </FeatureDropProviderView>
  )
}

function TourShowcase() {
  return (
    <TourView id="lp-tour-demo" steps={tourSteps} persistence={false}>
      {({ isActive, step, stepIndex, totalSteps, startTour, nextStep, prevStep, skipTour }: any) => (
        <div className="w-full max-w-lg mx-auto space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div
              id="lp-tour-filters"
              className={`fd-glass-surface p-4 transition-all duration-300 ${step?.id === 'filters' ? '!border-brand !bg-brand/5 dark:!bg-brand/10 shadow-glow-primary' : ''}`}
            >
              <p className="font-semibold text-sm text-slate-900 dark:text-white">Release filters</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Category, type, and audience.</p>
            </div>
            <div
              id="lp-tour-history"
              className={`fd-glass-surface p-4 transition-all duration-300 ${step?.id === 'history' ? '!border-brand !bg-brand/5 dark:!bg-brand/10 shadow-glow-primary' : ''}`}
            >
              <p className="font-semibold text-sm text-slate-900 dark:text-white">Rollout history</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Launches, visibility, adoption.</p>
            </div>
          </div>
          <div className="fd-glass-surface p-5">
            {isActive && step ? (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Step {stepIndex + 1} of {totalSteps}</p>
                <p className="mt-2 font-semibold text-slate-900 dark:text-white">{step.title}</p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{String(step.content)}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button className="fd-cta-secondary !px-3 !py-1.5 text-xs" type="button" onClick={prevStep}>Previous</button>
                  <button className="fd-cta !px-3 !py-1.5 text-xs" type="button" onClick={nextStep}>Next</button>
                  <button className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 px-2" type="button" onClick={skipTour}>Stop</button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-sm text-slate-600 dark:text-slate-400">Try the interactive tour demo.</p>
                <button className="fd-cta !px-4 !py-2 text-xs whitespace-nowrap" type="button" onClick={startTour}>Start tour</button>
              </div>
            )}
          </div>
        </div>
      )}
    </TourView>
  )
}

function ChecklistShowcase() {
  return (
    <div className="w-full max-w-md mx-auto">
      <ChecklistView id="lp-checklist-demo" tasks={checklistTasks} position="inline" />
    </div>
  )
}

function BannerShowcase() {
  const storage = useMemo(() => new MemoryAdapter(), [])

  return (
    <FeatureDropProviderView manifest={demoManifest} storage={storage}>
      <div className="w-full max-w-md mx-auto space-y-4">
        <BannerView featureId="guided-rollouts" position="inline" variant="announcement" />
        <div className="fd-glass-surface p-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Banners persist until dismissed. Toast notifications appear in the corner. Both auto-sync with the manifest.
          </p>
        </div>
        <ToastView featureIds={['usage-insights']} autoDismissMs={0} maxVisible={1} position="bottom-right" />
      </div>
    </FeatureDropProviderView>
  )
}

function FeedbackShowcase() {
  const [status, setStatus] = useState<string | null>(null)
  const storage = useMemo(() => new MemoryAdapter(), [])

  return (
    <FeatureDropProviderView manifest={demoManifest} storage={storage}>
      <div className="w-full max-w-md mx-auto">
        <FeedbackWidgetView
          featureId="usage-insights"
          rateLimit="1-per-session"
          categories={['bug', 'suggestion', 'praise']}
          onSubmit={async (payload: { category?: string }) => {
            setStatus(`Feedback sent (${payload.category || 'general'})`)
          }}
        >
          {({ isOpen, open, close, text, setText, category, setCategory, submit, isSubmitting, error }: any) => (
            <div className="space-y-3">
              {!isOpen ? (
                <div className="fd-glass-surface p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Capture contextual feedback directly from feature touchpoints.
                  </p>
                  <button className="fd-cta !px-4 !py-2 text-xs whitespace-nowrap" type="button" onClick={open}>
                    Open feedback form
                  </button>
                </div>
              ) : (
                <div className="fd-glass-surface p-5 space-y-3">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">Feedback form</p>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  >
                    <option value="bug">Bug</option>
                    <option value="suggestion">Suggestion</option>
                    <option value="praise">Praise</option>
                  </select>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={3}
                    placeholder="Tell us what is working or broken."
                    className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  />
                  {error && <p className="text-xs text-red-600">{error}</p>}
                  <div className="flex flex-wrap gap-2">
                    <button className="fd-cta !px-3 !py-1.5 text-xs" type="button" onClick={submit} disabled={isSubmitting}>Submit</button>
                    <button className="fd-cta-secondary !px-3 !py-1.5 text-xs" type="button" onClick={close}>Close</button>
                  </div>
                </div>
              )}
              {status && <p className="text-xs text-emerald-700 dark:text-emerald-300">{status}</p>}
            </div>
          )}
        </FeedbackWidgetView>
      </div>
    </FeatureDropProviderView>
  )
}

function ComponentShowcase() {
  const [activeTab, setActiveTab] = useState<ShowcaseTab>('changelog')
  const activeInfo = showcaseTabs.find(t => t.id === activeTab)

  return (
    <section className="my-24 md:my-40">
      <SectionHeading
        chip="Live demos"
        title="See every component in action"
        subtitle="These are real FeatureDrop components running live. Click, interact, and see what ships in your app."
      />

      {/* Tab bar */}
      <div className="flex flex-wrap justify-center gap-2 mb-8">
        {showcaseTabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              type="button"
              className="fd-showcase-tab flex items-center gap-2"
              data-active={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Description */}
      {activeInfo && (
        <p className="text-center text-sm text-slate-500 dark:text-slate-400 mb-8 max-w-md mx-auto">
          {activeInfo.desc}
        </p>
      )}

      {/* Demo area */}
      <div className="fd-glass p-6 sm:p-10 min-h-[350px] flex items-center justify-center relative overflow-hidden">
        {/* Grid background */}
        <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:14px_24px]" />
        <div className="relative z-10 w-full">
          {activeTab === 'changelog' && <ChangelogShowcase />}
          {activeTab === 'tour' && <TourShowcase />}
          {activeTab === 'checklist' && <ChecklistShowcase />}
          {activeTab === 'banner' && <BannerShowcase />}
          {activeTab === 'feedback' && <FeedbackShowcase />}
        </div>
      </div>

      <div className="mt-6 text-center">
        <Link
          href="/docs/components/gallery"
          className="inline-flex items-center gap-2 text-sm font-medium text-brand hover:underline underline-offset-4"
          onClick={() => trackDocsEvent('landing_gallery_clicked', { source: 'showcase' })}
        >
          View full component gallery
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  )
}

function FeatureShowcaseLeft() {
  return (
    <div className="flex flex-col items-center gap-12 md:flex-row lg:gap-24 my-24 md:my-32">
      <div className="flex-1 space-y-6">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400">
          <Bell className="h-6 w-6" />
        </div>
        <h3 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-white md:text-4xl">
          Changelog Widget
        </h3>
        <p className="text-lg leading-relaxed text-slate-600 dark:text-slate-400">
          Drop a fully functional changelog into your app. Announce releases, collect reactions, and sync read-states without complex database glue code.
        </p>
        <ul className="space-y-3 pt-4 text-slate-700 dark:text-slate-300">
          <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 shrink-0 text-brand" /> Markdown support with syntax highlighting</li>
          <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 shrink-0 text-brand" /> Emoji reaction syncing</li>
          <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 shrink-0 text-brand" /> Custom badge anchoring and auto-dismiss</li>
          <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 shrink-0 text-brand" /> Audience-targeted release notes</li>
        </ul>
      </div>

      {/* Mock UI */}
      <div className="relative flex-1 w-full max-w-sm">
        <div className="absolute -inset-4 rounded-3xl bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 blur-xl dark:from-indigo-500/10 dark:to-purple-500/10" />
        <div className="relative fd-glass-surface flex flex-col overflow-hidden p-0 h-[480px]">
          <div className="bg-slate-50 border-b border-slate-200/50 p-4 shrink-0 dark:bg-slate-900/50 dark:border-white/5 flex items-center justify-between">
            <span className="font-semibold text-slate-900 dark:text-white">What&#39;s New</span>
            <span className="text-xs text-slate-500 cursor-pointer hover:text-brand transition-colors">Mark all read</span>
          </div>
          <div className="flex-1 p-5 space-y-6 overflow-hidden">
            {/* Entry 1 */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="fd-chip !bg-brand !text-white !border-transparent py-0.5">New</span>
                <span className="text-xs text-slate-500">Today</span>
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white">Dark Mode Parity</h4>
              <p className="text-sm text-slate-600 dark:text-slate-300">Full dark theme support across every surface.</p>
              <div className="h-24 w-full rounded-lg bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-700 animate-pulse-glow" />
            </div>
            {/* Entry 2 */}
            <div className="space-y-2 opacity-60">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Yesterday</span>
              </div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">Performance Boost</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400">50% faster page loads with lazy hydration.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function FeatureShowcaseRight() {
  return (
    <div className="flex flex-col-reverse items-center gap-12 md:flex-row lg:gap-24 my-24 md:my-32">
      {/* Mock UI */}
      <div className="relative flex-1 w-full max-w-sm">
        <div className="absolute -inset-4 rounded-3xl bg-gradient-to-tl from-teal-500/20 to-emerald-500/20 blur-xl dark:from-teal-500/10 dark:to-emerald-500/10" />
        <div className="relative fd-glass-surface flex flex-col gap-3 p-6">
          <div className="bg-slate-100 rounded-lg p-4 pl-12 relative dark:bg-slate-800/50">
            <div className="absolute -left-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-brand flex items-center justify-center text-white ring-8 ring-white dark:ring-slate-950 font-bold z-10 shadow-glass text-sm">1</div>
            <p className="text-sm font-medium text-slate-900 dark:text-white">Welcome Interface</p>
          </div>
          <div className="bg-white border-2 border-brand rounded-lg p-4 pl-12 relative shadow-glow-primary dark:bg-slate-900">
            <div className="absolute -left-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-brand flex items-center justify-center text-white ring-8 ring-white dark:ring-slate-950 font-bold z-10 shadow-glass text-sm">2</div>
            <p className="text-sm font-medium text-brand">Connect Data Source</p>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Click the button below to link your database.</p>
          </div>
          <div className="bg-slate-100 rounded-lg p-4 pl-12 relative opacity-50 dark:bg-slate-800/50">
            <div className="absolute -left-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-slate-300 flex items-center justify-center text-slate-600 ring-8 ring-white dark:ring-slate-950 font-bold z-10 dark:bg-slate-700 dark:text-slate-400 text-sm">3</div>
            <p className="text-sm font-medium text-slate-900 dark:text-white">Deploy Sync</p>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-6">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-100 text-teal-600 dark:bg-teal-900/50 dark:text-teal-400">
          <Navigation className="h-6 w-6" />
        </div>
        <h3 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-white md:text-4xl">
          Tours & Onboarding
        </h3>
        <p className="text-lg leading-relaxed text-slate-600 dark:text-slate-400">
          Orchestrate product tours and interactive checklists in your React tree. Smart throttling ensures users aren&#39;t bombarded.
        </p>
        <ul className="space-y-3 pt-4 text-slate-700 dark:text-slate-300">
          <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 shrink-0 text-brand" /> Smart popup throttling & Do Not Disturb</li>
          <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 shrink-0 text-brand" /> Deep link directly into tour steps</li>
          <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 shrink-0 text-brand" /> Progress persistence across devices</li>
          <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 shrink-0 text-brand" /> Render prop API for full control</li>
        </ul>
      </div>
    </div>
  )
}

function HowEasySection() {
  const step1 = useIntersectionObserver({ threshold: 0.3 })
  const step2 = useIntersectionObserver({ threshold: 0.3 })
  const step3 = useIntersectionObserver({ threshold: 0.3 })

  return (
    <section className="my-24 md:my-40">
      <SectionHeading
        chip="How easy it is"
        title="Three steps. Thirty seconds."
        subtitle="No accounts. No scripts. No vendor lock-in. Just install, define, ship."
      />

      <div className="space-y-16 lg:space-y-24">
        {/* Step 1: Install */}
        <div
          // @ts-ignore
          ref={step1.ref}
          className={`flex flex-col items-center gap-8 lg:flex-row lg:gap-16 transition-all duration-1000 ${step1.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
        >
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-500 text-white font-bold text-lg shadow-lg">1</span>
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Install in 30 seconds</span>
            </div>
            <h3 className="font-display text-2xl font-bold text-slate-900 dark:text-white">One package. No config files.</h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">Install from npm and you&#39;re ready. No accounts, no API keys, no build plugins.</p>
          </div>
          <div className="flex-1 w-full max-w-lg">
            <div className="fd-glass-surface overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200/50 dark:border-white/5 bg-slate-900 dark:bg-black">
                <div className="flex gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-red-500/80" />
                  <span className="h-3 w-3 rounded-full bg-yellow-500/80" />
                  <span className="h-3 w-3 rounded-full bg-green-500/80" />
                </div>
                <span className="text-xs text-slate-400 font-mono ml-2">terminal</span>
              </div>
              <div className="bg-slate-900 dark:bg-black p-5 font-mono text-sm">
                <div className="text-green-400">
                  $ <span className={step1.isVisible ? 'fd-terminal-line' : ''}>npm install featuredrop</span>
                </div>
                <div
                  className={`mt-2 text-slate-500 transition-opacity duration-500 ${step1.isVisible ? 'opacity-100' : 'opacity-0'}`}
                  style={{ transitionDelay: step1.isVisible ? '1.2s' : '0s' }}
                >
                  added 1 package in 0.4s
                </div>
                <div
                  className={`text-slate-500 transition-opacity duration-500 ${step1.isVisible ? 'opacity-100' : 'opacity-0'}`}
                  style={{ transitionDelay: step1.isVisible ? '1.5s' : '0s' }}
                >
                  <span className="text-emerald-400">0 vulnerabilities</span> · <span className="text-slate-400">0 dependencies</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step 2: Define */}
        <div
          // @ts-ignore
          ref={step2.ref}
          className={`flex flex-col-reverse items-center gap-8 lg:flex-row lg:gap-16 transition-all duration-1000 ${step2.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
        >
          <div className="flex-1 w-full max-w-lg">
            <div className="fd-glass-surface fd-gradient-border overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200/50 dark:border-white/5">
                <FileJson className="h-4 w-4 text-amber-500" />
                <span className="text-xs font-mono font-medium text-slate-500 dark:text-slate-400">features.json</span>
              </div>
              <pre className="p-5 text-[13px] leading-[1.8] overflow-x-auto text-slate-700 dark:text-slate-300">
                <code>{`[
  {
    "id": "dark-mode",
    "label": "Dark Mode",
    "description": "Full dark theme support",
    "releasedAt": "2026-03-01"
  }
]`}</code>
              </pre>
            </div>
          </div>
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 text-white font-bold text-lg shadow-lg">2</span>
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Add your first feature</span>
            </div>
            <h3 className="font-display text-2xl font-bold text-slate-900 dark:text-white">A JSON file. That&#39;s the whole API.</h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">Define features with IDs, descriptions, and release dates. No CMS, no dashboard &mdash; it&#39;s a file in your repo.</p>
          </div>
        </div>

        {/* Step 3: Ship */}
        <div
          // @ts-ignore
          ref={step3.ref}
          className={`flex flex-col items-center gap-8 lg:flex-row lg:gap-16 transition-all duration-1000 ${step3.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
        >
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-white font-bold text-lg shadow-lg">3</span>
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Watch badges appear</span>
            </div>
            <h3 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Badges show up. Then auto-expire.</h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">Drop NewBadge next to any nav item. It reads from the manifest, marks items as seen, and disappears on schedule.</p>
          </div>
          <div className="flex-1 w-full max-w-lg">
            <div className="fd-glass-surface overflow-hidden p-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Dashboard</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Settings</span>
                  <span
                    className={`inline-flex items-center rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-white transition-all duration-700 ${step3.isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}
                    style={{ transitionDelay: step3.isVisible ? '0.5s' : '0s' }}
                  >
                    NEW
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Analytics</span>
                  <span
                    className={`inline-flex items-center rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-white transition-all duration-700 ${step3.isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}
                    style={{ transitionDelay: step3.isVisible ? '0.8s' : '0s' }}
                  >
                    NEW
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 opacity-60">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Profile</span>
                  <span className="text-[10px] text-slate-400 italic">expired</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function ComparisonSection() {
  return (
    <section className="my-24 md:my-40">
      <SectionHeading
        chip="Honest comparison"
        title="Free vs. paid adoption tools"
        subtitle="Same features. No monthly bill. No tracking pixels. You own the code."
      />

      <div className="fd-glass overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200/50 dark:border-white/5">
                <th className="text-left px-6 py-4 font-semibold text-slate-900 dark:text-white w-[40%]">Feature</th>
                <th className="text-center px-4 py-4 w-[20%]">
                  <span className="font-bold text-brand">FeatureDrop</span>
                  <span className="block text-[10px] text-slate-500 mt-0.5">open source</span>
                </th>
                <th className="text-center px-4 py-4 font-medium text-slate-500 dark:text-slate-400 w-[20%]">
                  Paid SaaS
                  <span className="block text-[10px] text-slate-400 mt-0.5">$49–249/mo</span>
                </th>
                <th className="text-center px-4 py-4 font-medium text-slate-500 dark:text-slate-400 w-[20%]">
                  Enterprise
                  <span className="block text-[10px] text-slate-400 mt-0.5">$7k+/yr</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row) => (
                <tr key={row.feature} className="border-b border-slate-100 dark:border-white/[0.03] last:border-b-0 transition-colors hover:bg-slate-50/50 dark:hover:bg-white/[0.01]">
                  <td className="px-6 py-3.5 text-slate-700 dark:text-slate-300 font-medium">{row.feature}</td>
                  <td className="text-center px-4 py-3.5">
                    {'featuredrop' in row
                      ? row.featuredrop
                        ? <CheckCircle2 className="inline h-5 w-5 text-brand" />
                        : <span className="text-slate-300 dark:text-slate-600">&mdash;</span>
                      : <span className="font-bold text-brand">{row.fdVal}</span>
                    }
                  </td>
                  <td className="text-center px-4 py-3.5">
                    {'saas' in row
                      ? row.saas
                        ? <CheckCircle2 className="inline h-5 w-5 text-slate-400" />
                        : <span className="text-slate-300 dark:text-slate-600">&mdash;</span>
                      : <span className="text-slate-500 dark:text-slate-400">{row.saasVal}</span>
                    }
                  </td>
                  <td className="text-center px-4 py-3.5">
                    {'enterprise' in row
                      ? row.enterprise
                        ? <CheckCircle2 className="inline h-5 w-5 text-slate-400" />
                        : <span className="text-slate-300 dark:text-slate-600">&mdash;</span>
                      : <span className="text-slate-500 dark:text-slate-400">{row.entVal}</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

function ImpactStatsSection() {
  const impactStats = [
    { value: 0, prefix: '$', suffix: '/mo', label: 'vs $249/mo paid tools', highlight: 'Save $2,988/yr', icon: DollarSign },
    { value: 30, prefix: '', suffix: 's', label: 'to first "New" badge', highlight: 'No config needed', icon: Zap },
    { value: 3, prefix: '', suffix: ' kB', label: 'total footprint', highlight: 'vs 300 kB enterprise agents', icon: Package },
    { value: 8, prefix: '', suffix: '', label: 'frameworks supported', highlight: 'One library, every stack', icon: Globe },
  ]

  return (
    <section className="my-24 md:my-40">
      <div className="rounded-2xl bg-slate-900 dark:bg-black p-8 md:p-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand/10 via-transparent to-purple-600/10 pointer-events-none" />
        <div className="absolute top-0 left-1/4 h-64 w-64 rounded-full bg-brand/5 blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 h-64 w-64 rounded-full bg-purple-500/5 blur-[100px]" />

        <div className="relative z-10">
          <div className="text-center mb-12 md:mb-16">
            <span className="fd-chip !bg-white/10 !border-white/10 !text-white/60 mb-4 inline-block">Impact</span>
            <h2 className="font-display text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-5xl">
              The numbers that matter
            </h2>
            <p className="mt-4 text-lg text-slate-400 leading-relaxed max-w-2xl mx-auto">
              Ship faster, spend nothing, keep your bundle lean.
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {impactStats.map((stat) => {
              const { ref, count } = useAnimatedCounter(stat.value)
              const Icon = stat.icon
              return (
                <div
                  key={stat.label}
                  // @ts-ignore
                  ref={ref}
                  className="text-center space-y-3"
                >
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 mx-auto">
                    <Icon className="h-6 w-6 text-brand" />
                  </div>
                  <p className="font-display text-4xl md:text-5xl font-extrabold tracking-tight text-white">
                    {stat.prefix}{count}{stat.suffix}
                  </p>
                  <p className="text-sm font-medium text-slate-400">{stat.label}</p>
                  <p className="text-xs font-semibold text-brand">{stat.highlight}</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

function BuiltForSection() {
  const useCases = [
    {
      icon: Rocket,
      title: 'SaaS products',
      body: 'Announce features, run onboarding tours, collect feedback \u2014 all from one manifest.',
    },
    {
      icon: Users,
      title: 'Developer tools',
      body: 'Version-aware badges, CLI-generated manifests, and CI validation out of the box.',
    },
    {
      icon: Globe,
      title: 'Multi-tenant platforms',
      body: 'Audience segmentation by plan, role, region, or any custom field. Show different features to different users.',
    },
    {
      icon: Palette,
      title: 'Design systems',
      body: 'Headless components with render prop APIs. Map FeatureDrop primitives to your own design tokens.',
    },
    {
      icon: BarChart3,
      title: 'Product analytics',
      body: 'Analytics callbacks for impression, dismissal, and engagement tracking. Pipe data anywhere.',
    },
    {
      icon: Layers,
      title: 'Enterprise apps',
      body: 'Feature flag bridges, schema validation, security audits, and offline-safe storage adapters.',
    },
  ]

  return (
    <section className="my-24 md:my-40">
      <SectionHeading
        chip="Use cases"
        title="Built for teams that ship"
        subtitle="From indie hackers to enterprise. One toolkit, zero compromise."
      />

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {useCases.map((item, i) => {
          const Icon = item.icon
          return (
            <RevealSection key={item.title} delay={i * 80}>
              <InteractiveCard glow className="fd-glass-surface fd-gradient-border p-6 h-full space-y-4 group">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition-all group-hover:bg-brand group-hover:text-white dark:bg-slate-800 dark:text-slate-300 dark:group-hover:bg-brand relative z-10">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-white relative z-10">{item.title}</h3>
                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400 relative z-10">{item.body}</p>
              </InteractiveCard>
            </RevealSection>
          )
        })}
      </div>
    </section>
  )
}

function LaunchSequenceSection() {
  const steps = [
    {
      icon: BookOpen,
      title: 'Read quickstart',
      body: 'Ship your first "New" badge and changelog entry in about 10 minutes. Copy-paste examples included.',
      href: '/docs/quickstart',
      color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400',
      hoverColor: 'group-hover:bg-blue-500 group-hover:text-white dark:group-hover:bg-blue-500',
    },
    {
      icon: FlaskConical,
      title: 'Try live playground',
      body: 'Use local sandbox or hosted templates to validate copy, timing, and audience targeting before shipping.',
      href: '/playground',
      color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-400',
      hoverColor: 'group-hover:bg-purple-500 group-hover:text-white dark:group-hover:bg-purple-500',
    },
    {
      icon: Rocket,
      title: 'Go to production',
      body: 'Enable CI validation, choose your storage adapter, wire analytics callbacks, and roll out feature messaging safely.',
      href: '/docs/automation/ci',
      color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400',
      hoverColor: 'group-hover:bg-emerald-500 group-hover:text-white dark:group-hover:bg-emerald-500',
    },
  ]

  return (
    <section className="my-24 md:my-40">
      <SectionHeading
        chip="Get started"
        title="Your launch sequence"
        subtitle="A practical path to replacing expensive vendor lock-in today."
      />

      <div className="grid gap-8 lg:grid-cols-3">
        {steps.map((step, i) => {
          const Icon = step.icon
          return (
            <RevealSection key={step.title} delay={i * 120}>
              <InteractiveCard glow tilt className="h-full">
                <Link
                  href={step.href}
                  className="fd-glass-surface fd-gradient-border flex flex-col p-8 h-full group"
                  onClick={() => trackDocsEvent('launch_path_clicked', { source: 'launch_paths', destination: step.href, title: step.title })}
                >
                  <div className="flex items-start gap-5 relative z-10">
                    <div className={`inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl transition-all duration-300 ${step.color} ${step.hoverColor}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">Step {i + 1}</span>
                      </div>
                      <h3 className="font-display text-xl font-semibold text-slate-900 dark:text-white group-hover:text-brand transition-colors">{step.title}</h3>
                      <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">{step.body}</p>
                    </div>
                  </div>
                  <div className="mt-6 flex items-center gap-2 text-sm font-medium text-brand opacity-0 group-hover:opacity-100 transition-opacity relative z-10">
                    Get started <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </Link>
              </InteractiveCard>
            </RevealSection>
          )
        })}
      </div>
    </section>
  )
}

function FrameworksSection() {
  return (
    <section className="my-20">
      <div className="text-center mb-8">
        <p className="text-sm font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Works with your stack
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4">
        {frameworks.map((fw, i) => (
          <RevealSection key={fw.name} delay={i * 50}>
            <div className="fd-glass-surface flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 transition-all hover:scale-105">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: fw.color }} />
              {fw.name}
            </div>
          </RevealSection>
        ))}
      </div>
    </section>
  )
}

function OpenSourceCTA() {
  return (
    <section className="my-24 md:my-40">
      <div className="fd-glass p-10 md:p-16 text-center relative overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-brand/5 via-purple-500/5 to-teal-500/5 animate-gradient-shift pointer-events-none" />
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-brand/10 blur-[80px] dark:bg-brand/20" />
        <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-purple-500/10 blur-[80px] dark:bg-purple-500/20" />

        <div className="relative z-10 space-y-6">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 mx-auto">
            <Heart className="h-8 w-8" />
          </div>
          <h2 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-white md:text-5xl">
            Free forever. <span className="text-brand">Really.</span>
          </h2>
          <p className="mx-auto max-w-lg text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
            MIT licensed, no usage limits, no tracking, no enterprise upsell. Built at{' '}
            <a className="font-semibold text-slate-900 hover:text-brand dark:text-white underline-offset-4 hover:underline transition-colors" href="https://glincker.com">GLINR Studios</a>
            {' '}for products that respect their users.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row pt-4">
            <a
              className="fd-cta group text-base px-8 py-3.5"
              href="https://github.com/GLINCKER/featuredrop"
              onClick={() => trackDocsEvent('outbound_github_clicked', { source: 'oss_cta' })}
            >
              <Github className="mr-2 h-5 w-5" />
              Star on GitHub
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </a>
            <Link
              className="fd-cta-secondary group text-base px-8 py-3.5"
              href="/docs/quickstart"
              onClick={() => trackDocsEvent('landing_quickstart_clicked', { source: 'oss_cta' })}
            >
              Read the docs
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  const currentYear = new Date().getFullYear()

  const resourceLinks: Array<{ label: string; href: string; event: DocsEventName }> = [
    { label: 'Documentation', href: '/docs', event: 'landing_docs_clicked' },
    { label: 'Quickstart', href: '/docs/quickstart', event: 'landing_quickstart_clicked' },
    { label: 'Component Gallery', href: '/docs/components/gallery', event: 'landing_docs_clicked' },
    { label: 'Playground', href: '/playground', event: 'landing_playground_clicked' },
    { label: 'API Reference', href: '/docs/api', event: 'landing_docs_clicked' },
  ]

  const communityLinks: Array<{
    label: string
    href: string
    event: DocsEventName
    external: true
  }> = [
    { label: 'GitHub', href: 'https://github.com/GLINCKER/featuredrop', event: 'outbound_github_clicked', external: true },
    { label: 'npm', href: 'https://www.npmjs.com/package/featuredrop', event: 'outbound_npm_clicked', external: true },
    { label: 'Issues', href: 'https://github.com/GLINCKER/featuredrop/issues', event: 'outbound_github_clicked', external: true },
    { label: 'Discussions', href: 'https://github.com/GLINCKER/featuredrop/discussions', event: 'outbound_github_clicked', external: true },
  ]

  const legalLinks = [
    { label: 'MIT License', href: 'https://github.com/GLINCKER/featuredrop/blob/main/LICENSE', external: true },
    { label: 'Contributing Guide', href: 'https://github.com/GLINCKER/featuredrop/blob/main/CONTRIBUTING.md', external: true },
  ]

  return (
    <footer className="mt-24 border-t border-slate-200/50 dark:border-white/5">
      <div className="py-16 space-y-16">
        {/* Top: Logo + nav columns */}
        <div className="grid gap-12 md:grid-cols-12">
          {/* Logo + description */}
          <div className="md:col-span-5 space-y-4">
            <Link href="/" className="transition-opacity hover:opacity-80">
              <FeatureDropLogoLockup>
                <span className="font-display text-xl font-bold text-slate-900 dark:text-white">FeatureDrop</span>
              </FeatureDropLogoLockup>
            </Link>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
              The open-source product adoption toolkit. Ship changelogs, tours, checklists, and feedback widgets from your own codebase.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <a
                href="https://github.com/GLINCKER/featuredrop"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-all hover:border-slate-300 hover:text-slate-700 hover:scale-110 dark:border-white/10 dark:text-slate-400 dark:hover:border-white/20 dark:hover:text-white"
                aria-label="GitHub"
                onClick={() => trackDocsEvent('outbound_github_clicked', { source: 'footer' })}
              >
                <Github className="h-4 w-4" />
              </a>
              <a
                href="https://www.npmjs.com/package/featuredrop"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-all hover:border-slate-300 hover:text-slate-700 hover:scale-110 dark:border-white/10 dark:text-slate-400 dark:hover:border-white/20 dark:hover:text-white"
                aria-label="npm"
                onClick={() => trackDocsEvent('outbound_npm_clicked', { source: 'footer' })}
              >
                <Package className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Nav columns */}
          <div className="md:col-span-7 grid gap-8 sm:grid-cols-3">
            <div className="space-y-4">
              <span className="text-xs font-bold uppercase tracking-[0.1em] text-slate-900/50 dark:text-white/40">Resources</span>
              <div className="flex flex-col gap-2.5">
                {resourceLinks.map((link) => (
                  <Link
                    key={link.label}
                    className="text-sm text-slate-600 transition-colors hover:text-brand dark:text-slate-400 dark:hover:text-brand-light"
                    href={link.href}
                    onClick={() => trackDocsEvent(link.event, { source: 'footer' })}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <span className="text-xs font-bold uppercase tracking-[0.1em] text-slate-900/50 dark:text-white/40">Community</span>
              <div className="flex flex-col gap-2.5">
                {communityLinks.map((link) => (
                  <a
                    key={link.label}
                    className="text-sm text-slate-600 transition-colors hover:text-brand dark:text-slate-400 dark:hover:text-brand-light"
                    href={link.href}
                    onClick={() => trackDocsEvent(link.event, { source: 'footer' })}
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <span className="text-xs font-bold uppercase tracking-[0.1em] text-slate-900/50 dark:text-white/40">Legal</span>
              <div className="flex flex-col gap-2.5">
                {legalLinks.map((link) => (
                  <a
                    key={link.label}
                    className="text-sm text-slate-600 transition-colors hover:text-brand dark:text-slate-400 dark:hover:text-brand-light"
                    href={link.href}
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-slate-200/50 dark:border-white/5">
          <p className="text-xs text-slate-500 dark:text-slate-500">
            &copy; {currentYear} <a className="font-medium hover:text-brand transition-colors" href="https://glincker.com">GLINR Studios / GLINCKER</a>. All rights reserved.
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-600">
            Built and battle-tested at{' '}
            <a className="font-medium text-slate-500 hover:text-brand dark:text-slate-400 transition-colors" href="https://askverdict.ai">AskVerdict AI</a>
          </p>
        </div>
      </div>
    </footer>
  )
}

// --- Main Page ---
export default function HomePage() {
  const isScrolled = useScrollDirection()
  const typewriterText = useTypewriter(heroTaglines)

  // Auto-detect site URL: env var → featuredrop.dev default
  const SITE_URL =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (typeof window !== 'undefined' && window.location.origin) ||
    'https://featuredrop.dev'

  const OG_IMAGE = `${SITE_URL}/og/og.png`

  return (
    <>
      <Head>
        {/* ── Primary ── */}
        <title>FeatureDrop — Open-Source Product Adoption Toolkit for React</title>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta
          name="description"
          content="FeatureDrop is a free, open-source React toolkit replacing Beamer and Pendo. Ship changelogs, guided tours, onboarding checklists, hotspots, and feedback widgets — from your own codebase. No SaaS fees. < 3 kB core. MIT licensed."
        />
        <meta
          name="keywords"
          content="FeatureDrop, product adoption, changelog widget, react onboarding, feature announcement, guided tours, in-app checklist, hotspot, feature flag, open source, PLG, product-led growth, Beamer alternative, Pendo alternative, Appcues alternative, react toolkit, user onboarding, announcement modal, GLINR Studios"
        />
        <meta name="author" content="GLINR STUDIOS" />
        <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
        <meta name="theme-color" content="#ea580c" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#0a0d14" media="(prefers-color-scheme: dark)" />

        {/* ── Favicons ── */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/favicons/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />

        {/* ── Canonical ── */}
        <link rel="canonical" href={SITE_URL} />

        {/* ── Open Graph ── */}
        <meta property="og:site_name" content="FeatureDrop" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={SITE_URL} />
        <meta property="og:title" content="FeatureDrop — Open-Source Product Adoption Toolkit" />
        <meta
          property="og:description"
          content="Free, open-source React toolkit. Ship changelogs, tours, checklists, hotspots, and feedback widgets from your own codebase. No SaaS fees. < 3 kB core."
        />
        <meta property="og:image" content={OG_IMAGE} />
        <meta property="og:image:secure_url" content={OG_IMAGE} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:type" content="image/png" />
        <meta property="og:image:alt" content="FeatureDrop — The open-source product adoption toolkit. Changelogs, tours, checklists, and hotspots for React." />
        <meta property="og:locale" content="en_US" />

        {/* ── Twitter / X ── */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@glinrstudios" />
        <meta name="twitter:creator" content="@glinrstudios" />
        <meta name="twitter:title" content="FeatureDrop — Open-Source Product Adoption Toolkit" />
        <meta
          name="twitter:description"
          content="Free, open-source React toolkit. Ship changelogs, tours, checklists, and hotspots — no SaaS fees. < 3 kB core. MIT licensed."
        />
        <meta name="twitter:image" content={OG_IMAGE} />
        <meta name="twitter:image:alt" content="FeatureDrop product preview — changelog widget, tours, checklists" />

        {/* ── Preconnects ── */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

        {/* ── JSON-LD: SoftwareApplication ── */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: 'FeatureDrop',
              applicationCategory: 'DeveloperApplication',
              operatingSystem: 'Web',
              description:
                'Open-source React toolkit for product adoption — in-app tours, checklists, changelog widgets, hotspots, and feature announcements. Free forever, MIT licensed.',
              url: SITE_URL,
              image: OG_IMAGE,
              offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
              author: {
                '@type': 'Organization',
                name: 'GLINR STUDIOS',
                url: 'https://glincker.com',
                logo: `${SITE_URL}/branding/icon-256.png`,
                sameAs: ['https://github.com/GLINCKER', 'https://twitter.com/glinrstudios'],
              },
              license: 'https://opensource.org/licenses/MIT',
              codeRepository: 'https://github.com/GLINCKER/featuredrop',
              programmingLanguage: ['TypeScript', 'JavaScript', 'React'],
              keywords:
                'product adoption, feature announcement, react onboarding, changelog, hotspot, checklist, guided tours, open source, Beamer alternative, Pendo alternative',
            }),
          }}
        />

        {/* ── JSON-LD: Organization ── */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'GLINR STUDIOS',
              alternateName: 'GLINCKER',
              url: 'https://glincker.com',
              logo: `${SITE_URL}/branding/icon-256.png`,
              sameAs: ['https://github.com/GLINCKER', 'https://twitter.com/glinrstudios'],
            }),
          }}
        />

        {/* ── JSON-LD: FAQPage (enables Google FAQ rich results) ── */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: [
                {
                  '@type': 'Question',
                  name: 'What is FeatureDrop?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'FeatureDrop is a free, open-source product adoption toolkit for React. It provides changelog widgets, guided tours, onboarding checklists, hotspots, banners, toasts, feedback widgets, and surveys — all from your own codebase with zero SaaS fees.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'Is FeatureDrop free?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Yes, FeatureDrop is 100% free and open-source under the MIT license. There are no paid tiers, no usage limits, and no tracking. You own your data.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'How does FeatureDrop compare to Beamer and Pendo?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Unlike Beamer ($49–249/mo) and Pendo ($7k+/yr), FeatureDrop is free and self-hosted. The core bundle is under 3 kB gzipped versus Pendo\'s ~300 kB agent. FeatureDrop includes tours, checklists, feedback, and feature flags that Beamer lacks, all without vendor lock-in.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'What frameworks does FeatureDrop support?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'FeatureDrop supports React, Vue 3, Svelte 5, Solid.js, Preact, Angular, Web Components, and vanilla JavaScript. The core engine is framework-agnostic with dedicated bindings for each framework.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'How big is FeatureDrop?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'The core engine is under 3 kB gzipped with zero production dependencies. React bindings add about 12 kB. Everything is tree-shakable via subpath exports so you only ship what you use.',
                  },
                },
              ],
            }),
          }}
        />

        {/* ── JSON-LD: WebSite (enables Google Sitelinks Search Box) ── */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'FeatureDrop',
              url: SITE_URL,
              description:
                'Documentation and homepage for FeatureDrop — the open-source product adoption toolkit for React.',
              potentialAction: {
                '@type': 'SearchAction',
                target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/docs?q={search_term_string}` },
                'query-input': 'required name=search_term_string',
              },
            }),
          }}
        />
      </Head>
    <main className="relative min-h-screen overflow-hidden">
      <ScrollProgressBar />

      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-fd-ambient dark:bg-fd-ambient-dark mix-blend-multiply dark:mix-blend-soft-light" />

      {/* Floating orbs */}
      <div className="pointer-events-none fixed left-[10%] top-[20%] z-0 h-[400px] w-[400px] animate-float rounded-full bg-brand-light/40 blur-[120px] dark:bg-brand/30" />
      <div className="pointer-events-none fixed bottom-[10%] right-[10%] z-0 h-[500px] w-[500px] animate-float-delayed rounded-full bg-indigo-300/30 blur-[150px] dark:bg-indigo-900/40" />
      <div className="pointer-events-none fixed left-[40%] top-[60%] z-0 h-[300px] w-[300px] animate-float rounded-full bg-acid/20 blur-[100px] dark:bg-acid/10" style={{ animationDuration: '12s' }} />
      <div className="pointer-events-none fixed right-[40%] top-[10%] z-0 h-[600px] w-[600px] animate-float-delayed rounded-full bg-rose-300/20 blur-[140px] dark:bg-rose-900/20" style={{ animationDuration: '15s' }} />

      {/* Glass header */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 pt-4 px-4 ${isScrolled ? 'top-2' : ''}`}>
        <div className={`mx-auto max-w-6xl transition-all duration-500 rounded-3xl ${isScrolled ? 'fd-glass border-white/60 bg-white/70 shadow-glass py-3 px-5 dark:border-white/10 dark:bg-slate-900/70' : 'bg-transparent border-transparent py-4 px-2'}`}>
          <div className="flex items-center justify-between">
            <Link href="/" className="transition-opacity hover:opacity-80"><FeatureDropLogoLockup /></Link>
            <nav className="flex items-center gap-3 md:gap-4">
              <Link
                className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                href="/docs"
                onClick={() => trackDocsEvent('landing_docs_clicked', { source: 'nav' })}
              >
                Docs
              </Link>
              <Link
                className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hidden sm:inline"
                href="/docs/quickstart"
                onClick={() => trackDocsEvent('landing_quickstart_clicked', { source: 'nav' })}
              >
                Quickstart
              </Link>
              <Link
                className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hidden md:inline"
                href="/docs/components/gallery"
                onClick={() => trackDocsEvent('landing_gallery_clicked', { source: 'nav' })}
              >
                Components
              </Link>
              <div className="hidden h-5 w-px bg-slate-300/50 md:block dark:bg-slate-700/50" />
              <ThemeToggle />
              <a
                className="hidden md:flex fd-glass-surface h-9 w-9 items-center justify-center rounded-full !p-0 transition-transform hover:scale-110 active:scale-95"
                href="https://github.com/GLINCKER/featuredrop"
                aria-label="GitHub"
                onClick={() => trackDocsEvent('outbound_github_clicked', { source: 'nav' })}
              >
                <Github className="h-[18px] w-[18px] text-slate-700 dark:text-slate-300" />
              </a>
              <Link
                className="fd-cta !px-4 !py-2 !text-xs hidden sm:inline-flex"
                href="/playground"
                onClick={() => trackDocsEvent('landing_playground_clicked', { source: 'nav' })}
              >
                Playground
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <div className="relative z-10 mx-auto max-w-6xl px-4 pt-32 pb-16 md:px-8">

        {/* ──── HERO ──── */}
        <section className="relative flex min-h-[70vh] flex-col items-center justify-center text-center">
          <div className="animate-fade-in-up space-y-8">
            <div className="inline-flex items-center justify-center transform transition-transform hover:scale-105 duration-300">
              <span className="fd-chip shadow-[0_0_20px_rgba(99,102,241,0.2)]">Free &amp; Open Source</span>
            </div>

            <h1 className="mx-auto max-w-4xl font-display text-5xl font-extrabold leading-[1.1] tracking-tight text-slate-900 md:text-7xl lg:text-[80px] dark:text-white">
              The open&#8209;source <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-brand bg-clip-text text-transparent animate-gradient-shift bg-[length:200%_200%]">product&nbsp;adoption</span> toolkit.
            </h1>

            <p className="mx-auto max-w-2xl text-lg leading-relaxed text-slate-600 md:text-xl dark:text-slate-300/90 min-h-[3.5rem]">
              <span aria-hidden="true">{typewriterText}<span className="fd-typewriter-cursor" /></span>
              <span className="sr-only">Ship changelogs from your own codebase. Drop your SaaS adoption bill to $0. Onboard users with guided tours. Under 3 kB. Zero dependencies.</span>
            </p>

            {/* Stats */}
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 pt-2 text-sm text-slate-500 dark:text-slate-400">
              <span className="font-mono font-semibold text-brand">{'<'} 3 kB core</span>
              <span className="hidden sm:inline text-slate-300 dark:text-slate-700">|</span>
              <span>374 tests</span>
              <span className="hidden sm:inline text-slate-300 dark:text-slate-700">|</span>
              <span>15 React components</span>
              <span className="hidden sm:inline text-slate-300 dark:text-slate-700">|</span>
              <span>8 frameworks</span>
              <span className="hidden sm:inline text-slate-300 dark:text-slate-700">|</span>
              <span>MIT licensed</span>
            </div>

            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row pt-4">
              <Link
                className="fd-cta group w-full justify-center sm:w-auto text-base px-8 py-3.5"
                href="/docs/quickstart"
                onClick={() => trackDocsEvent('landing_quickstart_clicked', { source: 'hero' })}
              >
                Start quickstart
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                className="fd-cta-secondary group w-full justify-center sm:w-auto text-base px-8 py-3.5"
                href="/playground"
                onClick={() => trackDocsEvent('landing_playground_clicked', { source: 'hero' })}
              >
                Open playground
                <TerminalSquare className="ml-2 h-4 w-4 text-slate-400 dark:text-slate-500" />
              </Link>
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-scroll-indicator">
            <ChevronDown className="h-6 w-6 text-slate-400 dark:text-slate-600" />
          </div>
        </section>

        {/* ──── SOCIAL PROOF ──── */}
        <RevealSection delay={0}>
          <SocialProofStrip />
        </RevealSection>

        {/* ──── CODE SNIPPET ──── */}
        <RevealSection delay={100}>
          <CodeSnippetSection />
        </RevealSection>

        {/* ──── VALUE PROPOSITIONS ──── */}
        <RevealSection delay={100}>
          <section className="my-16 md:my-24">
            <div className="grid gap-6 md:grid-cols-3">
              {valueCards.map((card, i) => {
                const Icon = card.icon
                return (
                  <RevealSection key={card.title} delay={i * 100}>
                    <InteractiveCard glow tilt className="fd-glass-surface fd-gradient-border p-8 h-full space-y-4 group">
                      <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition-all group-hover:bg-brand group-hover:text-white dark:bg-slate-800 dark:text-slate-300 dark:group-hover:bg-brand relative z-10">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-white relative z-10">{card.title}</h3>
                      <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400 relative z-10">{card.body}</p>
                    </InteractiveCard>
                  </RevealSection>
                )
              })}
            </div>
          </section>
        </RevealSection>

        {/* ──── LIVE COMPONENT SHOWCASE ──── */}
        <RevealSection delay={100}>
          <ComponentShowcase />
        </RevealSection>

        {/* ──── FEATURE SHOWCASES ──── */}
        <RevealSection delay={100}>
          <FeatureShowcaseLeft />
        </RevealSection>

        <RevealSection delay={100}>
          <FeatureShowcaseRight />
        </RevealSection>

        {/* ──── HOW EASY ──── */}
        <HowEasySection />

        {/* ──── IMPACT STATS ──── */}
        <ImpactStatsSection />

        {/* ──── COMPARISON ──── */}
        <ComparisonSection />

        {/* ──── BUILT FOR ──── */}
        <BuiltForSection />

        {/* ──── LAUNCH SEQUENCE ──── */}
        <LaunchSequenceSection />

        {/* ──── OSS CTA ──── */}
        <RevealSection delay={100}>
          <OpenSourceCTA />
        </RevealSection>

        {/* ──── FOOTER ──── */}
        <Footer />
      </div>
    </main>
    </>
  )
}
