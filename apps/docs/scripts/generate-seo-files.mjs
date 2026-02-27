import { readdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'

const ROOT = process.cwd()
const DOCS_PAGES_DIR = path.join(ROOT, 'pages', 'docs')
const PUBLIC_DIR = path.join(ROOT, 'public')
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://featuredrop.dev').replace(/\/+$/, '')

// Priority tiers — higher priority pages get crawled more aggressively
const PRIORITY_MAP = {
  '/': { priority: '1.0', changefreq: 'weekly' },
  '/docs/': { priority: '0.9', changefreq: 'weekly' },
  '/docs/quickstart/': { priority: '0.9', changefreq: 'monthly' },
  '/docs/api/': { priority: '0.8', changefreq: 'monthly' },
  '/docs/components/gallery/': { priority: '0.8', changefreq: 'monthly' },
  '/docs/migration/': { priority: '0.8', changefreq: 'monthly' },
  '/playground/': { priority: '0.7', changefreq: 'monthly' },
}

const SECTION_DEFAULTS = {
  '/docs/components/': { priority: '0.7', changefreq: 'monthly' },
  '/docs/frameworks/': { priority: '0.7', changefreq: 'monthly' },
  '/docs/integrations/': { priority: '0.6', changefreq: 'monthly' },
  '/docs/adapters/': { priority: '0.6', changefreq: 'monthly' },
  '/docs/concepts/': { priority: '0.5', changefreq: 'monthly' },
  '/docs/automation/': { priority: '0.5', changefreq: 'monthly' },
}

function getRouteMeta(route) {
  if (PRIORITY_MAP[route]) return PRIORITY_MAP[route]
  for (const [prefix, meta] of Object.entries(SECTION_DEFAULTS)) {
    if (route.startsWith(prefix)) return meta
  }
  return { priority: '0.5', changefreq: 'monthly' }
}

async function collectMdxFiles(dir, acc = []) {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      await collectMdxFiles(fullPath, acc)
      continue
    }
    if (!entry.isFile()) continue
    if (!entry.name.endsWith('.mdx')) continue
    if (entry.name === '_meta.json') continue
    acc.push(fullPath)
  }
  return acc
}

function toRouteFromDocsFile(filePath) {
  const rel = path.relative(DOCS_PAGES_DIR, filePath).replace(/\\/g, '/')
  const noExt = rel.replace(/\.mdx$/, '')
  return noExt === 'index' ? '/docs/' : `/docs/${noExt}/`
}

function uniqueSorted(routes) {
  return Array.from(new Set(routes)).sort((a, b) => a.localeCompare(b))
}

function buildSitemapXml(routes) {
  const today = new Date().toISOString().split('T')[0]
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    '        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"',
    '        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9',
    '        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">'
  ]
  for (const route of routes) {
    const { priority, changefreq } = getRouteMeta(route)
    lines.push('  <url>')
    lines.push(`    <loc>${siteUrl}${route}</loc>`)
    lines.push(`    <lastmod>${today}</lastmod>`)
    lines.push(`    <changefreq>${changefreq}</changefreq>`)
    lines.push(`    <priority>${priority}</priority>`)
    lines.push('  </url>')
  }
  lines.push('</urlset>')
  return `${lines.join('\n')}\n`
}

function buildRobotsTxt() {
  return [
    'User-agent: *',
    'Allow: /',
    '',
    '# Crawl-delay for polite bots',
    'Crawl-delay: 1',
    '',
    `Sitemap: ${siteUrl}/sitemap.xml`,
    ''
  ].join('\n')
}

async function ensurePublicDir() {
  const exists = await stat(PUBLIC_DIR).then(() => true).catch(() => false)
  if (!exists) throw new Error(`Missing public directory: ${PUBLIC_DIR}`)
}

async function run() {
  await ensurePublicDir()
  const docsFiles = await collectMdxFiles(DOCS_PAGES_DIR)
  const docsRoutes = docsFiles.map(toRouteFromDocsFile)
  const routes = uniqueSorted(['/', '/playground/', ...docsRoutes])

  await writeFile(path.join(PUBLIC_DIR, 'sitemap.xml'), buildSitemapXml(routes), 'utf8')
  await writeFile(path.join(PUBLIC_DIR, 'robots.txt'), buildRobotsTxt(), 'utf8')

  console.log(`[docs-seo] Generated sitemap.xml (${routes.length} URLs) + robots.txt`)
}

run().catch((error) => {
  console.error('[docs-seo] failed:', error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
