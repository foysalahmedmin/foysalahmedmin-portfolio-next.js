import { prepareEditorialDocument } from "@/lib/content/editorial-document";
import type { RichContentDocument } from "@/lib/content/rich-content";
import { cn } from "@/lib/utils";
import OptimizedMedia from "@/components/ui/optimized-media";
import TrustedRichText from "./trusted-rich-text";
import { CodeBlock } from "./code-block";

const mediaValue = (value: unknown) => {
  if (!value || typeof value !== "object") return null;
  const file = value as {
    _id?: unknown;
    url?: unknown;
    alt_text?: unknown;
    caption?: unknown;
  };
  return typeof file.url === "string" && file.url
    ? {
        id: String(file._id ?? file.url),
        url: file.url,
        alt_text: typeof file.alt_text === "string" ? file.alt_text : undefined,
        caption: typeof file.caption === "string" ? file.caption : undefined,
      }
    : null;
};

export const RichContentRenderer = ({
  document,
  legacyHtml,
  className,
}: {
  document?: RichContentDocument | null;
  legacyHtml: string;
  className?: string;
}) => {
  const prepared = prepareEditorialDocument({
    document,
    legacy_html: legacyHtml,
  });

  return (
    <div
      className={cn(
        "grid gap-10 lg:grid-cols-[minmax(0,1fr)_14rem]",
        className
      )}
    >
      <div className="min-w-0">
        {prepared.blocks.map((block, index) => {
          if (block.type === "rich_text") {
            return (
              <TrustedRichText
                key={`rich-text-${index}`}
                html={block.html}
                className="editorial max-w-none"
              />
            );
          }
          if (block.type === "code") {
            return (
              <CodeBlock
                key={`code-${index}`}
                code={block.code}
                language={block.language}
                caption={block.caption}
              />
            );
          }
          if (block.type === "quote") {
            return (
              <figure
                key={`quote-${index}`}
                className="border-primary bg-primary/5 my-10 rounded-r-2xl border-l-2 p-6"
              >
                <blockquote className="text-xl leading-8 font-semibold">
                  {block.quote}
                </blockquote>
                {block.attribution && (
                  <figcaption className="text-muted-foreground mt-4 text-sm">
                    — {block.attribution}
                  </figcaption>
                )}
              </figure>
            );
          }
          if (block.type === "callout") {
            return (
              <aside
                key={`callout-${index}`}
                className={cn(
                  "border-border my-10 rounded-2xl border p-6",
                  block.tone === "success" && "border-success/30 bg-success/10",
                  block.tone === "warning" && "border-warning/30 bg-warning/10",
                  block.tone === "info" && "border-primary/30 bg-primary/5"
                )}
              >
                {block.title && <h3 className="font-bold">{block.title}</h3>}
                <p className="text-muted-foreground mt-2 leading-7">
                  {block.body}
                </p>
              </aside>
            );
          }
          if (block.type === "media") {
            const file = mediaValue(block.file);
            if (!file) return null;
            return (
              <figure key={`${file.id}-${index}`} className="my-10">
                <div className="border-border relative aspect-video overflow-hidden rounded-2xl border">
                  <OptimizedMedia
                    src={file.url}
                    alt={block.alt || file.alt_text || ""}
                    fallback="article"
                    sizes="(max-width: 1024px) 100vw, 70vw"
                    className="object-cover"
                  />
                </div>
                {(block.caption || file.caption) && (
                  <figcaption className="text-muted-foreground mt-3 text-center text-sm leading-6">
                    {block.caption || file.caption}
                  </figcaption>
                )}
              </figure>
            );
          }
          return (
            <figure
              key={`architecture-${index}`}
              className="border-border bg-surface-raised my-10 rounded-2xl border p-6"
            >
              <figcaption>
                <h3 className="text-xl font-bold">{block.title}</h3>
                {block.description && (
                  <p className="text-muted-foreground mt-2 leading-7">
                    {block.description}
                  </p>
                )}
              </figcaption>
              <ol
                className="mt-6 grid gap-3 sm:grid-cols-2"
                aria-label={`${block.title} nodes`}
              >
                {block.nodes.map((node) => (
                  <li
                    key={node.id}
                    className="border-border bg-card rounded-xl border p-4"
                  >
                    <p className="font-bold">{node.label}</p>
                    {node.description && (
                      <p className="text-muted-foreground mt-1 text-sm leading-6">
                        {node.description}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
              {block.edges.length > 0 && (
                <ul
                  className="text-muted-foreground mt-5 space-y-2 text-xs"
                  aria-label={`${block.title} connections`}
                >
                  {block.edges.map((edge, edgeIndex) => (
                    <li key={`${edge.from}-${edge.to}-${edgeIndex}`}>
                      {edge.from} → {edge.to}
                      {edge.label ? ` · ${edge.label}` : ""}
                    </li>
                  ))}
                </ul>
              )}
            </figure>
          );
        })}
      </div>

      {prepared.headings.length >= 2 && (
        <nav className="hidden lg:block" aria-labelledby="article-toc-title">
          <div className="sticky top-28">
            <p
              id="article-toc-title"
              className="text-xs font-black tracking-[0.15em] uppercase"
            >
              On this page
            </p>
            <ol className="border-border mt-4 space-y-2 border-l pl-4">
              {prepared.headings.map((heading) => (
                <li
                  key={heading.id}
                  className={heading.level > 2 ? "pl-3" : undefined}
                >
                  <a
                    href={`#${heading.id}`}
                    className="text-muted-foreground hover:text-primary focus-visible:ring-primary inline-flex min-h-11 items-center rounded-md text-xs leading-5 focus-visible:ring-2 focus-visible:outline-none"
                  >
                    {heading.label}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </nav>
      )}
    </div>
  );
};
