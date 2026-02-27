import * as moduleApi from "module";

// Lightweight markdown parser with optional `marked` + `shiki` support.
// The function is synchronous and always returns sanitized HTML.

type MarkedRenderer = {
  link?: (href: string | null, title: string | null, text: string) => string;
  image?: (href: string | null, title: string | null, text: string) => string;
  paragraph?: (text: string) => string;
  heading?: (text: string, level: number) => string;
};

type MarkedModule = {
  Renderer?: new () => MarkedRenderer;
  parse?: (markdown: string, options?: { renderer?: MarkedRenderer }) => string | Promise<string>;
};

type ShikiLike = {
  codeToHtml?: (code: string, options?: { lang?: string; theme?: string }) => string | Promise<string>;
};

const dynamicRequire =
  typeof moduleApi.createRequire === "function" ? moduleApi.createRequire(import.meta.url) : null;

let cachedMarked: MarkedModule | null | false = null;
let cachedShiki: ShikiLike | null | false = null;

function optionalRequire<T>(name: string): T | null {
  if (!dynamicRequire) return null;
  try {
    // Using dynamic require so missing optional peers don't break bundling/runtime.
    return dynamicRequire(name) as T;
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "MODULE_NOT_FOUND") {
      return null;
    }
    // Any other error should still be treated as a failure to keep parsing resilient.
    return null;
  }
}

function getMarked(): MarkedModule | null {
  if (cachedMarked !== null) return cachedMarked || null;
  cachedMarked = optionalRequire<MarkedModule>("marked") ?? false;
  return cachedMarked || null;
}

function getShiki(): ShikiLike | null {
  if (cachedShiki !== null) return cachedShiki || null;
  cachedShiki = optionalRequire<ShikiLike>("shiki") ?? false;
  return cachedShiki || null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  const lower = trimmed.toLowerCase();
  if (lower.startsWith("javascript:")) return null;
  if (lower.startsWith("data:")) return null;
  if (lower.startsWith("vbscript:")) return null;

  // Disallow characters that can break attribute context
  if (/['"<>\s]/.test(trimmed)) return null;

  return trimmed;
}

function sanitizeHtml(html: string): string {
  return html
    // Remove script/style tags entirely
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    // Remove inline event handlers (on*)
    .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    // Remove javascript: or data: URLs in href/src/xlink:href
    .replace(/\s+(?:href|src|xlink:href)\s*=\s*("|')(?:javascript:|data:)[^"']*\1/gi, "");
}

function decodeAllowedEntities(html: string): string {
  const allowTags = [
    "p",
    "strong",
    "em",
    "a",
    "code",
    "pre",
    "img",
    "ul",
    "ol",
    "li",
    "blockquote",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "br",
  ];

  // Decode common entities inside allowed tags only
  return html.replace(/&lt;(\/?)([a-z0-9]+)([^>]*)&gt;/gi, (match, slash, tag, rest) => {
    if (!allowTags.includes(tag.toLowerCase())) return match;
    const decodedRest = rest
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">");
    return `<${slash}${tag}${decodedRest}>`;
  });
}

function renderCodeBlock(code: string, language: string | undefined): string {
  const shiki = getShiki();
  if (shiki?.codeToHtml) {
    try {
      const rendered = shiki.codeToHtml(code, { lang: language || "text", theme: "github-dark" });
      if (typeof rendered === "string") return rendered;
    } catch {
      // Fall through to non-highlighted rendering
    }
  }

  const langAttr = language ? ` class="language-${escapeHtml(language)}"` : "";
  return `<pre><code${langAttr}>${escapeHtml(code)}</code></pre>`;
}

function inlineMarkdown(text: string): string {
  // Escape user-provided HTML before applying markdown conversions.
  let result = escapeHtml(text);

  // Protect inline code spans so subsequent replacements don't mangle them.
  const codeSpans: string[] = [];
  result = result.replace(/`([^`]+)`/g, (_match, code) => {
    const idx = codeSpans.length;
    codeSpans.push(`<code>${escapeHtml(code)}</code>`);
    return `§§CODE${idx}§§`;
  });

  // Images: ![alt](url)
  result = result.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_match, alt, url) => {
    const safeUrl = sanitizeUrl(url);
    const safeAlt = escapeHtml(alt ?? "");
    if (!safeUrl) return safeAlt;
    return `<img src="${escapeHtml(safeUrl)}" alt="${safeAlt}" />`;
  });

  // Links: [text](url)
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label, url) => {
    const safeUrl = sanitizeUrl(url);
    const safeLabel = escapeHtml(label ?? "");
    if (!safeUrl) return safeLabel;
    return `<a href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener noreferrer">${safeLabel}</a>`;
  });

  // Bold and italic (basic)
  result = result.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  result = result.replace(/\*([^*]+)\*/g, "<em>$1</em>");

  // Restore code spans
  result = result.replace(/§§CODE(\d+)§§/g, (_m, idx) => codeSpans[Number(idx)] ?? "");

  return result;
}

