export type DocsEventName =
  | 'landing_quickstart_clicked'
  | 'landing_playground_clicked'
  | 'landing_docs_clicked'
  | 'landing_gallery_clicked'
  | 'launch_path_clicked'
  | 'quickstart_completed'
  | 'quickstart_playground_clicked'
  | 'playground_template_opened'
  | 'outbound_github_clicked'
  | 'outbound_npm_clicked'

type DocsEventProps = Record<string, string | number | boolean | undefined>

type PlausibleFn = (eventName: string, options?: { props?: DocsEventProps }) => void
type GtagFn = (...args: unknown[]) => void

export function trackDocsEvent(eventName: DocsEventName, props: DocsEventProps = {}): void {
  if (typeof window === 'undefined') return

  const payload: DocsEventProps = {
    ...props,
    path: window.location.pathname
  }

  const plausible = (window as Window & { plausible?: PlausibleFn }).plausible
  if (typeof plausible === 'function') plausible(eventName, { props: payload })

  const gtag = (window as Window & { gtag?: GtagFn }).gtag
  if (typeof gtag === 'function') gtag('event', eventName, payload)

  const dataLayer = (window as Window & { dataLayer?: unknown[] }).dataLayer
  if (Array.isArray(dataLayer)) dataLayer.push({ event: eventName, ...payload })

  window.dispatchEvent(
    new CustomEvent('featuredrop:docs-analytics', { detail: { eventName, payload } })
  )
}
