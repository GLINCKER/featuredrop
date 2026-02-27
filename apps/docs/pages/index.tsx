import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { ArrowRight, BookOpen, FlaskConical, Github, Layers, Rocket, ShieldCheck, Workflow, Component, Activity, TerminalSquare, Bell, Navigation, CheckCircle2 } from 'lucide-react'
import { FeatureDropLogoLockup } from '../components/featuredrop-logo'
import { ThemeToggle } from '../components/theme-toggle'
import { trackDocsEvent } from '../components/docs-analytics'

// --- Types ---
type ValueCard = {
  title: string
  body: string
  icon: LucideIcon
  href?: string
}

// --- Data ---
const valueCards: ValueCard[] = [
  {
    title: 'Launch UX in one package',
    body: 'Changelog, tours, checklists, and feedback surfaces share one manifest and one provider contract.',
    icon: Layers
  },
  {
    title: 'Built for production',
    body: 'Schema validation, offline-safe adapters, retry controls, and security checks are already wired.',
    icon: ShieldCheck
  },
  {
    title: 'Headless by default',
    body: 'Use our default components or map core primitives directly into your own design system without lock-in.',
    icon: Workflow
  }
]

const launchPaths: ValueCard[] = [
  {
    title: 'Read quickstart',
    body: 'Ship your first visible badge and changelog entry in about 10 minutes.',
    icon: BookOpen,
    href: '/docs/quickstart'
  },
  {
    title: 'Try live playground',
    body: 'Use local sandbox or hosted templates to validate copy and rollout sequences.',
    icon: FlaskConical,
    href: '/playground'
  },
  {
    title: 'Go to production',
    body: 'Enable CI checks, choose your adapter strategy, and roll out feature messaging safely.',
    icon: Rocket,
    href: '/docs/automation/ci'
  }
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

function useIntersectionObserver() {
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
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    )

    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return { ref, isVisible }
}

