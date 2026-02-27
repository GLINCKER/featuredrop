import { useEffect } from 'react'

const ANALYTICS_ENDPOINT = process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT

type ForwardPayload = {
  type: 'event' | 'page_view'
  eventName?: string
  payload: Record<string, unknown>
  sentAt: string
}

function sendToEndpoint(body: ForwardPayload): void {
  if (!ANALYTICS_ENDPOINT || typeof window === 'undefined') return

  const json = JSON.stringify(body)
  if (typeof navigator.sendBeacon === 'function') {
    const blob = new Blob([json], { type: 'application/json' })
    if (navigator.sendBeacon(ANALYTICS_ENDPOINT, blob)) return
  }

  void fetch(ANALYTICS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: json,
    keepalive: true
  }).catch(() => {
    // docs telemetry should never interrupt the docs UI
  })
}

export function DocsAnalyticsForwarder(): null {
  useEffect(() => {
    if (!ANALYTICS_ENDPOINT || typeof window === 'undefined') return

    const onDocsEvent = (event: Event): void => {
      const detail = (event as CustomEvent<{ eventName: string; payload: Record<string, unknown> }>).detail
      if (!detail?.eventName || !detail.payload) return
      sendToEndpoint({
        type: 'event',
        eventName: detail.eventName,
        payload: detail.payload,
        sentAt: new Date().toISOString()
      })
    }

    const onPageView = (event: Event): void => {
      const detail = (event as CustomEvent<Record<string, unknown>>).detail
      if (!detail) return
      sendToEndpoint({
        type: 'page_view',
        payload: detail,
        sentAt: new Date().toISOString()
      })
    }

    window.addEventListener('featuredrop:docs-analytics', onDocsEvent as EventListener)
    window.addEventListener('featuredrop:docs-pageview', onPageView as EventListener)

    return () => {
      window.removeEventListener('featuredrop:docs-analytics', onDocsEvent as EventListener)
      window.removeEventListener('featuredrop:docs-pageview', onPageView as EventListener)
    }
  }, [])

  return null
}
