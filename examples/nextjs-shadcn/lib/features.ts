import { createManifest } from "featuredrop"

export const features = createManifest([
  {
    id: "ai-copilot",
    label: "AI Copilot",
    description:
      "Context-aware assistant that helps you navigate your dashboard, write reports, and automate repetitive tasks.",
    releasedAt: "2026-02-20T00:00:00Z",
    showNewUntil: "2026-04-20T00:00:00Z",
    sidebarKey: "/copilot",
    category: "ai",
    type: "feature",
  },
  {
    id: "analytics-v2",
    label: "Analytics Dashboard v2",
    description:
      "Redesigned analytics with real-time charts, custom date ranges, and one-click CSV export.",
    releasedAt: "2026-02-25T00:00:00Z",
    showNewUntil: "2026-04-25T00:00:00Z",
    sidebarKey: "/analytics",
    category: "core",
    type: "improvement",
  },
  {
    id: "team-billing",
    label: "Team Billing",
    description:
      "Manage billing for your entire team from one place. Includes usage breakdown per seat.",
    releasedAt: "2026-02-28T00:00:00Z",
    showNewUntil: "2026-04-28T00:00:00Z",
    sidebarKey: "/billing",
    category: "billing",
    type: "feature",
  },
  {
    id: "dark-mode-fix",
    label: "Dark Mode Contrast Fix",
    description:
      "Fixed low-contrast text in sidebar navigation and dropdown menus when using dark mode.",
    releasedAt: "2026-02-26T00:00:00Z",
    showNewUntil: "2026-04-26T00:00:00Z",
    category: "core",
    type: "fix",
  },
  {
    id: "webhooks-api",
    label: "Webhook Events API",
    description:
      "Subscribe to real-time events via webhooks. Supports feature releases, user actions, and billing events.",
    releasedAt: "2026-02-22T00:00:00Z",
    showNewUntil: "2026-04-22T00:00:00Z",
    sidebarKey: "/settings",
    category: "api",
    type: "feature",
  },
])

export const onboardingTasks = [
  {
    id: "create-project",
    title: "Create your first project",
    description: "Set up a project to start tracking features.",
  },
  {
    id: "invite-team",
    title: "Invite your team",
    description: "Add teammates so they can collaborate.",
  },
  {
    id: "add-feature",
    title: "Add a feature entry",
    description: "Create your first feature announcement.",
  },
  {
    id: "customize-theme",
    title: "Customize your theme",
    description: "Match FeatureDrop to your brand colors.",
  },
]
