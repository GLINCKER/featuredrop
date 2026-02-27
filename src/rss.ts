import type { FeatureManifest } from "./types";
import { parseDescription } from "./markdown";

function escape(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Generate a simple RSS 2.0 feed from a feature manifest.
 * Titles and descriptions are sanitized via `parseDescription`.
 */
export function generateRSS(manifest: FeatureManifest, options?: { title?: string; link?: string; description?: string }): string {
  const title = escape(options?.title ?? "Featuredrop Changelog");
  const link = escape(options?.link ?? "");
  const desc = escape(options?.description ?? "Product updates");

  const items = manifest
    .slice()
    .sort((a, b) => new Date(b.releasedAt).getTime() - new Date(a.releasedAt).getTime())
    .map((item) => {
      const descriptionHtml = item.description ? parseDescription(item.description) : "";
      const itemLink = item.url ? escape(item.url) : "";
      return [
        "<item>",
        `<title>${escape(item.label)}</title>`,
        itemLink ? `<link>${itemLink}</link>` : "",
        `<guid isPermaLink=\"false\">${escape(item.id)}</guid>`,
        `<pubDate>${new Date(item.releasedAt).toUTCString()}</pubDate>`,
        `<description><![CDATA[${descriptionHtml}]]></description>`,
        "</item>",
      ].join("");
    })
    .join("");

  return [
    "<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
    "<rss version=\"2.0\">",
    "<channel>",
    `<title>${title}</title>`,
    link ? `<link>${link}</link>` : "",
    `<description>${desc}</description>`,
    items,
    "</channel>",
    "</rss>",
  ].join("");
}
