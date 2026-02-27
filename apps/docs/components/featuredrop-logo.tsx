import type { ReactNode } from 'react'

type FeatureDropLogoProps = {
  compact?: boolean
  className?: string
  size?: number
}

/**
 * FeatureDrop Beacon Pulse mark:
 * - Apple-style gradient rounded square
 * - Three concentric rings (beacon / pulse)
 * - Glowing center dot with 3D highlight
 * - Subtle teardrop tail nodding to the "Drop"
 */
function BeaconMark({ size = 32 }: { size?: number }) {
  const r = size / 2
  const rx = size * 0.21875 // ~7/32 corner radius

  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      fill="none"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <defs>
        <linearGradient id="fdBg" x1="0" y1="0" x2="0" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FF7A30" />
          <stop offset="100%" stopColor="#C73F00" />
        </linearGradient>
        <radialGradient id="fdGloss" cx="50%" cy="0%" r="80%" fx="50%" fy="0%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.26" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="fdDot" cx="40%" cy="30%" r="70%" fx="40%" fy="30%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#FFDFC7" />
        </radialGradient>
        <filter id="fdGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="1.5" result="glow" />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="fdShadow">
          <feDropShadow dx="0" dy="1.5" stdDeviation="2.5" floodColor="#7a2800" floodOpacity="0.4" />
        </filter>
        <clipPath id="fdClip">
          <rect width="32" height="32" rx={rx} />
        </clipPath>
      </defs>

      {/* Outer shadow layer */}
      <rect width="32" height="32" rx={rx} fill="#B83500" filter="url(#fdShadow)" opacity="0.5" />

      {/* Background gradient */}
      <rect width="32" height="32" rx={rx} fill="url(#fdBg)" />

      {/* Top gloss highlight */}
      <rect width="32" height="18" rx={rx} fill="url(#fdGloss)" clipPath="url(#fdClip)" />

      {/* Subtle top-edge inner border */}
      <rect x="0.75" y="0.75" width="30.5" height="30.5" rx={rx - 0.75} fill="none" stroke="white" strokeWidth="0.75" strokeOpacity="0.2" />

      {/* ─── Beacon rings ─── */}
      {/* Outermost ring */}
      <circle cx="16" cy="15.5" r="10.5" stroke="white" strokeWidth="1.2" strokeOpacity="0.15" />
      {/* Middle ring */}
      <circle cx="16" cy="15.5" r="7.5" stroke="white" strokeWidth="1.5" strokeOpacity="0.3" />
      {/* Inner ring */}
      <circle cx="16" cy="15.5" r="4.5" stroke="white" strokeWidth="1.8" strokeOpacity="0.55" />

      {/* Center dot glow halo */}
      <circle cx="16" cy="15.5" r="3" fill="white" fillOpacity="0.2" filter="url(#fdGlow)" />
      {/* Center dot */}
      <circle cx="16" cy="15.5" r="2.2" fill="url(#fdDot)" />
      {/* 3D top-left highlight on dot */}
      <ellipse cx="15.2" cy="14.8" rx="0.9" ry="0.7" fill="white" fillOpacity="0.5" />

      {/* Drop tail */}
      <ellipse cx="16" cy="20" rx="1.2" ry="1.7" fill="white" fillOpacity="0.22" />
      <ellipse cx="16" cy="22.3" rx="0.7" ry="0.9" fill="white" fillOpacity="0.10" />
    </svg>
  )
}

export function FeatureDropLogo({ compact = false, className = '', size = 32 }: FeatureDropLogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`.trim()}>
      <BeaconMark size={size} />
      {!compact ? (
        <span
          style={{
            fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
            fontWeight: 700,
            fontSize: '0.9375rem',
            letterSpacing: '-0.03em',
            lineHeight: 1,
          }}
          className="text-slate-900 dark:text-white"
        >
          FeatureDrop
        </span>
      ) : null}
    </span>
  )
}

export function FeatureDropLogoLockup({ children }: { children?: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <BeaconMark size={32} />
      <span
        style={{
          fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
          fontWeight: 700,
          fontSize: '0.9375rem',
          letterSpacing: '-0.03em',
          lineHeight: 1,
        }}
        className="text-slate-900 dark:text-white"
      >
        {children || 'FeatureDrop'}
      </span>
    </span>
  )
}
