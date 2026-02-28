import React from 'react'
import type { DocsThemeConfig } from 'nextra-theme-docs'
import { FeatureDropLogoLockup } from './components/featuredrop-logo'
import { ThemeToggle } from './components/theme-toggle'

// Auto-resolves: NEXT_PUBLIC_SITE_URL env → featuredrop.dev default
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://featuredrop.dev'

const config: DocsThemeConfig = {
  logo: <FeatureDropLogoLockup />,
  project: {
    link: 'https://github.com/GLINCKER/featuredrop'
  },
  banner: {
    key: 'phase-i-docs-refresh',
    text: (
      <a href="/docs/quickstart" className="font-medium">
        FeatureDrop docs are live. Start with the 10-minute quickstart.
      </a>
    )
  },
  navbar: {
    extraContent: (
      <React.Fragment>
        <ThemeToggle />
        <a
          href="/playground"
          className="fd-cta-secondary !px-3 !py-1.5 !text-xs ml-2"
          style={{ borderRadius: '0.4rem', fontWeight: 600 }}
        >
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
      titleTemplate: '%s — FeatureDrop',
      openGraph: {
        siteName: 'FeatureDrop',
        type: 'website',
      }
    }
  },
  head: (
    <>
      {/* Viewport + rendering */}
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta charSet="utf-8" />
      <meta httpEquiv="X-UA-Compatible" content="IE=edge" />

      {/* Primary SEO */}
      <title>FeatureDrop — Open-Source Product Adoption Toolkit for React</title>
      <meta
        name="description"
        content="FeatureDrop is an open-source React toolkit for product adoption. Build in-app tours, checklists, changelog widgets, hotspots, announcements, surveys, and feature flags — all from your own codebase. No SaaS fees."
      />
      <meta
        name="keywords"
        content="product adoption, feature announcement, react onboarding, in-app tours, changelog widget, hotspot, checklist, feature flag, react, open source, product-led growth, PLG, FeatureDrop, Beamer alternative, Appcues alternative, user onboarding"
      />
      <meta name="author" content="GLINR STUDIOS" />
      <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
      <meta name="theme-color" content="#ea580c" media="(prefers-color-scheme: light)" />
      <meta name="theme-color" content="#0a0d14" media="(prefers-color-scheme: dark)" />

      {/* Favicons */}
      <link rel="icon" href="/favicon.ico" sizes="any" />
      <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      <link rel="apple-touch-icon" href="/favicons/apple-touch-icon.png" />
      <link rel="manifest" href="/site.webmanifest" />

      {/* Open Graph */}
      <meta property="og:site_name" content="FeatureDrop" />
      <meta property="og:title" content="FeatureDrop — Open-Source Product Adoption Toolkit" />
      <meta
        property="og:description"
        content="Build in-app tours, checklists, changelog widgets, hotspots, announcements, and surveys — directly in your React app. No SaaS fees. Open source."
      />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={SITE_URL} />
      <meta property="og:image" content={`${SITE_URL}/branding/og-image.png`} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content="FeatureDrop — Product Adoption Toolkit" />
      <meta property="og:locale" content="en_US" />

      {/* Twitter / X Cards */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@glinrstudios" />
      <meta name="twitter:creator" content="@glinrstudios" />
      <meta name="twitter:title" content="FeatureDrop — Open-Source Product Adoption Toolkit" />
      <meta
        name="twitter:description"
        content="In-app tours, checklists, changelogs, hotspots, and feature announcements for React. Open source. No SaaS fees."
      />
      <meta name="twitter:image" content={`${SITE_URL}/branding/og-image.png`} />
      <meta name="twitter:image:alt" content="FeatureDrop logo and product preview" />

      {/* Canonical */}
      <link rel="canonical" href={SITE_URL} />

      {/* Preconnect for speed */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

      {/* JSON-LD: SoftwareApplication structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "FeatureDrop",
            "applicationCategory": "DeveloperApplication",
            "operatingSystem": "Web",
            "description": "Open-source React toolkit for product adoption — in-app tours, checklists, changelog widgets, hotspots, and feature announcements.",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "USD"
            },
            "author": {
              "@type": "Organization",
              "name": "GLINR STUDIOS",
              "url": "https://glincker.com"
            },
            "url": SITE_URL,
            "image": `${SITE_URL}/branding/og-image.png`,
            "license": "https://opensource.org/licenses/MIT",
            "codeRepository": "https://github.com/GLINCKER/featuredrop",
            "programmingLanguage": ["TypeScript", "React"],
            "keywords": "product adoption, feature announcement, react onboarding, changelog, hotspot, checklist, tours, open source"
          })
        }}
      />

      {/* JSON-LD: Organization */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "GLINR STUDIOS",
            "url": "https://glincker.com",
            "logo": `${SITE_URL}/branding/icon-256.png`,
            "sameAs": [
              "https://github.com/GLINCKER",
              "https://twitter.com/glinrstudios"
            ]
          })
        }}
      />

      {/* Analytics loaded via _app.tsx using next/script */}
    </>
  ),

  footer: {
    text: (
      <div className="flex flex-col gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
        <span>
          MIT {new Date().getFullYear()}{' '}
          <a className="font-semibold hover:underline underline-offset-2" href="https://github.com/GLINCKER/featuredrop" style={{ color: 'var(--text-secondary)' }}>
            FeatureDrop
          </a>
          {' '}—{' '}a{' '}
          <a className="font-semibold hover:underline underline-offset-2" href="https://glincker.com" style={{ color: 'var(--text-secondary)' }}>
            GLINR STUDIOS
          </a>{' '}
          product. Open source under the MIT license.
        </span>
        <span className="flex gap-3">
          <a className="hover:underline underline-offset-2" href="/privacy" style={{ color: 'var(--text-secondary)' }}>Privacy</a>
          <a className="hover:underline underline-offset-2" href="/terms" style={{ color: 'var(--text-secondary)' }}>Terms</a>
          <a className="hover:underline underline-offset-2" href="https://github.com/GLINCKER/featuredrop" style={{ color: 'var(--text-secondary)' }}>GitHub</a>
        </span>
        <a
          href="https://www.producthunt.com/products/featuredrop?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-featuredrop"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2"
        >
          <img
            src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1087348&theme=dark&t=1772313274416"
            alt="FeatureDrop - Open-source product adoption toolkit — free forever | Product Hunt"
            width="200"
            height="43"
            style={{ display: 'inline-block' }}
          />
        </a>
      </div>
    )
  }
}

export default config
