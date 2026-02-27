import type { FeatureManifest } from 'featuredrop'

export const demoManifest: FeatureManifest = [
  {
    id: 'usage-insights',
    label: 'Usage insights dashboard',
    description: 'Track activation and retention signals without leaving your workspace.',
    releasedAt: '2026-02-20',
    showNewUntil: '2027-06-30',
    category: 'analytics',
    version: '2.1.0',
    type: 'feature'
  },
  {
    id: 'guided-rollouts',
    label: 'Guided rollout templates',
    description: 'Ship coordinated banner, tour, and checklist flows faster.',
    releasedAt: '2026-02-10',
    showNewUntil: '2027-06-30',
    category: 'onboarding',
    version: '2.0.0',
    type: 'improvement'
  },
  {
    id: 'security-audit',
    label: 'Security audit checks',
    description: 'Run security checks in CI before release merges.',
    releasedAt: '2026-01-25',
    showNewUntil: '2027-06-30',
    category: 'platform',
    version: '1.9.0',
    type: 'fix'
  }
]
