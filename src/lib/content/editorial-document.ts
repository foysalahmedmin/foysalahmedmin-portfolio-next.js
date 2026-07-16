import sanitizeHtml from "sanitize-html";
import { normalizeSlug } from "./slug";
import {
  createLegacyRichContentDocument,
  sanitizeRichContentDocument,
  sanitizeRichHtml,
  type ContentBlock,
  type RichContentDocument,
} from "./rich-content";

export type TEditorialHeading = Readonly<{
  id: string;
  level: 2 | 3 | 4;
  label: string;
}>;

export type TPreparedEditorialDocument = Readonly<{
  blocks: readonly ContentBlock[];
  headings: readonly TEditorialHeading[];
}>;

const plainHeading = (html: string): string =>
  sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);

export const prepareEditorialDocument = (input: {
  document?: RichContentDocument | null;
  legacy_html: string;
}): TPreparedEditorialDocument => {
  const source = input.document?.blocks?.length
    ? sanitizeRichContentDocument(input.document)
    : createLegacyRichContentDocument(input.legacy_html);
  const headings: TEditorialHeading[] = [];
  const used = new Map<string, number>();

  const blocks = source.blocks.map((block, blockIndex): ContentBlock => {
    if (block.type !== "rich_text") return block;
    const safe = sanitizeRichHtml(block.html);
    const html = safe.replace(
      /<h([2-4])(?:\s[^>]*)?>([\s\S]*?)<\/h\1>/gi,
      (_match, rawLevel: string, inner: string) => {
        const level = Number(rawLevel) as 2 | 3 | 4;
        const label = plainHeading(inner) || `Section ${headings.length + 1}`;
        const base = normalizeSlug(label, {
          fallback: `section-${blockIndex + 1}`,
          maxLength: 64,
        });
        const occurrence = (used.get(base) ?? 0) + 1;
        used.set(base, occurrence);
        const id = occurrence === 1 ? base : `${base}-${occurrence}`;
        headings.push({ id, level, label });
        return `<h${level} id="${id}">${inner}</h${level}>`;
      }
    );
    return { ...block, html: sanitizeRichHtml(html) };
  });

  return { blocks, headings };
};
