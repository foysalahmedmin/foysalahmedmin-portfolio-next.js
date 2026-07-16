import sanitizeHtml from "sanitize-html";

export const RICH_CONTENT_SCHEMA_VERSION = 1 as const;
export const RICH_CONTENT_POLICY_VERSION = 1 as const;

declare const sanitizedHtmlBrand: unique symbol;

export type SanitizedHtml = string & {
  readonly [sanitizedHtmlBrand]: true;
};

export type RichTextBlock = {
  type: "rich_text";
  html: string;
};

export type CodeBlock = {
  type: "code";
  code: string;
  language?: string;
  caption?: string;
};

export type QuoteBlock = {
  type: "quote";
  quote: string;
  attribution?: string;
};

export type CalloutBlock = {
  type: "callout";
  tone: "info" | "success" | "warning";
  title?: string;
  body: string;
};

export type MediaBlock = {
  type: "media";
  file:
    | string
    | {
        _id: string;
        url: string;
        alt_text?: string;
        caption?: string;
        metadata?: { width?: number; height?: number };
      };
  alt: string;
  caption?: string;
};

export type ArchitectureBlock = {
  type: "architecture";
  title: string;
  description?: string;
  nodes: Array<{
    id: string;
    label: string;
    description?: string;
  }>;
  edges: Array<{
    from: string;
    to: string;
    label?: string;
  }>;
};

export type ContentBlock =
  | RichTextBlock
  | CodeBlock
  | QuoteBlock
  | CalloutBlock
  | MediaBlock
  | ArchitectureBlock;

export type RichContentDocument = {
  schema_version: typeof RICH_CONTENT_SCHEMA_VERSION;
  sanitizer_policy_version: typeof RICH_CONTENT_POLICY_VERSION;
  blocks: ContentBlock[];
};

const allowedTags = [
  "p",
  "br",
  "h2",
  "h3",
  "h4",
  "ul",
  "ol",
  "li",
  "strong",
  "em",
  "del",
  "sup",
  "sub",
  "blockquote",
  "pre",
  "code",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "hr",
  "a",
] as const;

const isExternalHttpUrl = (href: string): boolean => {
  try {
    const url = new URL(href);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

const transformHeading = (
  tagName: string,
  attributes: Record<string, string>
) => {
  const attribs: Record<string, string> = {};
  if (attributes.id && /^[a-z][a-z0-9-]{0,79}$/.test(attributes.id)) {
    attribs.id = attributes.id;
  }
  return { tagName, attribs };
};

/**
 * The only parser boundary for editorial HTML. Keep this module server-only so
 * the sanitizer and its policy cannot drift between API writes and rendering.
 */
export const sanitizeRichHtml = (input: string): SanitizedHtml => {
  const sanitized = sanitizeHtml(input, {
    allowedTags: [...allowedTags],
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      h2: ["id"],
      h3: ["id"],
      h4: ["id"],
      th: ["colspan", "rowspan", "scope"],
      td: ["colspan", "rowspan"],
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedSchemesByTag: {
      a: ["http", "https", "mailto", "tel"],
    },
    allowProtocolRelative: false,
    disallowedTagsMode: "discard",
    enforceHtmlBoundary: true,
    parser: {
      decodeEntities: true,
      lowerCaseAttributeNames: true,
      lowerCaseTags: true,
    },
    transformTags: {
      a: (_tagName, attributes) => {
        const href = attributes.href?.trim();
        if (!href) {
          return { tagName: "span", attribs: {} };
        }

        const nextAttributes: Record<string, string> = { href };
        if (attributes.title) nextAttributes.title = attributes.title;

        if (isExternalHttpUrl(href)) {
          nextAttributes.target = "_blank";
          nextAttributes.rel = "noopener noreferrer nofollow";
        }

        return { tagName: "a", attribs: nextAttributes };
      },
      h2: transformHeading,
      h3: transformHeading,
      h4: transformHeading,
    },
  });

  return sanitized as SanitizedHtml;
};

export const createLegacyRichContentDocument = (
  html: string
): RichContentDocument => ({
  schema_version: RICH_CONTENT_SCHEMA_VERSION,
  sanitizer_policy_version: RICH_CONTENT_POLICY_VERSION,
  blocks: [
    {
      type: "rich_text",
      html: sanitizeRichHtml(html),
    },
  ],
});

export const sanitizeRichContentDocument = (
  document: RichContentDocument
): RichContentDocument => ({
  ...document,
  schema_version: RICH_CONTENT_SCHEMA_VERSION,
  sanitizer_policy_version: RICH_CONTENT_POLICY_VERSION,
  blocks: document.blocks.map((block) =>
    block.type === "rich_text"
      ? { ...block, html: sanitizeRichHtml(block.html) }
      : block
  ),
});
