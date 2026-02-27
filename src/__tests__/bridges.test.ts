import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DiscordBridge,
  EmailDigestGenerator,
  RSSFeedGenerator,
  SlackBridge,
  WebhookBridge,
} from "../bridges";
import type { FeatureEntry, FeatureManifest } from "../types";

const FEATURE: FeatureEntry = {
  id: "ai-journal",
  label: "AI Journal",
  description: "Track decisions with AI.",
  releasedAt: "2026-02-20T00:00:00Z",
  showNewUntil: "2026-03-20T00:00:00Z",
  url: "https://example.com/journal",
};

function mockJsonResponse(status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => ({}),
  } as Response;
}

describe("notification bridges", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts Slack notification payload", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(mockJsonResponse(200));

    await SlackBridge.notify(FEATURE, {
      webhookUrl: "https://hooks.slack.test/1",
      username: "featuredrop-bot",
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://hooks.slack.test/1");
    const options = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(options.method).toBe("POST");
    expect(String(options.body)).toContain("AI Journal");
  });

  it("posts Discord embed notification payload", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(mockJsonResponse(200));

    await DiscordBridge.notify(FEATURE, {
      webhookUrl: "https://discord.test/webhook",
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const options = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(String(options.body)).toContain("embeds");
    expect(String(options.body)).toContain("AI Journal");
  });

  it("posts generic webhook event payload with custom headers", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(mockJsonResponse(200));

    await WebhookBridge.post(FEATURE, {
      url: "https://api.example.com/hooks",
      headers: { "x-api-key": "secret" },
      event: "release.published",
      body: { source: "ci" },
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const options = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(options.headers).toEqual(
      expect.objectContaining({
        "x-api-key": "secret",
      }),
    );
    expect(String(options.body)).toContain("release.published");
    expect(String(options.body)).toContain("source");
  });

  it("throws on non-2xx bridge responses", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(mockJsonResponse(500));

    await expect(
      SlackBridge.notify(FEATURE, { webhookUrl: "https://hooks.slack.test/1" }),
    ).rejects.toThrow(/Bridge request failed/);
  });
});

describe("digest generators", () => {
  it("generates HTML digest output", () => {
    const html = EmailDigestGenerator.generate([FEATURE], {
      title: "Weekly Updates",
      productName: "featuredrop",
    });
    expect(html).toContain("Weekly Updates");
    expect(html).toContain("AI Journal");
    expect(html).toContain("featuredrop");
  });

  it("generates RSS output from manifest", () => {
    const manifest: FeatureManifest = [FEATURE];
    const xml = RSSFeedGenerator.generate(manifest, {
      title: "Product Updates",
      link: "https://example.com/changelog",
    });
    expect(xml).toContain("<rss version=\"2.0\">");
    expect(xml).toContain("<title>Product Updates</title>");
    expect(xml).toContain("AI Journal");
  });
});
