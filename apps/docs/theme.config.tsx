import React from 'react'
import type { DocsThemeConfig } from 'nextra-theme-docs'
import { FeatureDropLogoLockup } from './components/featuredrop-logo'
import { ThemeToggle } from './components/theme-toggle'

// Auto-resolves: NEXT_PUBLIC_SITE_URL env → featuredrop.dev default
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://featuredrop.dev'

const PLAUSIBLE_DOMAIN = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN
const GA_ID = process.env.NEXT_PUBLIC_GA_ID

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

      {/* Analytics */}
      {PLAUSIBLE_DOMAIN ? (
        <script defer data-domain={PLAUSIBLE_DOMAIN} src="https://plausible.io/js/script.js" />
      ) : null}
      {GA_ID ? (
        <>
          <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} />
          <script
            dangerouslySetInnerHTML={{
              __html: `window.dataLayer=window.dataLayer||[];function gtag(){window.dataLayer.push(arguments);}window.gtag=gtag;gtag('js', new Date());gtag('config', '${GA_ID}', { anonymize_ip: true });`
            }}
          />
        </>
      ) : null}
    </>
  ),

  footer: {
    text: (
      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
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
    )
  }
}

export default config
