import { prepareEditorialDocument } from "@/lib/content/editorial-document";
import { describe, expect, it } from "vitest";

describe("editorial document preparation", () => {
  it("builds stable unique heading anchors after sanitization", () => {
    const result = prepareEditorialDocument({
      legacy_html:
        '<h2 onclick="alert(1)">Architecture</h2><p>Safe</p><h3>Architecture</h3><script>alert(1)</script>',
    });
    expect(result.headings).toEqual([
      { id: "architecture", level: 2, label: "Architecture" },
      { id: "architecture-2", level: 3, label: "Architecture" },
    ]);
    expect(result.blocks[0]).toMatchObject({
      type: "rich_text",
      html: expect.stringContaining('<h2 id="architecture">'),
    });
    expect(JSON.stringify(result.blocks)).not.toContain("onclick");
    expect(JSON.stringify(result.blocks)).not.toContain("script");
  });

  it("preserves typed non-HTML blocks without executing their text", () => {
    const result = prepareEditorialDocument({
      legacy_html: "<p>legacy</p>",
      document: {
        schema_version: 1,
        sanitizer_policy_version: 1,
        blocks: [
          {
            type: "code",
            code: "<script>not executable</script>",
            language: "html",
          },
          { type: "callout", tone: "warning", body: "Review the boundary" },
        ],
      },
    });
    expect(result.blocks).toHaveLength(2);
    expect(result.headings).toEqual([]);
  });
});
