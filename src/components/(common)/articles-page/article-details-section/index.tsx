import type { TPublicSiteFallbacksDto } from "@/app/api/site/site.type";
import { RichContentRenderer } from "@/components/content/rich-content-renderer";
import ShareButton from "@/components/content/share-button";
import { ReadingProgress } from "@/components/motion/reading-progress";
import type { PageHeaderProps } from "@/components/templates/page-header";
import OptimizedMedia from "@/components/ui/optimized-media";
import { Tag } from "@/components/ui/tag";
import { prepareEditorialDocument } from "@/lib/content/editorial-document";
import { getPillarLabel } from "@/lib/content/pillars";
import { resolveMediaAlt } from "@/lib/media/presentation";
import { resolvePublicContentFallback } from "@/lib/site/public-content-fallback";
import type { TArticleListItem, TPublicArticle } from "@/types/article.type";
import { ArticleRow } from "../article-row";

const dateLabel = (value?: string): string | null => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(date);
};

/** The shared PageHeader for an article: system path, Display title, excerpt as the lede, Mono meta. */
export const buildArticleHeader = (
  article: TPublicArticle
): PageHeaderProps => {
  const published = dateLabel(article.published_at);
  return {
    title: article.name,
    lede: article.excerpt || article.description,
    path: [
      { index: 1, name: "Home", href: "/", icon: "house" },
      { index: 2, name: "Articles", href: "/articles" },
      { index: 3, name: article.slug ?? article.name },
    ],
    meta:
      published || article.reading_time_minutes ? (
        <>
          {published ? (
            <time dateTime={new Date(article.published_at!).toISOString()}>
              {published}
            </time>
          ) : null}
          {article.reading_time_minutes ? (
            <span>{article.reading_time_minutes} min read</span>
          ) : null}
        </>
      ) : undefined,
  };
};

/**
 * The article body (A4 Detail): a reading column with the cover and the long-form text, a sticky aside with
 * the spec sheet, topics, the table of contents and sharing, then "Continue reading" as the same hairline
 * rows as the index. The page header, JSON-LD and the CtaBand come from the page and its template.
 */
const ArticleDetailsSection = ({
  article,
  related,
  fallbacks,
}: {
  article: TPublicArticle;
  related: readonly TArticleListItem[];
  fallbacks?: TPublicSiteFallbacksDto;
}) => {
  const role = article.primary_pillar
    ? getPillarLabel(article.primary_pillar)
    : null;
  const tags = [
    ...new Set([...(article.topics ?? []), ...(article.tags ?? [])]),
  ];
  const managedFallback = fallbacks
    ? resolvePublicContentFallback({
        kind: "article",
        pillar: article.primary_pillar,
        fallbacks,
      })
    : undefined;
  const cover = article.thumbnail?.url ? article.thumbnail : managedFallback;
  // shortcut: the renderer prepares the same document again for its own body; pass headings in once it takes a prop
  const { headings } = prepareEditorialDocument({
    document: article.rich_content,
    legacy_html: article.content,
  });
  const facts = [
    { label: "Author", value: article.author?.name },
    { label: "Role", value: role },
    { label: "Category", value: article.category?.name },
  ].filter((fact) => Boolean(fact.value));

  return (
    <>
      <ReadingProgress />
      <div className="ed-detail container">
        <article className="ed-main">
          <div className="ed-cover">
            <OptimizedMedia
              src={cover?.url}
              alt={resolveMediaAlt(cover, article.name)}
              fallback="article"
              pillar={article.primary_pillar}
              focalPoint={cover?.focal_point}
              dominantColor={cover?.dominant_color}
              blurDataUrl={cover?.blur_data_url}
              sizes="(max-width: 1024px) 100vw, 46rem"
              priority
              className="object-cover"
            />
          </div>
          <RichContentRenderer
            className="ed-body"
            document={article.rich_content}
            legacyHtml={article.content}
            fallback="article"
            pillar={article.primary_pillar}
          />
        </article>

        <aside className="ed-aside" aria-label="About this article">
          {facts.length > 0 ? (
            <dl className="ed-spec">
              {facts.map((fact) => (
                <div key={fact.label}>
                  <dt className="t-eyebrow">{fact.label}</dt>
                  <dd>{fact.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          {tags.length > 0 ? (
            <section aria-labelledby="article-topics-title">
              <h2
                id="article-topics-title"
                className="ed-aside__title t-eyebrow"
              >
                Topics
              </h2>
              <ul className="ed-tags" role="list">
                {tags.map((tag) => (
                  <li key={tag}>
                    <Tag>{tag}</Tag>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {headings.length >= 2 ? (
            <nav className="ed-toc" aria-labelledby="article-toc-title">
              <h2 id="article-toc-title" className="ed-aside__title t-eyebrow">
                On this page
              </h2>
              <ol role="list">
                {headings.map((heading) => (
                  <li
                    key={heading.id}
                    data-level={heading.level > 2 ? "sub" : undefined}
                  >
                    <a href={`#${heading.id}`}>{heading.label}</a>
                  </li>
                ))}
              </ol>
            </nav>
          ) : null}

          <section aria-labelledby="article-share-title" className="ed-share">
            <h2 id="article-share-title" className="ed-aside__title t-eyebrow">
              Share
            </h2>
            <ShareButton title={article.name} />
          </section>
        </aside>
      </div>

      {related.length > 0 ? (
        <section
          className="ed-related"
          aria-labelledby="related-articles-title"
        >
          <div className="container">
            <h2 id="related-articles-title" className="ed-related__title">
              Continue reading
            </h2>
            <ol className="ed-rows" role="list">
              {related.map((item) => (
                <ArticleRow key={item._id} article={item} />
              ))}
            </ol>
          </div>
        </section>
      ) : null}
    </>
  );
};

export default ArticleDetailsSection;
