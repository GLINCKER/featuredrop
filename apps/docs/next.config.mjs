import nextra from 'nextra'
import path from 'path'
import { fileURLToPath } from 'url'

const withNextra = nextra({
  theme: 'nextra-theme-docs',
  themeConfig: './theme.config.tsx',
  defaultShowCopyCode: true,
})

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''

export default withNextra({
  reactStrictMode: true,
  trailingSlash: true,
  basePath,
  env: {
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    NEXT_PUBLIC_GA_ID: process.env.NEXT_PUBLIC_GA_ID,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  },
  assetPrefix: basePath ? `${basePath}/` : undefined,
  webpack: (config) => {
    // Force a single React instance for linked local packages (featuredrop -> root react devDep).
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      react: path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      'react/jsx-runtime': path.resolve(__dirname, 'node_modules/react/jsx-runtime.js'),
      'react/jsx-dev-runtime': path.resolve(__dirname, 'node_modules/react/jsx-dev-runtime.js')
    }
    config.resolve.fallback = {
      ...(config.resolve.fallback || {}),
      fs: false,
      module: false,
      'fs/promises': false
    }
    return config
  },
  images: {
    unoptimized: true
  },
  async rewrites() {
    return [
      {
        source: '/ingest/static/:path*',
        destination: 'https://us-assets.i.posthog.com/static/:path*',
      },
      {
        source: '/ingest/:path*',
        destination: 'https://us.i.posthog.com/:path*',
      },
      {
        source: '/ingest/decide',
        destination: 'https://us.i.posthog.com/decide',
      },
    ]
  },
})
