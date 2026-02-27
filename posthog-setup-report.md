<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into the featuredrop CLI. A new `src/posthog-client.ts` module was created to provide a singleton `posthog-node` client configured for short-lived CLI processes (`flushAt: 1`, `flushInterval: 0`, `enableExceptionAutocapture: true`). The client is loaded only when `POSTHOG_API_KEY` is set in the environment, so the CLI degrades gracefully when analytics are not configured. Seven capture calls were added to `src/cli.ts` covering the key commands: `init`, `add`, `migrate`, `build`, `generate-rss`, `generate-changelog`, and fatal error tracking via `captureException`. Each event carries contextual properties (e.g. `format`, `feature_type`, `source`, `entries_built`) to enable meaningful analysis. `shutdownPostHog()` is called before each early return to ensure events are flushed before the process exits.

| Event | Description | File |
|---|---|---|
| `cli_init` | User initializes a new featuredrop project | `src/cli.ts` |
| `cli_add_feature` | User adds a new feature entry to the manifest | `src/cli.ts` |
| `cli_migrate` | User migrates from another changelog provider (Beamer, Headway, etc.) | `src/cli.ts` |
| `cli_build` | User builds the feature manifest from source files | `src/cli.ts` |
| `cli_generate_rss` | User generates an RSS feed from the manifest | `src/cli.ts` |
| `cli_generate_changelog` | User generates a markdown changelog from the manifest | `src/cli.ts` |
| `cli_error` | A fatal error occurred during a CLI command | `src/cli.ts` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- **Dashboard — Analytics basics**: https://us.posthog.com/project/326553/dashboard/1316940
- **CLI Command Usage (Daily)**: https://us.posthog.com/project/326553/insights/X3l7wHQX
- **CLI Onboarding Funnel (Init → Add → Build)**: https://us.posthog.com/project/326553/insights/4AszzqPG
- **CLI Errors Over Time**: https://us.posthog.com/project/326553/insights/TLdGHYvm
- **Content Generation & Migration (Weekly)**: https://us.posthog.com/project/326553/insights/ZcH09JbW

### Agent skill

We've left an agent skill folder in your project at `.claude/skills/posthog-integration-javascript_node/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
