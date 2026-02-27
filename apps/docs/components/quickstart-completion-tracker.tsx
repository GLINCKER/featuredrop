import { useEffect } from 'react'
import { trackDocsEvent } from './docs-analytics'

const SESSION_KEY = 'featuredrop:docs:quickstart:completed'
const TARGET_ID = 'quickstart-next-steps'

function alreadyTracked(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.sessionStorage.getItem(SESSION_KEY) === '1'
  } catch {
    return false
  }
}

function markTracked(): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(SESSION_KEY, '1')
  } catch {
    // ignore storage failures
  }
}

export function QuickstartCompletionTracker(): null {
  useEffect(() => {
    if (typeof window === 'undefined' || alreadyTracked()) return

    const target = document.getElementById(TARGET_ID)
    if (!target || typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((entry) => entry.isIntersecting)
        if (!visible) return
        markTracked()
        trackDocsEvent('quickstart_completed', { source: 'scroll-depth' })
        observer.disconnect()
      },
      { threshold: 0.35 }
    )

    observer.observe(target)
    return () => observer.disconnect()
  }, [])

  return null
}
