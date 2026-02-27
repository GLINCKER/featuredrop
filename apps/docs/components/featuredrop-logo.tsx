import type { ReactNode } from 'react'

type FeatureDropLogoProps = {
  compact?: boolean
  className?: string
}

export function FeatureDropLogo({ compact = false, className = '' }: FeatureDropLogoProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`.trim()}>
      <span className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border border-white/40 bg-white/20 shadow-sm backdrop-blur-md dark:border-white/20 dark:bg-slate-800/40">
        <svg viewBox="0 0 40 40" className="h-6 w-6" aria-hidden="true">
          <defs>
            <linearGradient id="fdLogoGradient" x1="6" y1="6" x2="34" y2="34" gradientUnits="userSpaceOnUse">
              <stop stopColor="#8BE7FF" />
              <stop offset="0.48" stopColor="#4F8DFF" />
              <stop offset="1" stopColor="#8764FF" />
            </linearGradient>
          </defs>
          <path
            d="M9 9h15c5 0 8 2.7 8 7.2s-3 7.3-8 7.3H17v7.5h-8V9Zm8 7.7h6.5c1.8 0 2.8-.8 2.8-2.4s-1-2.4-2.8-2.4H17v4.8Z"
            fill="url(#fdLogoGradient)"
          />
          <path d="M17 26h14v5H17z" fill="url(#fdLogoGradient)" opacity="0.9" />
        </svg>
      </span>
      {!compact ? (
        <span className="font-display text-sm font-semibold tracking-wide text-slate-900 dark:text-slate-100">
          FeatureDrop
        </span>
      ) : null}
    </span>
  )
}

export function FeatureDropLogoLockup({ children }: { children?: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2">
      <FeatureDropLogo compact />
      <span className="font-display text-sm font-semibold tracking-wide text-slate-900 dark:text-slate-100">
        {children || 'FeatureDrop'}
      </span>
    </span>
  )
}
