import React from 'react'
import type { DocsThemeConfig } from 'nextra-theme-docs'
import { FeatureDropLogoLockup } from './components/featuredrop-logo'
import { ThemeToggle } from './components/theme-toggle'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://featuredrop-docs.vercel.app'
const OG_IMAGE_URL = `${SITE_URL}/og/featuredrop-docs.svg`

const config: DocsThemeConfig = {
  logo: <FeatureDropLogoLockup />,
  project: {
    link: 'https://github.com/GLINCKER/featuredrop'
  },
  banner: {
    key: 'phase-i-docs-refresh',
    text: (
      <a href="/docs/quickstart" className="font-medium">
        Phase I docs refresh is live. Start with the 10-minute quickstart.
      </a>
    )
  },
  navbar: {
    extraContent: (
      <React.Fragment>
        <ThemeToggle />
        <a href="/playground" className="fd-cta-secondary !px-3 !py-1.5 !text-xs ml-4">
          Playground
        </a>
      </React.Fragment>
    )
  },
  docsRepositoryBase: 'https://github.com/GLINCKER/featuredrop/blob/main/apps/docs',
  darkMode: true,
  nextThemes: {
    defaultTheme: 'dark',
  },
  primaryHue: {
    light: 25,
    dark: 20
  },
  primarySaturation: {
    light: 90,
    dark: 85
  },
  search: {
    placeholder: 'Search docs...'
  },
  sidebar: {
    defaultMenuCollapseLevel: 2,
    toggleButton: true
  },
  editLink: {
    text: 'Suggest edits on GitHub'
  },
  useNextSeoProps() {
    return {
      titleTemplate: '%s - featuredrop docs'
    }
  },
  head: (
    <>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="description" content="FeatureDrop docs, guides, and live demos for changelog, tours, checklist, feedback, and rollout analytics." />
      <meta name="robots" content="index,follow" />
      <meta property="og:title" content="FeatureDrop docs" />
      <meta property="og:description" content="Open-source product adoption toolkit docs with live component demos." />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={SITE_URL} />
      <meta property="og:image" content={OG_IMAGE_URL} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="FeatureDrop docs" />
      <meta name="twitter:description" content="Guides, integrations, and live demos for FeatureDrop." />
      <meta name="twitter:image" content={OG_IMAGE_URL} />
      <link rel="canonical" href={SITE_URL} />
    </>
  ),
  footer: {
    text: (
      <span className="text-xs text-slate-600 dark:text-slate-300">
        MIT {new Date().getFullYear()} FeatureDrop - Built and battle-tested at{' '}
        <a className="underline-offset-2 hover:underline" href="https://askverdict.ai">
          AskVerdict AI
        </a>{' '}
        - a{' '}
        <a className="underline-offset-2 hover:underline" href="https://glincker.com">
          GLINR STUDIOS / GLINCKER
        </a>{' '}
        open source project.
      </span>
    )
  }
}

export default config
