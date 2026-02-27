import { useEffect, useRef } from 'react'
import { useRouter } from 'next/router'

type GtagFn = (...args: unknown[]) => void

function trackPageView(path: string): void {
  if (typeof window === 'undefined') return

  const payload = {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title
  }

  const gtag = (window as Window & { gtag?: GtagFn }).gtag
  if (typeof gtag === 'function') gtag('event', 'page_view', payload)

  const dataLayer = (window as Window & { dataLayer?: unknown[] }).dataLayer
  if (Array.isArray(dataLayer)) dataLayer.push({ event: 'page_view', ...payload })

  window.dispatchEvent(new CustomEvent('featuredrop:docs-pageview', { detail: payload }))
}

export function DocsPageviewTracker(): null {
  const router = useRouter()
  const lastTrackedPath = useRef<string>('')

  useEffect(() => {
    const handleRouteChange = (url: string): void => {
      if (url === lastTrackedPath.current) return
      lastTrackedPath.current = url
      trackPageView(url)
    }

    handleRouteChange(router.asPath)
    router.events.on('routeChangeComplete', handleRouteChange)
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange)
    }
  }, [router])

  return null
}
