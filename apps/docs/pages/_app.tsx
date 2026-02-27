import 'nextra-theme-docs/style.css'
import '../styles/globals.css'
import type { AppProps } from 'next/app'

export default function DocsApp({ Component, pageProps }: AppProps) {
  return (
    <main className="font-body tracking-tight">
      <Component {...pageProps} />
    </main>
  )
}
