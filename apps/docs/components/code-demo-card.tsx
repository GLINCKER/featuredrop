import { useEffect, useState, type ReactNode } from 'react'
import { ThemeProvider } from 'featuredrop/react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism'
import { Copy, Check } from 'lucide-react'

type CodeDemoCardProps = {
  title: string
  description: string
  code: string
  children: ReactNode
}

export function CodeDemoCard({ title, description, code, children }: CodeDemoCardProps) {
  const [tab, setTab] = useState<'preview' | 'code'>('preview')
  const [copied, setCopied] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (typeof document === 'undefined') return
    const root = document.documentElement
    const syncMode = () => {
      setIsDarkMode(root.classList.contains('dark') || root.getAttribute('data-theme') === 'dark')
    }
    syncMode()
    const observer = new MutationObserver(syncMode)
    observer.observe(root, { attributes: true, attributeFilter: ['class', 'data-theme'] })
    return () => observer.disconnect()
  }, [])

  const handleCopy = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(code)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch (err) {
      console.error('Failed to copy', err)
    }
  }

  if (!mounted) {
    return (
      <section className="my-8 overflow-hidden rounded-sm border-2 border-slate-900 bg-white shadow-[4px_4px_0_0_#0f172a] dark:border-slate-700 dark:bg-[#070b14] dark:shadow-[4px_4px_0_0_#000] min-h-[400px]">
        {/* Skeleton UI to prevent hydration mismatch while themes load */}
      </section>
    )
  }

  return (
    <section className="my-8 overflow-hidden rounded-sm border-2 border-slate-900 bg-white shadow-[4px_4px_0_0_#0f172a] dark:border-slate-700 dark:bg-[#070b14] dark:shadow-[4px_4px_0_0_#000]">
      <header className="flex flex-col gap-4 border-b-2 border-slate-900 p-0 sm:flex-row sm:items-end sm:justify-between dark:border-slate-700">
        <div className="p-4 pb-0 sm:pb-4 text-left">
          <h3 className="font-display text-lg font-bold uppercase tracking-tight text-slate-900 dark:text-white mb-1">{title}</h3>
          <p className="font-body text-xs text-slate-600 dark:text-slate-400">{description}</p>
        </div>
        
        <div className="flex px-4 sm:px-0 sm:pr-4">
          <button
            type="button"
            onClick={() => setTab('preview')}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${
              tab === 'preview'
                ? 'border-b-2 border-brand text-slate-900 dark:border-brand dark:text-white'
                : 'border-b-2 border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-500 dark:hover:text-slate-300'
            }`}
          >
            Preview
          </button>
          <button
            type="button"
            onClick={() => setTab('code')}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${
              tab === 'code'
                ? 'border-b-2 border-brand text-slate-900 dark:border-brand dark:text-white'
                : 'border-b-2 border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-500 dark:hover:text-slate-300'
            }`}
          >
            Code
          </button>
        </div>
      </header>
      
      {tab === 'preview' ? (
        <div className="relative min-h-[250px] p-6 sm:p-10 bg-slate-50/50 dark:bg-transparent">
          {/* Subtle grid background for the preview area */}
          <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:14px_24px]" />
          <div className="relative z-10 w-full h-full flex items-center justify-center">
            <ThemeProvider theme={isDarkMode ? 'dark' : 'light'}>{children}</ThemeProvider>
          </div>
        </div>
      ) : (
        <div className="flex max-h-[500px] w-full flex-col bg-[#0d1117] relative group">
          <div className="flex h-12 w-full items-center justify-between border-b border-white/5 px-4 sticky top-0 bg-[#0d1117]/90 backdrop-blur z-10">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-rose-500 border border-black/20" />
              <div className="h-3 w-3 rounded-full bg-amber-500 border border-black/20" />
              <div className="h-3 w-3 rounded-full bg-emerald-500 border border-black/20" />
              <span className="ml-3 font-mono text-[10px] font-bold tracking-widest text-slate-400">TYPESCRIPT</span>
            </div>
            <button
               onClick={handleCopy}
               className="inline-flex items-center justify-center h-8 w-8 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
               aria-label="Copy code to clipboard"
               title="Copy to clipboard"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          <div className="flex-1 overflow-auto text-[13px] nice-scrollbar" data-code-demo="">
            <SyntaxHighlighter
              language="tsx"
              style={vscDarkPlus}
              wrapLines={false}
              wrapLongLines={false}
              customStyle={{
                margin: 0,
                padding: '1.5rem',
                backgroundColor: 'transparent',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
              }}
              codeTagProps={{
                style: {
                  fontFamily: 'inherit',
                  lineHeight: '1.6',
                  whiteSpace: 'pre',
                  wordBreak: 'normal',
                  overflowWrap: 'normal',
                  display: 'block',
                }
              }}
            >
              {code.trim()}
            </SyntaxHighlighter>
          </div>
        </div>
      )}
    </section>
  )
}

