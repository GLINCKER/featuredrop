import { describe, it, expect } from "vitest";
import type { FeatureEntry } from "../types";

const manifest: FeatureEntry[] = [
  {
    id: "dark-mode",
    label: "Dark Mode",
    description: "Toggle between light and dark themes.",
    releasedAt: "2026-02-01",
    showNewUntil: "2026-12-01",
  },
  {
    id: "ai-search",
    label: "AI Search",
    description: "Search with natural language.",
    releasedAt: "2026-02-15",
    showNewUntil: "2026-12-15",
  },
  {
    id: "expired",
    label: "Old Feature",
    description: "Already expired.",
    releasedAt: "2024-01-01",
    showNewUntil: "2024-06-01",
  },
];

describe("Next.js integration", () => {
  it("getNewFeaturesServer returns non-expired features", async () => {
    const { getNewFeaturesServer } = await import("../next/index");
    const result = getNewFeaturesServer(manifest);
    expect(result.length).toBe(2);
    expect(result.map((f) => f.id)).toContain("dark-mode");
    expect(result.map((f) => f.id)).toContain("ai-search");
  });

  it("getNewFeaturesServer excludes dismissed", async () => {
    const { getNewFeaturesServer } = await import("../next/index");
    const result = getNewFeaturesServer(manifest, ["dark-mode"]);
    expect(result.length).toBe(1);
    expect(result[0].id).toBe("ai-search");
  });

  it("getNewCountServer returns count", async () => {
    const { getNewCountServer } = await import("../next/index");
    expect(getNewCountServer(manifest)).toBe(2);
    expect(getNewCountServer(manifest, ["dark-mode"])).toBe(1);
    expect(getNewCountServer(manifest, ["dark-mode", "ai-search"])).toBe(0);
  });

  it("FeatureDropScript renders script tag", async () => {
    const { FeatureDropScript } = await import("../next/index");
    const result = FeatureDropScript({ manifest, dismissedIds: ["expired"] });
    expect(result.props.id).toBe("__FEATUREDROP_DATA__");
    expect(result.props.type).toBe("application/json");
    const data = JSON.parse(result.props.dangerouslySetInnerHTML.__html);
    expect(data.manifest.length).toBe(3);
    expect(data.dismissedIds).toEqual(["expired"]);
  });
});

describe("Remix integration", () => {
  it("getNewFeaturesServer returns non-expired features", async () => {
    const { getNewFeaturesServer } = await import("../remix/index");
    const result = getNewFeaturesServer(manifest);
    expect(result.length).toBe(2);
  });

  it("getNewCountServer excludes dismissed", async () => {
    const { getNewCountServer } = await import("../remix/index");
    expect(getNewCountServer(manifest, ["ai-search"])).toBe(1);
  });

  it("createFeatureDropHeaders sets X-FD-New-Count", async () => {
    const { createFeatureDropHeaders } = await import("../remix/index");
    const headers = createFeatureDropHeaders(manifest, ["dark-mode"]);
    expect(headers.get("X-FD-New-Count")).toBe("1");
  });
});

describe("Astro integration", () => {
  it("getNewFeaturesServer works identically", async () => {
    const { getNewFeaturesServer } = await import("../astro/index");
    expect(getNewFeaturesServer(manifest).length).toBe(2);
    expect(getNewFeaturesServer(manifest, ["dark-mode", "ai-search"]).length).toBe(0);
  });

  it("getManifestScript returns HTML string", async () => {
    const { getManifestScript } = await import("../astro/index");
    const html = getManifestScript(manifest, ["expired"]);
    expect(html).toContain('<script id="__FEATUREDROP_DATA__"');
    expect(html).toContain("application/json");
    expect(html).toContain("</script>");

    // Parse the embedded JSON
    const match = html.match(/>(.+)<\/script>/);
    const data = JSON.parse(match![1]);
    expect(data.manifest.length).toBe(3);
    expect(data.dismissedIds).toEqual(["expired"]);
  });

  it("getManifestScript escapes </script> in JSON", async () => {
    const { getManifestScript } = await import("../astro/index");
    const xssManifest: FeatureEntry[] = [
      {
        id: "test",
        label: "Test",
        description: '</script><script>alert("xss")</script>',
        releasedAt: "2026-02-01",
      },
    ];
    const html = getManifestScript(xssManifest);
    // The raw </script> inside the JSON should be escaped
    expect(html.split("</script>").length).toBe(2); // only the closing tag
  });
});

describe("Nuxt integration", () => {
  it("getNewFeaturesServer works identically", async () => {
    const { getNewFeaturesServer } = await import("../nuxt/index");
    expect(getNewFeaturesServer(manifest).length).toBe(2);
  });

  it("getNewCountServer returns count", async () => {
    const { getNewCountServer } = await import("../nuxt/index");
    expect(getNewCountServer(manifest)).toBe(2);
  });

  it("defineFeatureDropEventHandler returns async handler", async () => {
    const { defineFeatureDropEventHandler } = await import("../nuxt/index");
    const handler = defineFeatureDropEventHandler(
      () => manifest,
      () => ["dark-mode"],
    );
    const result = await handler({});
    expect(result.manifest.length).toBe(3);
    expect(result.newFeatures.length).toBe(1);
    expect(result.newCount).toBe(1);
  });

  it("getHeadScript returns useHead-compatible object", async () => {
    const { getHeadScript } = await import("../nuxt/index");
    const head = getHeadScript(manifest, ["expired"]);
    expect(head.script).toHaveLength(1);
    expect(head.script[0].id).toBe("__FEATUREDROP_DATA__");
    expect(head.script[0].type).toBe("application/json");

    const data = JSON.parse(head.script[0].innerHTML);
    expect(data.dismissedIds).toEqual(["expired"]);
  });
});
