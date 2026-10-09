import sanitizeHtml from "sanitize-html";
import type { ArticleBodyMetadata } from "./portfolio-contract";

// Server-only: sanitize-html (with htmlparser2 and postcss) is about 90 KB gzip. It lives apart from
// portfolio-contract.ts, which client components import for constants and URL checks.
export const deriveArticleBodyMetadata = (
  sanitizedHtml: string
): ArticleBodyMetadata => {
  const textWithBlockBoundaries = sanitizedHtml.replace(
    /<\/?(?:p|h[1-6]|li|blockquote|pre|tr|td|th|br|hr)(?:\s[^>]*)?>/gi,
    " "
  );
  const plainText = sanitizeHtml(textWithBlockBoundaries, {
    allowedTags: [],
    allowedAttributes: {},
  })
    .replace(/\s+/g, " ")
    .trim();
  const words = plainText ? plainText.split(" ").filter(Boolean) : [];
  const headingCount = (sanitizedHtml.match(/<h[2-4](?:\s[^>]*)?>/gi) ?? [])
    .length;
  return {
    schema_version: 1,
    word_count: words.length,
    heading_count: headingCount,
  };
};