function fallbackParse(markdown: string): string {
  const lines = markdown.split(/\r?\n/);
  const blocks: string[] = [];
  let listBuffer: string[] | null = null;
  let quoteBuffer: string[] | null = null;
  let inCodeBlock = false;
  let codeLang: string | undefined;
  let codeLines: string[] = [];

  const flushList = () => {
    if (!listBuffer) return;
    blocks.push(`<ul>${listBuffer.map((item) => `<li>${item}</li>`).join("")}</ul>`);
    listBuffer = null;
  };

  const flushQuote = () => {
    if (!quoteBuffer) return;
    const content = quoteBuffer.map((line) => inlineMarkdown(line.trim())).join("<br>");
    blocks.push(`<blockquote>${content}</blockquote>`);
    quoteBuffer = null;
  };

  const flushCode = () => {
    if (!inCodeBlock) return;
    blocks.push(renderCodeBlock(codeLines.join("\n"), codeLang));
    codeLines = [];
    codeLang = undefined;
    inCodeBlock = false;
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/, "");

    const codeFence = line.match(/^```(.*)$/);
    if (codeFence) {
      if (inCodeBlock) {
        flushCode();
      } else {
        flushList();
        flushQuote();
        inCodeBlock = true;
        codeLang = codeFence[1]?.trim() || undefined;
        codeLines = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(rawLine);
      continue;
    }

    const listMatch = line.match(/^\s*[-*+]\s+(.*)$/);
    if (listMatch) {
      flushQuote();
      listBuffer = listBuffer ?? [];
      listBuffer.push(inlineMarkdown(listMatch[1].trim()));
      continue;
    }

    if (listBuffer) flushList();

    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flushQuote();
      const level = headingMatch[1].length;
      const content = inlineMarkdown(headingMatch[2].trim());
      blocks.push(`<h${level}>${content}</h${level}>`);
      continue;
    }

    const quoteMatch = line.match(/^>\s?(.*)$/);
    if (quoteMatch) {
      quoteBuffer = quoteBuffer ?? [];
      quoteBuffer.push(quoteMatch[1]);
      continue;
    }

    if (quoteBuffer) flushQuote();

    if (!line.trim()) {
      continue;
    }

    blocks.push(`<p>${inlineMarkdown(line.trim())}</p>`);
  }

  flushList();
  flushQuote();
  flushCode();

  return blocks.join("\n");
}

function renderWithMarked(markdown: string, marked: MarkedModule): string | null {
  if (!marked.parse) return null;

  const renderer = marked.Renderer ? new marked.Renderer() : undefined;

  if (renderer) {
    renderer.link = (href, _title, text) => {
      const safeUrl = sanitizeUrl(href);
      if (!safeUrl) return escapeHtml(text);
      return `<a href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener noreferrer">${text}</a>`;
    };
    renderer.image = (href, _title, text) => {
      const safeUrl = sanitizeUrl(href);
      const safeAlt = escapeHtml(text ?? "");
      if (!safeUrl) return safeAlt;
      return `<img src="${escapeHtml(safeUrl)}" alt="${safeAlt}" />`;
    };
  }

  const output = marked.parse(markdown, renderer ? { renderer } : undefined);
  if (typeof output === "string") return output;
  return output ? String(output) : null;
}

/**
 * Parse a feature description from markdown into sanitized HTML.
 * - Uses `marked` when installed (optional peer dep)
 * - Falls back to a tiny built-in parser when `marked` is absent
 * - Strips script tags, event handlers, and javascript:/data: URLs
 */
export function parseDescription(markdown: string): string {
  if (!markdown) return "";

  const marked = getMarked();
  if (marked) {
    try {
      const rendered = renderWithMarked(markdown, marked);
      if (rendered) {
        const sanitized = sanitizeHtml(rendered);
        const decoded = decodeAllowedEntities(sanitized);
        return sanitizeHtml(decoded);
      }
    } catch {
      // If marked fails for any reason, fall back to the tiny parser.
    }
  }

  // Fast path: raw HTML provided without `marked` installed
  if (/<[^>]+>/.test(markdown)) {
    const sanitized = sanitizeHtml(markdown);
    const decoded = decodeAllowedEntities(sanitized);
    return sanitizeHtml(decoded);
  }

  const fallback = fallbackParse(markdown);
  const sanitized = sanitizeHtml(fallback);
  const decoded = decodeAllowedEntities(sanitized);
  return sanitizeHtml(decoded);
}
