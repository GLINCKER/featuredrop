import { access, readFile } from 'node:fs/promises'
import path from 'node:path'

const outDir = path.resolve(process.cwd(), 'out')

const requiredFiles = [
  'index.html',
  'docs/index.html',
  'docs/quickstart/index.html',
  'playground/index.html',
  'robots.txt',
  'sitemap.xml',
  'og/featuredrop-docs.svg',
]

const sitemapMustContain = [
  '/docs/quickstart/',
  '/playground/',
]

async function ensureFile(relativePath) {
  const target = path.join(outDir, relativePath)
  await access(target)
}

async function run() {
  const missing = []
  for (const relativePath of requiredFiles) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await ensureFile(relativePath)
    } catch {
      missing.push(relativePath)
    }
  }

  let sitemapContent = ''
  try {
    sitemapContent = await readFile(path.join(outDir, 'sitemap.xml'), 'utf8')
  } catch {
    missing.push('sitemap.xml (readable)')
  }

  const missingUrls = sitemapMustContain.filter((fragment) => !sitemapContent.includes(fragment))

  if (missing.length > 0 || missingUrls.length > 0) {
    // eslint-disable-next-line no-console
    console.error('[docs-qa] Static export verification failed.')
    if (missing.length > 0) {
      // eslint-disable-next-line no-console
      console.error('[docs-qa] Missing files:')
      for (const entry of missing) {
        // eslint-disable-next-line no-console
        console.error(`- ${entry}`)
      }
    }
    if (missingUrls.length > 0) {
      // eslint-disable-next-line no-console
      console.error('[docs-qa] sitemap.xml missing URLs:')
      for (const entry of missingUrls) {
        // eslint-disable-next-line no-console
        console.error(`- ${entry}`)
      }
    }
    process.exit(1)
  }

  // eslint-disable-next-line no-console
  console.log('[docs-qa] Static export verification passed.')
}

void run()
