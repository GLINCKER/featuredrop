import sharp from 'sharp';
import { readFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');
const SVG_PATH = join(ROOT, 'public', 'logo-icon.svg');
const OG_DIR = join(ROOT, 'public', 'og');

if (!existsSync(OG_DIR)) {
  mkdirSync(OG_DIR, { recursive: true });
}

// Load the master beacon logo
const logoBuffer = readFileSync(SVG_PATH);

// Helper to generate the text and UI parts as SVG
function getLayoutSvg(width, height) {
  // Scale everything relative to 1280x640 base size to keep proportions
  const scale = width / 1280;
  // Let the SVG viewbox handle scaling natively across ratios!
  // Wait, different aspect ratios mean different layout padding. We'll stretch the background, but center the content.
  const cx = width / 2;
  const cy = height / 2;
  
  // Base 1280x640 viewport but centered horizontally and vertically
  const vx = (width - 1280) / 2;
  const vy = (height - 640) / 2;

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="orb1" cx="0%" cy="50%" r="80%">
          <stop offset="0%" stop-color="#ea580c" stop-opacity="0.3"/>
          <stop offset="100%" stop-color="#ea580c" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="orb2" cx="100%" cy="100%" r="80%">
          <stop offset="0%" stop-color="#4f46e5" stop-opacity="0.4"/>
          <stop offset="100%" stop-color="#4f46e5" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="orb3" cx="100%" cy="0%" r="60%">
          <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.2"/>
          <stop offset="100%" stop-color="#3b82f6" stop-opacity="0"/>
        </radialGradient>
        <linearGradient id="textGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#a5b4fc"/>
          <stop offset="100%" stop-color="#ea580c"/>
        </linearGradient>
        <linearGradient id="glassGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.05"/>
          <stop offset="100%" stop-color="#ffffff" stop-opacity="0.0"/>
        </linearGradient>
      </defs>
      
      <!-- Background -->
      <rect width="${width}" height="${height}" fill="#0a0d14"/>
      
      <!-- Grid pattern -->
      <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="2" r="1" fill="#1e293b"/>
      </pattern>
      <rect width="${width}" height="${height}" fill="url(#grid)"/>

      <!-- Orbs -->
      <rect width="${width}" height="${height}" fill="url(#orb1)"/>
      <rect width="${width}" height="${height}" fill="url(#orb2)"/>
      <rect width="${width}" height="${height}" fill="url(#orb3)"/>

      <!-- Content wrapper centered on screen -->
      <g transform="translate(${vx}, ${vy})">
        <!-- Text content -->
        <text x="250" y="174" font-family="system-ui, -apple-system, sans-serif" font-size="72" font-weight="700" fill="#ffffff" letter-spacing="-1">FeatureDrop</text>
        
        <text x="100" y="320" font-family="system-ui, sans-serif" font-size="64" font-weight="700" fill="#ffffff" letter-spacing="-2">The open-source</text>
        <text x="100" y="390" font-family="system-ui, sans-serif" font-size="64" font-weight="700" fill="url(#textGrad)" letter-spacing="-2">product adoption toolkit.</text>

        <text x="100" y="450" font-family="system-ui, sans-serif" font-size="28" font-weight="500" fill="#94a3b8">Changelogs, tours, checklists &amp; feedback widgets</text>
        <text x="100" y="490" font-family="system-ui, sans-serif" font-size="28" font-weight="500" fill="#94a3b8">— from your own codebase.</text>
        
        <!-- Pills -->
        <g transform="translate(100, 540)">
          <rect x="0" y="0" width="160" height="44" rx="22" fill="#1e293b" stroke="#ea580c" stroke-width="1.5"/>
          <text x="80" y="28" font-family="system-ui, sans-serif" font-size="18" font-weight="600" fill="#ea580c" text-anchor="middle">&lt; 3 kB core</text>

          <rect x="180" y="0" width="140" height="44" rx="22" fill="#1e293b" stroke="#334155" stroke-width="1.5"/>
          <text x="250" y="28" font-family="system-ui, sans-serif" font-size="18" font-weight="500" fill="#e2e8f0" text-anchor="middle">374 tests</text>

          <rect x="340" y="0" width="180" height="44" rx="22" fill="#1e293b" stroke="#334155" stroke-width="1.5"/>
          <text x="430" y="28" font-family="system-ui, sans-serif" font-size="18" font-weight="500" fill="#e2e8f0" text-anchor="middle">8 frameworks</text>
          
          <rect x="540" y="0" width="160" height="44" rx="22" fill="#1e293b" stroke="#334155" stroke-width="1.5"/>
          <text x="620" y="28" font-family="system-ui, sans-serif" font-size="18" font-weight="500" fill="#e2e8f0" text-anchor="middle">MIT licensed</text>
        </g>
        
        <!-- GLINR STUDIOS -->
        <text x="1180" y="60" font-family="system-ui, sans-serif" font-size="16" font-weight="600" fill="#475569" letter-spacing="2" text-anchor="end">GLINR STUDIOS</text>

        <!-- Right side GLASS CARD Mockup -->
        <g transform="translate(800, 160)">
          <!-- shadow -->
          <rect x="-10" y="-10" width="380" height="420" rx="30" fill="#000000" opacity="0.3" filter="blur(20px)" />
          <!-- glass bg -->
          <rect x="0" y="0" width="360" height="400" rx="24" fill="#0f172a" stroke="#1e293b" stroke-width="2" />
          <rect x="0" y="0" width="360" height="400" rx="24" fill="url(#glassGrad)" />

          <!-- Header -->
          <text x="32" y="52" font-family="system-ui, sans-serif" font-size="20" font-weight="600" fill="#f8fafc">What's New</text>
          <rect x="260" y="32" width="68" height="24" rx="12" fill="#1e293b" />
          <text x="294" y="49" font-family="system-ui, sans-serif" font-size="12" font-weight="500" fill="#94a3b8" text-anchor="middle">3 unread</text>
          
          <!-- Changelog items -->
          <!-- Item 1 -->
          <rect x="24" y="80" width="312" height="110" rx="12" fill="#1e293b" stroke="#334155" stroke-width="1" />
          <rect x="40" y="100" width="48" height="22" rx="11" fill="#ea580c" />
          <text x="64" y="115" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="#fff" text-anchor="middle">NEW</text>
          <text x="100" y="116" font-family="system-ui, sans-serif" font-size="16" font-weight="600" fill="#f1f5f9">Dark Mode Parity</text>
          
          <rect x="40" y="136" width="230" height="6" rx="3" fill="#64748b" />
          <rect x="40" y="152" width="180" height="6" rx="3" fill="#64748b" />
          <!-- Emojis reaction mock -->
          <text x="40" y="180" font-size="14">+</text>
          <text x="64" y="180" font-size="14">*</text>
          <text x="88" y="180" font-size="14">X</text>
          
          <!-- Item 2 -->
          <rect x="24" y="200" width="312" height="84" rx="12" fill="#1e293b" stroke="#0f172a" stroke-width="1" />
          <rect x="40" y="220" width="48" height="22" rx="11" fill="#ea580c" />
          <text x="64" y="235" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="#fff" text-anchor="middle">NEW</text>
          <text x="100" y="236" font-family="system-ui, sans-serif" font-size="16" font-weight="600" fill="#cbd5e1">Vue 3 Adapters</text>
          <rect x="40" y="256" width="200" height="6" rx="3" fill="#475569" />

          <!-- Item 3 -->
          <rect x="24" y="294" width="312" height="74" rx="12" fill="#1e293b" stroke="#0f172a" stroke-width="1" />
          <text x="40" y="326" font-family="system-ui, sans-serif" font-size="15" font-weight="600" fill="#64748b">Bug fixes &amp; performance</text>
          <rect x="40" y="344" width="140" height="6" rx="3" fill="#334155" />
        </g>
      </g>
    </svg>
  `;
}

// Resized master icon for compositing
const iconBuffer = await sharp(logoBuffer).resize(120, 120).png().toBuffer();

const targets = [
  { name: 'og', w: 1200, h: 630 },
  { name: 'github-social', w: 1280, h: 640 },
  { name: 'twitter-header', w: 1500, h: 500 },
  { name: 'linkedin-banner', w: 1584, h: 396 },
  { name: 'reddit-16x9', w: 1920, h: 1080 }
  // We can skip story-9x16 for now or just generate the horizontal ones as requested
];

for (const target of targets) {
  const svg = getLayoutSvg(target.w, target.h);
  
  // Calculate top/left offset for the logo to place it relative to the centered 1280x640 frame
  const vx = (target.w - 1280) / 2;
  const vy = (target.h - 640) / 2;
  // Position is x=100, y=100 in the grid
  const logoLeft = Math.round(vx + 100);
  const logoTop = Math.round(vy + 100);

  const outPath = join(OG_DIR, target.name + '.png');
  
  await sharp(Buffer.from(svg))
    .composite([
      {
        input: iconBuffer,
        left: logoLeft,
        top: logoTop,
        blend: 'over'
      }
    ])
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(outPath);
    
  console.log(`✅ Generated \${target.name}.png (\${target.w}x\${target.h})`);
}
