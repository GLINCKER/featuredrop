import { createManifest, LocalStorageAdapter } from "featuredrop";
import {
  ChangelogPage,
  ChangelogWidget,
  Checklist,
  FeatureDropProvider,
  FeedbackWidget,
  Survey,
  Tour,
} from "featuredrop/react";

const FEATURES = createManifest([
  {
    id: "ai-journal",
    label: "AI Journal",
    description: "Track product decisions and outcomes from one feed.",
    category: "ai",
    releasedAt: "2026-02-20T00:00:00Z",
    showNewUntil: "2026-03-20T00:00:00Z",
    type: "feature",
    cta: { label: "Open Journal", url: "#" },
  },
  {
    id: "billing-fix",
    label: "Billing Improvements",
    description: "Invoice rounding issues resolved for annual plans.",
    category: "billing",
    releasedAt: "2026-02-18T00:00:00Z",
    showNewUntil: "2026-03-18T00:00:00Z",
    type: "fix",
  },
]);

const storage = new LocalStorageAdapter({
  prefix: "featuredrop-sandbox-react",
});

export function App() {
  return (
    <FeatureDropProvider manifest={FEATURES} storage={storage}>
      <main
        style={{
          maxWidth: 900,
          margin: "0 auto",
          padding: "2rem 1rem 4rem",
          fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
        }}
      >
        <h1 style={{ marginBottom: 8 }}>featuredrop React Sandbox</h1>
        <p style={{ marginTop: 0, color: "#4b5563" }}>
          Click around and edit `src/App.tsx` to explore API behavior.
        </p>

        <section
          style={{
            marginTop: 20,
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 16,
            background: "#ffffff",
          }}
        >
          <h2 style={{ marginTop: 0 }}>Widget</h2>
          <ChangelogWidget showReactions />
        </section>

        <section
          style={{
            marginTop: 16,
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 16,
            background: "#ffffff",
          }}
        >
          <h2 style={{ marginTop: 0 }}>Changelog Page</h2>
          <ChangelogPage manifest={FEATURES} pageSize={2} pagination="load-more" showReactions />
        </section>

        <section
          style={{
            marginTop: 16,
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 16,
            background: "#ffffff",
          }}
        >
          <h2 style={{ marginTop: 0 }}>Tour + Checklist</h2>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <button id="sandbox-dashboard" style={{ padding: "8px 10px" }}>
              Dashboard
            </button>
            <button id="sandbox-settings" style={{ padding: "8px 10px" }}>
              Settings
            </button>
          </div>
          <Tour
            id="sandbox-tour"
            overlay={false}
            steps={[
              {
                id: "tour-dashboard",
                target: "#sandbox-dashboard",
                title: "Dashboard",
                content: "Core usage metrics are available here.",
              },
              {
                id: "tour-settings",
                target: "#sandbox-settings",
                title: "Settings",
                content: "Configuration lives here.",
              },
            ]}
          >
            {({ startTour }) => (
              <button style={{ padding: "8px 10px", marginBottom: 12 }} onClick={startTour}>
                Start tour
              </button>
            )}
          </Tour>
          <Checklist
            id="sandbox-checklist"
            position="inline"
            tasks={[
              { id: "open-dashboard", title: "Open dashboard", completionEvent: "#sandbox-dashboard:click" },
              { id: "open-settings", title: "Open settings", completionEvent: "#sandbox-settings:click" },
            ]}
          />
        </section>

        <section
          style={{
            marginTop: 16,
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 16,
            background: "#ffffff",
          }}
        >
          <h2 style={{ marginTop: 0 }}>Survey + Feedback</h2>
          <div style={{ display: "grid", gap: 16, maxWidth: 460 }}>
            <Survey
              id="sandbox-survey-nps"
              type="nps"
              trigger="manual"
              defaultOpen
              title="How likely are you to recommend this?"
              onSubmit={(payload) => {
                // eslint-disable-next-line no-console
                console.log("Survey submitted:", payload);
              }}
            />
            <FeedbackWidget
              featureId="ai-journal"
              onSubmit={(payload) => {
                // eslint-disable-next-line no-console
                console.log("Feedback submitted:", payload);
              }}
            />
          </div>
        </section>
      </main>
    </FeatureDropProvider>
  );
}
