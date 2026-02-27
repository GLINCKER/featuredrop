import { trackDocsEvent } from '../components/docs-analytics'

const demos = [
  {
    title: 'Local React Sandbox',
    href: 'https://github.com/GLINCKER/featuredrop/tree/main/examples/sandbox-react',
    desc: 'Run the sandbox directly from your local repository with pnpm playground. Perfect for deep dives.',
    gradient: 'from-blue-500/20 to-cyan-500/20',
    borderHover: 'hover:border-cyan-400/50',
    icon: (
      <svg className="w-6 h-6 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    )
  },
  {
    title: 'StackBlitz Template',
    href: 'https://stackblitz.com/github/GLINCKER/featuredrop/tree/main/examples/sandbox-react',
    desc: 'Launch a rapid, browser-only environment for fast trials and instant feedback.',
    gradient: 'from-purple-500/20 to-pink-500/20',
    borderHover: 'hover:border-pink-400/50',
    icon: (
      <svg className="w-6 h-6 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    )
  },
  {
    title: 'CodeSandbox Template',
    href: 'https://codesandbox.io/p/sandbox/github/GLINCKER/featuredrop/tree/main/examples/sandbox-react',
    desc: 'Fork a fully hosted sandbox environment to build and share interactive demos instantly.',
    gradient: 'from-amber-500/20 to-orange-500/20',
    borderHover: 'hover:border-orange-400/50',
    icon: (
      <svg className="w-6 h-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
      </svg>
    )
  }
]

export default function PlaygroundPage() {
  return (
    <main className="relative min-h-[calc(100vh-4rem)] overflow-hidden w-full flex flex-col items-center py-20 px-6 sm:px-10 lg:px-16">
      {/* Dynamic Background Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-fuchsia-500/20 blur-[120px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-5xl mx-auto flex flex-col items-center">
        {/* Header Section */}
        <div className="text-center mb-16 space-y-6 max-w-3xl">
          <div className="inline-flex items-center justify-center rounded-full bg-white/5 px-3 py-1 text-sm font-medium text-slate-300 ring-1 ring-inset ring-white/10 backdrop-blur-md mb-4 shadow-sm">
             Interactive Environments
          </div>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-slate-900 via-slate-700 to-slate-500 dark:from-white dark:via-slate-200 dark:to-slate-400 drop-shadow-sm">
            FeatureDrop Playground
          </h1>
          <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl mx-auto">
            Experience the power of FeatureDrop in an isolated environment. Validate your manifest structure, customize component styling, and perfect your rollout flow before integrating it into production.
          </p>
        </div>

        {/* Action Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 w-full">
          {demos.map((demo) => (
            <a
              key={demo.title}
              href={demo.href}
              target="_blank"
              rel="noreferrer"
              onClick={() => trackDocsEvent('playground_template_opened', { target: demo.title })}
              className={`group relative flex flex-col rounded-3xl border border-slate-200/50 dark:border-white/10 bg-white/40 dark:bg-black/20 p-8 backdrop-blur-xl shadow-lg transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-black/10 dark:hover:shadow-white/5 overflow-hidden ${demo.borderHover}`}
            >
              {/* Subtle animated background gradient effect on hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${demo.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />
              
              <div className="relative z-10 flex flex-col h-full">
                <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/50 dark:bg-white/5 shadow-inner ring-1 ring-black/5 dark:ring-white/10 group-hover:scale-110 transition-transform duration-500">
                  {demo.icon}
                </div>
                
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3 tracking-tight group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-slate-900 group-hover:to-slate-600 dark:group-hover:from-white dark:group-hover:to-slate-300 transition-all duration-300">
                  {demo.title}
                </h3>
                
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-6 flex-grow">
                  {demo.desc}
                </p>
                
                <div className="mt-auto flex items-center text-sm font-semibold text-slate-900 dark:text-white group-hover:tracking-wide transition-all duration-300">
                  Launch Environment
                  <svg 
                    className="w-4 h-4 ml-2 mt-0.5 group-hover:translate-x-2 transition-transform duration-500" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </main>
  )
}
