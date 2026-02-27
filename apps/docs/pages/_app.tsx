import 'nextra-theme-docs/style.css'
import '../styles/globals.css'
import type { AppProps } from 'next/app'

export default function DocsApp({ Component, pageProps }: AppProps) {
  return (
    <main className="font-body tracking-tight" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
      <Component {...pageProps} />
    </main>
  )
}
