import {
  RICH_CONTENT_POLICY_VERSION,
  RICH_CONTENT_SCHEMA_VERSION,
  createLegacyRichContentDocument,
  sanitizeRichHtml,
} from "@/lib/content/rich-content";
import { describe, expect, it } from "vitest";
import { analyzeLegacyRichContent } from "@/lib/db/migrations/202607150002-sanitize-rich-content";

describe("rich-content security boundary", () => {
  it.each([
    ["script", "<p>safe</p><script>alert(1)</script>", "<p>safe</p>"],
    ["event handler", '<p onmouseover="alert(1)">safe</p>', "<p>safe</p>"],
    ["SVG", "<svg><script>alert(1)</script></svg><p>safe</p>", "<p>safe</p>"],
    [
      "inline style",
      '<p style="background:url(javascript:alert(1))">safe</p>',
      "<p>safe</p>",
    ],
    ["javascript URL", '<a href="javascript:alert(1)">bad</a>', "<a>bad</a>"],
    ["encoded URL", '<a href="&#106;avascript:alert(1)">bad</a>', "<a>bad</a>"],
    ["data URL", '<a href="data:text/html;base64,WA==">bad</a>', "<a>bad</a>"],
    [
      "iframe",
      '<iframe src="https://example.com"></iframe><p>safe</p>',
      "<p>safe</p>",
    ],
    [
      "form",
      '<form action="/steal"><input name="x"></form><p>safe</p>',
      "<p>safe</p>",
    ],
    ["malformed markup", "<p><img src=x onerror=alert(1)>safe", "<p>safe</p>"],
  ])("removes %s attacks", (_name, input, expected) => {
    expect(sanitizeRichHtml(input)).toBe(expected);
  });

  it("preserves the approved semantic subset", () => {
    const input = [
      "<h2>Architecture</h2>",
      "<p>A <strong>safe</strong> paragraph.</p>",
      "<blockquote>Trade-offs matter.</blockquote>",
      "<pre><code>const safe = true;</code></pre>",
      '<a href="/projects">Internal</a>',
      '<a href="https://example.com" target="evil" rel="evil">External</a>',
      '<table><thead><tr><th scope="col">Key</th></tr></thead><tbody><tr><td>Value</td></tr></tbody></table>',
    ].join("");

    const result = sanitizeRichHtml(input);

    expect(result).toContain("<h2>Architecture</h2>");
    expect(result).toContain('<a href="/projects">Internal</a>');
    expect(result).toContain(
      '<a href="https://example.com" target="_blank" rel="noopener noreferrer nofollow">External</a>'
    );
    expect(result).not.toContain("evil");
  });

  it("creates a versioned, sanitized legacy document", () => {
    const document = createLegacyRichContentDocument(
      "<p>Hello</p><script>alert(1)</script>"
    );

    expect(document).toEqual({
      schema_version: RICH_CONTENT_SCHEMA_VERSION,
      sanitizer_policy_version: RICH_CONTENT_POLICY_VERSION,
      blocks: [{ type: "rich_text", html: "<p>Hello</p>" }],
    });
  });

  it("reports migration changes without exposing the rejected source", () => {
    expect(
      analyzeLegacyRichContent('<script secret="token">x</script>')
    ).toEqual({
      content:
        "<p>This content is temporarily unavailable pending editorial review.</p>",
      changed: true,
      used_fallback: true,
    });
  });
});
