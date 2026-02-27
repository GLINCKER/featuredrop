import { PostHog } from "posthog-node";

let _client: PostHog | null = null;

/**
 * Returns true when analytics should be suppressed:
 * - POSTHOG_OPT_OUT env var is set (any truthy value)
 * - NODE_ENV is 'development' or 'test'
 * - CI environment detected
 */
function isOptedOut(): boolean {
  const optOut = process.env.POSTHOG_OPT_OUT;
  if (optOut && optOut !== "0" && optOut !== "false") return true;

  const env = process.env.NODE_ENV;
  if (env === "development" || env === "test") return true;

  if (process.env.CI) return true;

  return false;
}

/**
 * Returns a shared PostHog client configured for CLI (short-lived process) use.
 * Events are flushed immediately (flushAt=1, flushInterval=0).
 *
 * Returns null (safely skips analytics) when:
 * - POSTHOG_API_KEY is not set
 * - POSTHOG_OPT_OUT is set to a truthy value
 * - NODE_ENV is 'development' or 'test'
 * - Running in CI
 */
export function getPostHogClient(): PostHog | null {
  if (isOptedOut()) return null;

  const apiKey = process.env.POSTHOG_API_KEY;
  if (!apiKey) return null;

  if (!_client) {
    _client = new PostHog(apiKey, {
      host: process.env.POSTHOG_HOST ?? "https://us.i.posthog.com",
      flushAt: 1,
      flushInterval: 0,
      enableExceptionAutocapture: true,
    });
  }
  return _client;
}

/**
 * Shuts down the PostHog client and flushes any pending events.
 * Call before process exit in CLI contexts.
 */
export async function shutdownPostHog(): Promise<void> {
  if (_client) {
    await _client.shutdown();
    _client = null;
  }
}
