import ShareButton from "@/components/content/share-button";
import { RichContentRenderer } from "@/components/content/rich-content-renderer";
import OptimizedMedia from "@/components/ui/optimized-media";
import { getPillarLabel } from "@/lib/content/pillars";
import type { TArticleListItem, TPublicArticle } from "@/types/article.type";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Clock3,
  User,
} from "lucide-react";
import Link from "next/link";

const dateLabel = (value?: string): string | null => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(date);
};

const ArticleDetailsSection = ({
  article,
  related,
}: {
  article: TPublicArticle;
  related: readonly TArticleListItem[];
}) => {
  const published = dateLabel(article.published_at);
  const pillar = article.primary_pillar
    ? getPillarLabel(article.primary_pillar)
    : null;
  const tags = [
    ...new Set([...(article.topics ?? []), ...(article.tags ?? [])]),
  ];

  return (
    <main className="min-h-screen">
      <header className="bg-surface-subtle border-border relative overflow-hidden border-b py-20 lg:py-28">
        <div className="bg-primary/10 pointer-events-none absolute -top-40 left-1/2 size-[38rem] -translate-x-1/2 rounded-full blur-[150px]" />
        <div className="relative container mx-auto px-6">
          <Link
            href="/articles"
            className="text-muted-foreground hover:text-primary focus-visible:ring-primary inline-flex min-h-11 items-center gap-2 rounded-lg pr-3 text-sm font-bold focus-visible:ring-2 focus-visible:outline-none"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            All articles
          </Link>
          <div className="mx-auto mt-10 max-w-5xl text-center">
            <div className="flex flex-wrap items-center justify-center gap-3 text-xs font-bold">
              {pillar && (
                <span className="bg-primary/10 text-primary rounded-full px-3 py-1.5">
                  {pillar}
                </span>
              )}
              {article.category?.name && (
                <span className="border-border bg-card rounded-full border px-3 py-1.5">
                  {article.category.name}
                </span>
              )}
            </div>
            <h1 className="mt-6 text-4xl leading-[1.03] font-black tracking-tight text-balance sm:text-6xl lg:text-7xl">
              {article.name}
            </h1>
            {(article.excerpt || article.description) && (
              <p className="text-muted-foreground mx-auto mt-7 max-w-3xl text-xl leading-9">
                {article.excerpt || article.description}
              </p>
            )}
            <dl className="text-muted-foreground mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm">
              {article.author?.name && (
                <div className="flex items-center gap-2">
                  <User className="size-4" aria-hidden="true" />
                  <dt className="sr-only">Author</dt>
                  <dd className="font-semibold">{article.author.name}</dd>
                </div>
              )}
              {published && (
                <div className="flex items-center gap-2">
                  <CalendarDays className="size-4" aria-hidden="true" />
                  <dt className="sr-only">Published</dt>
                  <dd>
                    <time
                      dateTime={new Date(article.published_at!).toISOString()}
                    >
                      {published}
                    </time>
                  </dd>
                </div>
              )}
              {article.reading_time_minutes && (
                <div className="flex items-center gap-2">
                  <Clock3 className="size-4" aria-hidden="true" />
                  <dt className="sr-only">Reading time</dt>
                  <dd>{article.reading_time_minutes} min read</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </header>

      <div className="container mx-auto -mt-8 px-6 lg:-mt-12">
        <div className="border-border bg-muted relative aspect-[16/9] overflow-hidden rounded-[2rem] border shadow-[var(--shadow-lg)] lg:aspect-[21/9]">
          <OptimizedMedia
            src={article.thumbnail?.url}
            alt={
              article.thumbnail?.is_decorative
                ? ""
                : article.thumbnail?.alt_text || article.name
            }
            fallback="article"
            pillar={article.primary_pillar}
            sizes="100vw"
            priority
            className="object-cover"
          />
        </div>
      </div>

      <article className="container mx-auto px-6 py-20 lg:py-28">
        <div className="mx-auto max-w-6xl">
          <RichContentRenderer
            document={article.rich_content}
            legacyHtml={article.content}
          />

          {tags.length > 0 && (
            <div className="border-border mt-14 border-t pt-8">
              <h2 className="text-sm font-black tracking-[0.14em] uppercase">
                Topics
              </h2>
              <ul className="mt-4 flex flex-wrap gap-2" role="list">
                {tags.map((tag) => (
                  <li
                    key={tag}
                    className="bg-muted rounded-full px-3 py-1.5 text-xs font-bold"
                  >
                    {tag}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="border-border bg-card mt-14 flex flex-col items-start justify-between gap-6 rounded-2xl border p-6 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-black">
                Share the canonical article
              </h2>
              <p className="text-muted-foreground mt-1 text-sm">
                Use the native share sheet or copy the current link.
              </p>
            </div>
            <ShareButton title={article.name} />
          </div>
        </div>
      </article>

      {related.length > 0 && (
        <section
          className="border-border bg-surface-subtle border-t py-20"
          aria-labelledby="related-articles-title"
        >
          <div className="container mx-auto px-6">
            <div className="flex items-center gap-3">
              <BookOpen className="text-primary size-6" aria-hidden="true" />
              <h2
                id="related-articles-title"
                className="text-3xl font-black tracking-tight"
              >
                Continue reading
              </h2>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {related.map((item) => (
                <Link
                  key={item._id}
                  href={`/articles/${item.slug ?? item._id}`}
                  className="border-border bg-card hover:border-primary group rounded-2xl border p-6"
                >
                  <p className="text-primary text-xs font-black uppercase">
                    {item.primary_pillar
                      ? getPillarLabel(item.primary_pillar)
                      : "Article"}
                  </p>
                  <h3 className="mt-3 text-xl font-black">{item.name}</h3>
                  {(item.excerpt || item.description) && (
                    <p className="text-muted-foreground mt-3 line-clamp-3 text-sm leading-6">
                      {item.excerpt || item.description}
                    </p>
                  )}
                  <span className="text-primary mt-5 inline-flex items-center gap-2 text-sm font-bold">
                    Read article
                    <ArrowRight
                      className="size-4 transition-transform group-hover:translate-x-1"
                      aria-hidden="true"
                    />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
};

export default ArticleDetailsSection;
