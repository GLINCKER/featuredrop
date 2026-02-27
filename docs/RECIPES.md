# Recipes

Practical implementation patterns for common product-adoption flows.

## 1) Add a "What's New" button to your sidebar

```tsx
import { FeatureDropProvider, ChangelogWidget, useNewCount } from "featuredrop/react";
import { LocalStorageAdapter } from "featuredrop";

const storage = new LocalStorageAdapter({ watermark: user.featuresSeenAt });

function SidebarWhatsNew() {
  const count = useNewCount();
  return (
    <button type="button" aria-label="What's new">
      What's New {count > 0 ? `(${count})` : ""}
    </button>
  );
}

export function AppShell() {
  return (
    <FeatureDropProvider manifest={FEATURES} storage={storage}>
      <SidebarWhatsNew />
      <ChangelogWidget variant="panel" title="Product updates" />
    </FeatureDropProvider>
  );
}
```

## 2) Onboarding checklist for new users

```tsx
import { Checklist } from "featuredrop/react";

<Checklist
  id="new-user-onboarding"
  tasks={[
    { id: "profile", title: "Complete profile", completionEvent: "#save-profile:click" },
    { id: "workspace", title: "Create workspace", completionEvent: "#create-workspace:click" },
    { id: "invite", title: "Invite a teammate", completionEvent: "#invite-member:click" },
  ]}
  position="bottom-right"
  showProgress
  onComplete={() => console.log("Onboarding complete")}
/>;
```

## 3) Launch sequence: banner -> tour -> spotlight chain

```tsx
import { useState } from "react";
import { Banner, Tour, SpotlightChain } from "featuredrop/react";

export function LaunchSequence() {
  const [tourOpen, setTourOpen] = useState(false);
  const [spotlightOpen, setSpotlightOpen] = useState(false);

  return (
    <>
      <Banner
        featureId="launch-v2"
        variant="announcement"
        children={({ isActive, dismiss }) =>
          isActive ? (
            <div>
              <strong>V2 is live.</strong>
              <button onClick={() => setTourOpen(true)}>Take tour</button>
              <button onClick={dismiss}>Dismiss</button>
            </div>
          ) : null
        }
      />

      {tourOpen ? (
        <Tour
          id="launch-v2-tour"
          steps={[
            { id: "step-1", target: "#nav-search", title: "Search", content: "Global search is now faster." },
            { id: "step-2", target: "#filters", title: "Filters", content: "Use smart filters to narrow results." },
          ]}
          onComplete={() => {
            setTourOpen(false);
            setSpotlightOpen(true);
          }}
          onSkip={() => setTourOpen(false)}
        />
      ) : null}

      {spotlightOpen ? (
        <SpotlightChain
          steps={[
            { target: "#insights-tab", content: "Start in Insights." },
            { target: "#export-btn", content: "Export reports from here." },
          ]}
          onComplete={() => setSpotlightOpen(false)}
          onSkip={() => setSpotlightOpen(false)}
        />
      ) : null}
    </>
  );
}
```

## 4) Collect feedback on a new feature

```tsx
import { FeedbackWidget } from "featuredrop/react";

<FeedbackWidget
  title="How is AI Journal working for you?"
  categories={["bug", "idea", "question"]}
  onSubmit={async (payload) => {
    await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }}
/>;
```

## 5) Migrate from Beamer in 10 minutes

```bash
# 1) Convert exported data
npx featuredrop migrate --from beamer --input beamer-export.json --out featuredrop.manifest.json

# 2) Validate manifest
npx featuredrop validate --manifest featuredrop.manifest.json

# 3) Optional: get migration stats
npx featuredrop stats --manifest featuredrop.manifest.json
```

Then load the manifest in your app with `FeatureDropProvider`.

## 6) Supabase (Postgres-backed) state adapter

```ts
import { SupabaseAdapter } from "featuredrop";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

const storage = new SupabaseAdapter({
  userId: currentUser.id,
  tableName: "featuredrop_state",
  realtime: true,
  client: supabase,
});
```

## 7) A/B test announcement copy

```ts
const FEATURES = [
  {
    id: "export-v2",
    label: "Export reports",
    releasedAt: "2026-02-20T00:00:00Z",
    showNewUntil: "2026-03-20T00:00:00Z",
    variants: {
      control: { label: "Export reports" },
      treatment_a: { label: "Export and share reports instantly" },
    },
    variantSplit: [50, 50],
  },
] as const;
```

```tsx
<FeatureDropProvider manifest={FEATURES} storage={storage} variantKey={currentUser.id}>
  <ChangelogWidget />
</FeatureDropProvider>
```

Use analytics events from `collector` to compare click-through and dismiss rates per variant.

## Playground links

- Local: `pnpm playground`
- StackBlitz: https://stackblitz.com/github/GLINCKER/featuredrop/tree/main/examples/sandbox-react
- CodeSandbox: https://codesandbox.io/p/sandbox/github/GLINCKER/featuredrop/tree/main/examples/sandbox-react
