import { describe, it, expect } from "vitest";
import { parseDescription } from "../markdown";

describe("parseDescription", () => {
  it("renders basic markdown", () => {
    const html = parseDescription(`# Title\n\nHello **world**`);
    expect(html).toContain("<h1>Title</h1>");
    expect(html).toContain("<strong>world</strong>");
  });

  it("strips script tags and event handlers", () => {
    const html = parseDescription('<p onclick="alert(1)">Hi</p><script>alert(2)</script>');
    expect(html).toContain("<p>Hi</p>");
    expect(html).not.toContain("onclick");
    expect(html).not.toContain("script");
  });

  it("blocks javascript and data URLs", () => {
    const html = parseDescription('[x](javascript:alert(1)) ![y](data:text/html;base64,abc)');
    expect(html).not.toContain("href\=");
    expect(html).not.toContain("src\=");
  });

  it("renders code fences with language class when shiki unavailable", () => {
    const html = parseDescription("```ts\nconst x = 1;\n```");
    expect(html).toContain("<pre><code class=\"language-ts\">");
    expect(html).toContain("const x = 1;");
  });

  it("handles inline code and lists", () => {
    const html = parseDescription("- item with `code`");
    expect(html).toContain("<ul>");
    expect(html).toContain("<code>code</code>");
  });

  it("returns empty string for empty input", () => {
    expect(parseDescription("")).toBe("");
  });
});
