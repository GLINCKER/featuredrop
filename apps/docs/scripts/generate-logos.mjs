#!/usr/bin/env node
/**
 * FeatureDrop Logo Asset Generator
 * Generates all favicon and branding PNG assets from the master SVG.
 *
 * Usage: node scripts/generate-logos.mjs
 */

import sharp from 'sharp'
import { readFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const ROOT = join(__dirname, '..')
const SVG_PATH = join(ROOT, 'public', 'logo-icon.svg')
const FAVICON_DIR = join(ROOT, 'public', 'favicons')
const BRANDING_DIR = join(ROOT, 'public', 'branding')

// Ensure output directories exist
;[FAVICON_DIR, BRANDING_DIR].forEach(d => { if (!existsSync(d)) mkdirSync(d, { recursive: true }) })

const svgBuffer = readFileSync(SVG_PATH)

console.log('FeatureDrop — generating logo assets from logo-icon.svg...\n')

// ─── FAVICON SIZES ───────────────────────────────────────────────
const faviconSizes = [
  { size: 16,  name: 'favicon-16x16.png' },
  { size: 32,  name: 'favicon-32x32.png' },
  { size: 48,  name: 'favicon-48x48.png' },
  { size: 96,  name: 'favicon-96x96.png' },
  { size: 180, name: 'apple-touch-icon.png' },
  { size: 192, name: 'android-chrome-192x192.png' },
  { size: 512, name: 'android-chrome-512x512.png' },
]

for (const { size, name } of faviconSizes) {
  const outPath = join(FAVICON_DIR, name)
  await sharp(svgBuffer)
    .resize(size, size)
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(outPath)
  console.log(`  ✓ favicons/${name} (${size}x${size})`)
}

// ─── BRANDING ASSETS ─────────────────────────────────────────────
const brandingSizes = [
  { size: 64,   name: 'icon-64.png',   desc: 'Small icon (README inline)' },
  { size: 128,  name: 'icon-128.png',  desc: 'Medium icon' },
  { size: 256,  name: 'icon-256.png',  desc: 'Large icon' },
  { size: 512,  name: 'icon-512.png',  desc: 'Master icon (App store etc.)' },
  { size: 1024, name: 'icon-1024.png', desc: 'Ultra-HiDPI' },
]

for (const { size, name, desc } of brandingSizes) {
  const outPath = join(BRANDING_DIR, name)
  await sharp(svgBuffer)
    .resize(size, size)
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(outPath)
  console.log(`  ✓ branding/${name} (${size}x${size}) — ${desc}`)
}

// ─── OG / SOCIAL BANNER ─────────────────────────────────────────
// 1200×630 OG image with brand orange background + centered icon
const ICON_SIZE = 280
const OG_W = 1200
const OG_H = 630

const iconBuffer = await sharp(svgBuffer).resize(ICON_SIZE, ICON_SIZE).png().toBuffer()

// Dark background layer (matches brand dark)
const ogBackground = await sharp({
  create: {
    width: OG_W,
    height: OG_H,
    channels: 4,
    background: { r: 10, g: 13, b: 20, alpha: 1 }
  }
}).png().toBuffer()

// Compose: icon centered slightly above center
const ogPath = join(BRANDING_DIR, 'og-image.png')
await sharp(ogBackground)
  .composite([{
    input: iconBuffer,
    top: Math.round((OG_H - ICON_SIZE) / 2) - 30,
    left: Math.round((OG_W - ICON_SIZE) / 2),
    blend: 'over'
  }])
  .png({ quality: 95 })
  .toFile(ogPath)
console.log(`  ✓ branding/og-image.png (${OG_W}x${OG_H})`)

// GitHub README badge strip — horizontal lockup at 2x
const BADGE_H = 80
const BADGE_ICON = 64

const badgeIconBuffer = await sharp(svgBuffer).resize(BADGE_ICON, BADGE_ICON).png().toBuffer()
const badgeBg = await sharp({
  create: { width: 480, height: BADGE_H, channels: 4, background: { r: 10, g: 13, b: 20, alpha: 1 } }
}).png().toBuffer()

const badgePath = join(BRANDING_DIR, 'readme-badge.png')
await sharp(badgeBg)
  .composite([{
    input: badgeIconBuffer,
    top: (BADGE_H - BADGE_ICON) / 2,
    left: 16,
    blend: 'over'
  }])
  .png({ quality: 95 })
  .toFile(badgePath)
console.log(`  ✓ branding/readme-badge.png (480x${BADGE_H}) — GitHub README header`)

// ─── favicon.ico (16+32 multi-size ICO via PNG at 32px) ──────────
// Note: true .ico requires the `ico-endec` or similar. For now
// we copy the 32px PNG as favicon.ico — modern browsers accept PNG.
const icoPath = join(ROOT, 'public', 'favicon.ico')
await sharp(svgBuffer)
  .resize(32, 32)
  .png({ quality: 100 })
  .toFile(icoPath)
console.log(`  ✓ public/favicon.ico (32px PNG, browser-compatible)`)

// ─── Also copy SVG to public root as favicon.svg ─────────────────
import { copyFileSync } from 'fs'
copyFileSync(SVG_PATH, join(ROOT, 'public', 'favicon.svg'))
console.log(`  ✓ public/favicon.svg (vector, Safari Pinned Tab)`)

console.log(`
Done! 🎉

Quick reference:
  public/favicon.ico                    — Browser tab icon
  public/favicon.svg                    — Modern browsers / Safari pinned
  public/favicons/favicon-16x16.png     — Legacy favicon
  public/favicons/favicon-32x32.png     — High-DPI favicon
  public/favicons/apple-touch-icon.png  — iOS home screen
  public/favicons/android-chrome-*.png  — PWA manifest
  public/branding/icon-*.png            — Marketing assets
  public/branding/og-image.png          — Social media OG card
  public/branding/readme-badge.png      — GitHub README header
`)
