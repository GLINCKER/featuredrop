import { readFile } from 'node:fs/promises'
import path from 'node:path'

const outDir = path.resolve(process.cwd(), 'out')

// Skip verification in SSR mode (no out/ directory)
try {
  await readFile(path.join(outDir, 'index.html'), 'utf8')
} catch {
  console.log('[docs-qa] SSR mode detected (no out/), skipping metadata verification.')
  process.exit(0)
}

const checks = [
  {
    file: 'index.html',
    patterns: [
      {
        label: 'canonical URL',
        test: (content) => /<link rel="canonical" href="https?:\/\/[^"]+"/.test(content),
      },
      {
        label: 'OpenGraph title',
        test: (content) => /<meta property="og:title" content="[^"]+"/.test(content),
      },
      {
        label: 'Twitter card',
        test: (content) => /<meta name="twitter:card" content="[^"]+"/.test(content),
      },
    ],
  },
  {
    file: 'docs/quickstart/index.html',
    patterns: [
      {
        label: 'Quickstart heading',
        test: (content) => /Quickstart/i.test(content),
      },
    ],
  },
]

async function run() {
  const failures = []

  for (const check of checks) {
    let content = ''
    try {
      content = await readFile(path.join(outDir, check.file), 'utf8')
    } catch {
      failures.push(`${check.file}: file not found`)
      continue
    }

    for (const pattern of check.patterns) {
      if (!pattern.test(content)) {
        failures.push(`${check.file}: missing ${pattern.label}`)
      }
    }
  }

  if (failures.length > 0) {
    console.error('[docs-qa] Metadata verification failed.')
    for (const failure of failures) {
      console.error(`- ${failure}`)
    }
    process.exit(1)
  }

  console.log('[docs-qa] Metadata verification passed.')
}

void run()
