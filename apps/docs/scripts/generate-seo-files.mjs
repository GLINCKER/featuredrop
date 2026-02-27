import { readdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'

const ROOT = process.cwd()
const DOCS_PAGES_DIR = path.join(ROOT, 'pages', 'docs')
const PUBLIC_DIR = path.join(ROOT, 'public')
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://featuredrop-docs.vercel.app').replace(/\/+$/, '')

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
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
  ]
  for (const route of routes) {
    lines.push(`  <url><loc>${siteUrl}${route}</loc></url>`)
  }
  lines.push('</urlset>')
  return `${lines.join('\n')}\n`
}

function buildRobotsTxt() {
  return `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`
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
}

run().catch((error) => {
  console.error('[docs-seo] failed:', error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
