import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ContentfulAdapter,
  MarkdownAdapter,
  NotionAdapter,
  SanityAdapter,
  StrapiAdapter,
} from "../cms";

function mockJsonResponse(payload: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  } as Response;
}

describe("CMS adapters", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("maps Contentful entries to FeatureEntry", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      mockJsonResponse({
        items: [
          {
            sys: { id: "feature-1" },
            fields: {
              label: "AI Journal",
              description: "Track with AI",
              releasedAt: "2026-02-01T00:00:00Z",
              showNewUntil: "2026-03-01T00:00:00Z",
              category: "ai",
              product: "askverdict",
              flagKey: "ai-journal-enabled",
            },
          },
        ],
      }),
    );

    const adapter = new ContentfulAdapter({
      spaceId: "space",
      accessToken: "token",
      contentType: "featureRelease",
    });

    const entries = await adapter.load();

    expect(entries).toEqual([
      expect.objectContaining({
        id: "feature-1",
        label: "AI Journal",
        category: "ai",
        product: "askverdict",
        flagKey: "ai-journal-enabled",
      }),
    ]);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("maps Sanity query result rows", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      mockJsonResponse({
        result: [
          {
            _id: "sanity-1",
            label: "Analytics v2",
            releasedAt: "2026-02-10T00:00:00Z",
            showNewUntil: "2026-03-10T00:00:00Z",
            priority: "critical",
          },
        ],
      }),
    );

    const adapter = new SanityAdapter({
      projectId: "project",
      dataset: "production",
      query: "*[_type == 'release']",
    });

    const entries = await adapter.load();
    expect(entries[0]).toEqual(
      expect.objectContaining({
        id: "sanity-1",
        label: "Analytics v2",
        priority: "critical",
      }),
    );
  });

  it("maps Strapi data payload with attributes wrapper", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      mockJsonResponse({
        data: [
          {
            id: "strapi-1",
            attributes: {
              label: "Exports",
              releasedAt: "2026-02-15T00:00:00Z",
              showNewUntil: "2026-03-15T00:00:00Z",
              type: "improvement",
            },
          },
        ],
      }),
    );

    const adapter = new StrapiAdapter({ baseUrl: "https://cms.example.com" });
    const entries = await adapter.load();

    expect(entries).toEqual([
      expect.objectContaining({
        id: "strapi-1",
        type: "improvement",
      }),
    ]);
  });

  it("maps Notion database rows from page properties", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      mockJsonResponse({
        results: [
          {
            id: "notion-1",
            properties: {
              label: {
                type: "title",
                title: [{ plain_text: "Notion feature" }],
              },
              releasedAt: {
                type: "date",
                date: { start: "2026-02-20T00:00:00Z" },
              },
              showNewUntil: {
                type: "date",
                date: { start: "2026-03-20T00:00:00Z" },
              },
              category: {
                type: "select",
                select: { name: "product" },
              },
            },
          },
        ],
      }),
    );

    const adapter = new NotionAdapter({
      databaseId: "db123",
      token: "secret",
    });

    const entries = await adapter.load();
    expect(entries).toEqual([
      expect.objectContaining({
        id: "notion-1",
        label: "Notion feature",
        category: "product",
      }),
    ]);
  });

  it("parses markdown entries with frontmatter", async () => {
    const adapter = new MarkdownAdapter({
      entries: [
        {
          source: "features/ai-journal.md",
          markdown: [
            "---",
            "id: ai-journal",
            "label: AI Journal",
            "releasedAt: 2026-02-20T00:00:00Z",
            "showNewUntil: 2026-03-20T00:00:00Z",
            "category: ai",
            "---",
            "",
            "Track decisions with AI.",
          ].join("\n"),
        },
      ],
    });

    const entries = await adapter.load();
    expect(entries).toEqual([
      expect.objectContaining({
        id: "ai-journal",
        label: "AI Journal",
        category: "ai",
        description: "Track decisions with AI.",
      }),
    ]);
  });

  it("drops invalid mapped CMS entries by default", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      mockJsonResponse({
        result: [
          {
            _id: "unsafe-1",
            label: "Unsafe URL",
            releasedAt: "2026-02-10T00:00:00Z",
            showNewUntil: "2026-03-10T00:00:00Z",
            url: "javascript:alert(1)",
          },
          {
            _id: "safe-1",
            label: "Safe URL",
            releasedAt: "2026-02-10T00:00:00Z",
            showNewUntil: "2026-03-10T00:00:00Z",
            url: "/docs/release",
          },
        ],
      }),
    );

    const adapter = new SanityAdapter({
      projectId: "project",
      dataset: "production",
      query: "*[_type == 'release']",
    });

    const entries = await adapter.load();
    expect(entries.map((entry) => entry.id)).toEqual(["safe-1"]);
  });

  it("throws on invalid mapped CMS entries in strict mode", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      mockJsonResponse({
        data: [
          {
            id: "strapi-unsafe",
            attributes: {
              label: "Unsafe",
              releasedAt: "2026-02-15T00:00:00Z",
              showNewUntil: "2026-03-15T00:00:00Z",
              cta: { url: "javascript:alert(1)" },
            },
          },
        ],
      }),
    );

    const adapter = new StrapiAdapter({
      baseUrl: "https://cms.example.com",
      strictValidation: true,
      fieldMapping: {
        ctaUrl: "cta.url",
        ctaLabel: () => "Open",
      },
    });

    await expect(adapter.load()).rejects.toThrow("CMS mapping validation failed");
  });
});