// --- Components ---
function RevealSection({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const { ref, isVisible } = useIntersectionObserver()

  return (
    <div
      // @ts-ignore
      ref={ref}
      className={`transition-all duration-1000 ease-out will-change-[opacity,transform] ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-24'
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

function FeatureShowcaseLeft() {
  return (
    <div className="flex flex-col items-center gap-12 md:flex-row lg:gap-24 my-32">
      <div className="flex-1 space-y-6">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400">
          <Bell className="h-6 w-6" />
        </div>
        <h3 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-white md:text-4xl">Changelog Widget</h3>
        <p className="text-lg leading-relaxed text-slate-600 dark:text-slate-400">
          Drop a fully functional, headless changelog widget into your app. Announce multiple release notes, collect reactions, and sync read-states without writing complex database glue code.
        </p>
        <ul className="space-y-3 pt-4 text-slate-700 dark:text-slate-300">
          <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-brand" /> Markdown support with Shiki highlighting</li>
          <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-brand" /> Instant emoji reaction syncing</li>
          <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-brand" /> Custom badge anchoring</li>
        </ul>
      </div>
      
      {/* Mock UI Representation */}
      <div className="relative flex-1 w-full max-w-sm">
        <div className="absolute -inset-4 rounded-3xl bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 blur-xl dark:from-indigo-500/10 dark:to-purple-500/10" />
        <div className="relative fd-glass-surface flex flex-col overflow-hidden p-0 h-[450px]">
          <div className="bg-slate-50 border-b border-slate-200/50 p-4 shrink-0 dark:bg-slate-900/50 dark:border-white/5 flex items-center justify-between">
            <span className="font-semibold text-slate-900 dark:text-white">What's New</span>
            <span className="text-xs text-slate-500">Mark all read</span>
          </div>
          <div className="flex-1 p-5 space-y-6 overflow-hidden">
             
             {/* Mock Entry 1 */}
             <div className="space-y-3">
               <div className="flex items-center gap-2">
                 <span className="fd-chip !bg-brand !text-white !border-transparent py-0.5">New</span>
                 <span className="text-xs text-slate-500">Today</span>
               </div>
               <h4 className="font-bold text-slate-900 dark:text-white">Dark Mode Parity</h4>
               <p className="text-sm text-slate-600 dark:text-slate-300">We've completely overhauled the UI to support gorgeous dark mode gradients.</p>
               <div className="h-32 w-full rounded-lg bg-slate-200 dark:bg-slate-800/50 animate-pulse-glow" />
             </div>
             
          </div>
        </div>
      </div>
    </div>
  )
}

function FeatureShowcaseRight() {
  return (
    <div className="flex flex-col-reverse items-center gap-12 md:flex-row lg:gap-24 my-32">
      
      {/* Mock UI Representation */}
      <div className="relative flex-1 w-full max-w-sm">
        <div className="absolute -inset-4 rounded-3xl bg-gradient-to-tl from-teal-500/20 to-emerald-500/20 blur-xl dark:from-teal-500/10 dark:to-emerald-500/10" />
        <div className="relative fd-glass-surface flex flex-col gap-3 p-6">
          <div className="bg-slate-100 rounded-lg p-4 pl-12 relative dark:bg-slate-800/50">
            <div className="absolute -left-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-brand flex items-center justify-center text-white ring-8 ring-white dark:ring-slate-950 font-bold z-10 shadow-glass">1</div>
            <p className="text-sm font-medium text-slate-900 dark:text-white">Welcome Interface</p>
          </div>
          <div className="bg-white border-2 border-brand rounded-lg p-4 pl-12 relative shadow-glow-primary dark:bg-slate-900">
            <div className="absolute -left-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-brand flex items-center justify-center text-white ring-8 ring-white dark:ring-slate-950 font-bold z-10 shadow-glass">2</div>
            <p className="text-sm font-medium text-brand">Connect Data Source</p>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Click the button below to link your Postgres DB.</p>
          </div>
          <div className="bg-slate-100 rounded-lg p-4 pl-12 relative opacity-50 dark:bg-slate-800/50">
            <div className="absolute -left-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-slate-300 flex items-center justify-center text-slate-600 ring-8 ring-white dark:ring-slate-950 font-bold z-10 dark:bg-slate-700 dark:text-slate-400">3</div>
            <p className="text-sm font-medium text-slate-900 dark:text-white">Deploy Sync</p>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-6">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-100 text-teal-600 dark:bg-teal-900/50 dark:text-teal-400">
          <Navigation className="h-6 w-6" />
        </div>
        <h3 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-white md:text-4xl">Tours & Onboarding</h3>
        <p className="text-lg leading-relaxed text-slate-600 dark:text-slate-400">
          Orchestrate complex product tours and interactive checklists directly in your React tree. Our throttler ensures users aren't bombarded with popups.
        </p>
        <ul className="space-y-3 pt-4 text-slate-700 dark:text-slate-300">
          <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-brand" /> Smart popup throttling & Do Not Disturb</li>
          <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-brand" /> Deep link directly into tour steps</li>
          <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-brand" /> Progress persistence across devices</li>
        </ul>
      </div>
    </div>
  )
}

export default function HomePage() {
  const isScrolled = useScrollDirection()

  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Absolute Ambient Background */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-fd-ambient dark:bg-fd-ambient-dark mix-blend-multiply dark:mix-blend-soft-light" />
      
      {/* Floating Animated Orbs for Premium Motion */}
      <div className="pointer-events-none fixed left-[10%] top-[20%] z-0 h-[400px] w-[400px] animate-float rounded-full bg-brand-light/40 blur-[120px] dark:bg-brand/30" />
      <div className="pointer-events-none fixed bottom-[10%] right-[10%] z-0 h-[500px] w-[500px] animate-float-delayed rounded-full bg-indigo-300/30 blur-[150px] dark:bg-indigo-900/40" />
      <div className="pointer-events-none fixed left-[40%] top-[60%] z-0 h-[300px] w-[300px] animate-float rounded-full bg-acid/20 blur-[100px] dark:bg-acid/10" style={{ animationDuration: '12s' }} />
      <div className="pointer-events-none fixed right-[40%] top-[10%] z-0 h-[600px] w-[600px] animate-float-delayed rounded-full bg-rose-300/20 blur-[140px] dark:bg-rose-900/20" style={{ animationDuration: '15s' }} />

      {/* Floating Glass Header (Animated Sticky) */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 pt-4 px-4 ${isScrolled ? 'top-2' : ''}`}>
        <div className={`mx-auto max-w-6xl transition-all duration-500 rounded-3xl ${isScrolled ? 'fd-glass border-white/60 bg-white/70 shadow-glass py-3 px-5 dark:border-white/10 dark:bg-slate-900/70' : 'bg-transparent border-transparent py-4 px-2'}`}>
          <div className="flex items-center justify-between">
            <FeatureDropLogoLockup />
            <nav className="flex items-center gap-3 md:gap-4">
              <Link
                className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                href="/docs"
                onClick={() => trackDocsEvent('landing_docs_clicked', { source: 'nav' })}
              >
                Docs
              </Link>
              <Link
                className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                href="/docs/quickstart"
                onClick={() => trackDocsEvent('landing_quickstart_clicked', { source: 'nav' })}
              >
                Quickstart
              </Link>
              <div className="hidden h-5 w-px bg-slate-300/50 md:block dark:bg-slate-700/50" />
              <ThemeToggle />
              <a
                className="hidden fd-glass-surface flex h-9 w-9 items-center justify-center rounded-full !p-0 transition-transform hover:scale-110 active:scale-95 md:flex"
                href="https://github.com/GLINCKER/featuredrop"
                aria-label="GitHub"
                onClick={() => trackDocsEvent('outbound_github_clicked', { source: 'nav' })}
              >
                <Github className="h-[18px] w-[18px] text-slate-700 transition-colors hover:text-slate-900 dark:text-slate-300 dark:hover:text-white" />
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

      <div className="relative z-10 mx-auto max-w-6xl space-y-24 px-4 pt-32 pb-16 md:space-y-32 md:px-8">
        
        {/* Hero Section */}
        <section className="relative flex min-h-[60vh] flex-col items-center justify-center text-center">
          <div className="animate-fade-in-up space-y-8">
            <div className="inline-flex items-center justify-center transform transition-transform hover:scale-105 duration-300">
              <span className="fd-chip shadow-[0_0_20px_rgba(99,102,241,0.2)]">Open Source React Components</span>
            </div>
            
            <h1 className="mx-auto max-w-4xl font-display text-5xl font-extrabold leading-[1.15] tracking-tight text-slate-900 md:text-7xl lg:text-[80px] dark:text-white">
              Build beautiful <span className="bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">changelogs</span> and product tours.
            </h1>
            
            <p className="mx-auto max-w-2xl text-lg leading-relaxed text-slate-600 md:text-xl dark:text-slate-300/90">
              FeatureDrop is a production-ready UI kit for building in-app announcements, guided onboarding, and feedback loops. Keep your data on-premise instead of paying per-MAU for expensive SaaS tools.
            </p>
            
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
        </section>

        {/* Feature Demos Left/Right */}
        <RevealSection delay={100}>
          <FeatureShowcaseLeft />
        </RevealSection>
        
        <RevealSection delay={100}>
          <FeatureShowcaseRight />
        </RevealSection>

        {/* Launch Paths */}
        <RevealSection delay={200}>
          <section className="fd-glass p-8 md:p-14 mb-24 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent dark:from-white/5 pointer-events-none" />
            <div className="mx-auto max-w-2xl text-center relative z-10">
              <h2 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Your launch sequence</h2>
              <p className="mt-3 text-lg text-slate-600 dark:text-slate-400">
                A practical path to replacing expensive vendor lock-in today.
              </p>
            </div>
            <div className="mt-12 grid gap-6 md:grid-cols-3 relative z-10">
              {launchPaths.map((item, idx) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.title}
                    href={item.href || '/docs'}
                    className="fd-glass-surface flex flex-col items-center text-center p-8 group transform transition-all duration-300 hover:scale-105"
                    onClick={() =>
                      trackDocsEvent('launch_path_clicked', {
                        source: 'launch_paths',
                        destination: item.href || '/docs',
                        title: item.title
                      })
                    }
                  >
                    <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-600 ring-4 ring-white transition-all group-hover:bg-brand group-hover:text-white group-hover:ring-brand/20 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-900 dark:group-hover:bg-brand dark:group-hover:text-white dark:group-hover:ring-brand/20">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-white">{item.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{item.body}</p>
                  </Link>
                )
              })}
            </div>
          </section>
        </RevealSection>

        {/* Polished Glass Footer */}
        <RevealSection delay={0}>
          <footer className="fd-glass mt-auto flex flex-col gap-8 p-8 md:flex-row md:items-start md:justify-between dark:border-white/5 relative z-10">
            <div className="space-y-3">
              <FeatureDropLogoLockup>
                <span className="opacity-80">FeatureDrop</span>
              </FeatureDropLogoLockup>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
                Built and battle-tested at <a className="text-slate-700 hover:text-brand dark:text-slate-300 font-medium underline-offset-4 hover:underline transition-colors" href="https://askverdict.ai">AskVerdict AI</a>. A <a className="text-slate-700 hover:text-brand dark:text-slate-300 font-medium underline-offset-4 hover:underline transition-colors" href="https://glincker.com">GLINR STUDIOS / GLINCKER</a> open source project.
              </p>
            </div>
            
            <div className="flex flex-col gap-6 sm:flex-row sm:gap-16">
              <div className="flex flex-col gap-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-900/50 dark:text-white/40 mb-1">Resources</span>
                <Link
                  className="text-sm font-medium text-slate-600 transition-colors hover:text-brand dark:text-slate-400 dark:hover:text-brand-light"
                  href="/docs"
                  onClick={() => trackDocsEvent('landing_docs_clicked', { source: 'footer' })}
                >
                  Documentation
                </Link>
                <Link
                  className="text-sm font-medium text-slate-600 transition-colors hover:text-brand dark:text-slate-400 dark:hover:text-brand-light"
                  href="/docs/components/gallery"
                  onClick={() => trackDocsEvent('landing_docs_clicked', { source: 'footer_gallery' })}
                >
                  Component Gallery
                </Link>
                <Link
                  className="text-sm font-medium text-slate-600 transition-colors hover:text-brand dark:text-slate-400 dark:hover:text-brand-light"
                  href="/playground"
                  onClick={() => trackDocsEvent('landing_playground_clicked', { source: 'footer' })}
                >
                  Playground
                </Link>
              </div>
              <div className="flex flex-col gap-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-900/50 dark:text-white/40 mb-1">Community</span>
                <a
                  className="text-sm font-medium text-slate-600 transition-colors hover:text-brand dark:text-slate-400 dark:hover:text-brand-light"
                  href="https://github.com/GLINCKER/featuredrop"
                  onClick={() => trackDocsEvent('outbound_github_clicked', { source: 'footer' })}
                >
                  GitHub
                </a>
                <a
                  className="text-sm font-medium text-slate-600 transition-colors hover:text-brand dark:text-slate-400 dark:hover:text-brand-light"
                  href="https://www.npmjs.com/package/featuredrop"
                  onClick={() => trackDocsEvent('outbound_npm_clicked', { source: 'footer' })}
                >
                  npm
                </a>
              </div>
            </div>
          </footer>
        </RevealSection>
      </div>
    </main>
  )
}
