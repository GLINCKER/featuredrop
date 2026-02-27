import React from 'react'
import type { DocsThemeConfig } from 'nextra-theme-docs'

const config: DocsThemeConfig = {
  logo: <strong>featuredrop</strong>,
  project: {
    link: 'https://github.com/GLINCKER/featuredrop'
  },
  docsRepositoryBase: 'https://github.com/GLINCKER/featuredrop/blob/main/apps/docs',
  useNextSeoProps() {
    return {
      titleTemplate: '%s - featuredrop docs'
    }
  },
  head: (
    <>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="description" content="featuredrop docs and interactive demos." />
      <meta property="og:title" content="featuredrop docs" />
    </>
  ),
  footer: {
    text: `MIT ${new Date().getFullYear()} featuredrop`
  }
}

export default config
