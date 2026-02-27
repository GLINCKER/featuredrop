import { useEffect, useState } from 'react'
import { MoonStar, SunMedium } from 'lucide-react'

const STORAGE_KEY = 'theme'

function resolveInitialTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') {
    return 'light'
  }

  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') {
    return stored
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(theme: 'light' | 'dark') {
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
  window.localStorage.setItem(STORAGE_KEY, theme)
}

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    const nextTheme = resolveInitialTheme()
    setTheme(nextTheme)
    applyTheme(nextTheme)
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <span className="fd-cta-secondary inline-flex h-8 w-8 items-center justify-center !px-0 !py-0" aria-hidden="true" />
    )
  }

  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      className="fd-glass-surface flex h-9 w-9 items-center justify-center rounded-full !p-0 transition-transform hover:scale-110 active:scale-95"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={() => {
        const nextTheme = isDark ? 'light' : 'dark'
        setTheme(nextTheme)
        applyTheme(nextTheme)
      }}
    >
      {isDark ? (
        <SunMedium className="h-[18px] w-[18px] text-amber-500/90 transition-all hover:text-amber-400" />
      ) : (
        <MoonStar className="h-[18px] w-[18px] text-indigo-500/90 transition-all hover:text-indigo-600" />
      )}
    </button>
  )
}
