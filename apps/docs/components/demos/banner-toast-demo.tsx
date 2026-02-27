import { useMemo } from 'react'
import { MemoryAdapter } from 'featuredrop'
import { Banner, FeatureDropProvider, Toast } from 'featuredrop/react'
import { CodeDemoCard } from '../code-demo-card'
import { demoManifest } from './demo-manifest'

const FeatureDropProviderView = FeatureDropProvider as any
const BannerView = Banner as any
const ToastView = Toast as any

const bannerToastDemoCode = `import { MemoryAdapter } from 'featuredrop'
import { FeatureDropProvider, Banner, Toast } from 'featuredrop/react'

export function BannerToastDemo() {
  return (
    <FeatureDropProvider manifest={manifest} storage={new MemoryAdapter()}>
      <Banner featureId="guided-rollouts" position="inline" />
      <Toast featureIds={['usage-insights']} autoDismissMs={0} maxVisible={1} />
    </FeatureDropProvider>
  )
}`

export function BannerToastDemo() {
  const storage = useMemo(() => new MemoryAdapter(), [])

  return (
    <CodeDemoCard
      title="Banner and toast demo"
      description="Use banners for persistent release notices and toasts for short-lived alerts."
      code={bannerToastDemoCode}
    >
      <FeatureDropProviderView manifest={demoManifest} storage={storage}>
        <div className="rounded-xl border border-slate-300/60 bg-white/70 p-3 dark:border-slate-200/10 dark:bg-slate-900/40">
          <BannerView featureId="guided-rollouts" position="inline" variant="announcement" />
          <p className="mt-3 text-xs text-slate-600 dark:text-slate-300">
            Toast appears in bottom-right. Set `autoDismissMs` to control lifecycle.
          </p>
        </div>
        <ToastView featureIds={['usage-insights']} autoDismissMs={0} maxVisible={1} position="bottom-right" />
      </FeatureDropProviderView>
    </CodeDemoCard>
  )
}
