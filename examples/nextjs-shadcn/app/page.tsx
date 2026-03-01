"use client"

import { NewBadge } from "@/components/featuredrop/new-badge"
import { ChangelogWidget } from "@/components/featuredrop/changelog-widget"
import { FeedbackWidget } from "@/components/featuredrop/feedback-widget"
import { Tour } from "@/components/featuredrop/tour"
import { Checklist } from "@/components/featuredrop/checklist"
import { Separator } from "@/components/ui/separator"
import { onboardingTasks } from "@/lib/features"

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold">FeatureDrop</h1>
            <span className="text-sm text-muted-foreground">+ shadcn/ui</span>
          </div>
          <div className="flex items-center gap-3">
            <ChangelogWidget />
            <FeedbackWidget
              onSubmit={(payload) => {
                console.log("Feedback submitted:", payload)
                alert(`Thanks for your ${payload.category.toLowerCase()} feedback!`)
              }}
            />
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="container mx-auto px-6 py-10 max-w-4xl">
        {/* Intro */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold tracking-tight mb-3">
            shadcn/ui Registry Components
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl">
            This example app demonstrates all 5 FeatureDrop registry components
            installed via{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono">
              npx shadcn@latest add
            </code>
            . Each component uses shadcn primitives for UI and FeatureDrop hooks
            for logic.
          </p>
        </section>

        <Separator className="mb-10" />

        {/* NewBadge */}
        <section className="mb-12" id="new-badge">
          <h3 className="text-xl font-semibold mb-2">NewBadge</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Auto-expiring badge that shows &quot;New&quot; for features within their
            visibility window. Click to dismiss.
          </p>
          <div className="rounded-lg border p-6 space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">AI Copilot</span>
              <NewBadge featureKey="/copilot" />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Analytics v2</span>
              <NewBadge featureKey="/analytics" />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Team Billing</span>
              <NewBadge featureKey="/billing" />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Settings</span>
              <NewBadge featureKey="/settings" />
            </div>
          </div>
        </section>

        <Separator className="mb-10" />

        {/* ChangelogWidget */}
        <section className="mb-12" id="changelog">
          <h3 className="text-xl font-semibold mb-2">ChangelogWidget</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Slide-out panel listing all features with unread count badge. Closing
            the sheet marks all as seen. Also available in the header above.
          </p>
          <div className="rounded-lg border p-6">
            <ChangelogWidget triggerLabel="Open Changelog" side="right" />
          </div>
        </section>

        <Separator className="mb-10" />

        {/* FeedbackWidget */}
        <section className="mb-12" id="feedback">
          <h3 className="text-xl font-semibold mb-2">FeedbackWidget</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Dialog-based feedback form with category select and submit handler.
            Also available in the header.
          </p>
          <div className="rounded-lg border p-6">
            <FeedbackWidget
              triggerLabel="Send Feedback"
              onSubmit={(payload) => {
                console.log("Feedback:", payload)
                alert(`Received: [${payload.category}] ${payload.message}`)
              }}
            />
          </div>
        </section>

        <Separator className="mb-10" />

        {/* Checklist */}
        <section className="mb-12" id="checklist">
          <h3 className="text-xl font-semibold mb-2">Checklist</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Onboarding checklist with progress tracking. State persists via
            FeatureDrop storage adapter.
          </p>
          <div className="rounded-lg border p-6 flex justify-center">
            <Checklist
              checklistId="onboarding"
              tasks={onboardingTasks}
              title="Getting Started"
              description="Complete these steps to set up your workspace."
            />
          </div>
        </section>

        <Separator className="mb-10" />

        {/* Tour */}
        <section className="mb-12" id="tour">
          <h3 className="text-xl font-semibold mb-2">Tour</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Step-by-step product tour popover. Attach it to any element using CSS
            selectors. The Tour component requires a registered tour in your
            FeatureDrop manifest.
          </p>
          <div className="rounded-lg border p-6">
            <p className="text-sm text-muted-foreground">
              Tours are activated programmatically via the{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
                useTour()
              </code>{" "}
              hook. See the{" "}
              <a
                href="https://featuredrop.dev/docs/shadcn/tour"
                className="text-primary underline underline-offset-4"
              >
                Tour docs
              </a>{" "}
              for setup instructions.
            </p>
            <Tour tourId="demo-tour" />
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t pt-8 pb-12 text-center">
          <p className="text-sm text-muted-foreground">
            Built with{" "}
            <a
              href="https://featuredrop.dev"
              className="text-primary underline underline-offset-4"
            >
              FeatureDrop
            </a>{" "}
            +{" "}
            <a
              href="https://ui.shadcn.com"
              className="text-primary underline underline-offset-4"
            >
              shadcn/ui
            </a>{" "}
            +{" "}
            <a
              href="https://nextjs.org"
              className="text-primary underline underline-offset-4"
            >
              Next.js 15
            </a>
          </p>
        </footer>
      </main>
    </div>
  )
}
