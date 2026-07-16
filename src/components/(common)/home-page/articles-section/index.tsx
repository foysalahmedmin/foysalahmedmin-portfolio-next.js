import OptimizedMedia from "@/components/ui/optimized-media";
import {
  Description,
  SectionTitle,
  Subtitle,
  Title,
} from "@/components/ui/section-title";
import { getPillarLabel } from "@/lib/content/pillars";
import type { TArticleListItem } from "@/types/article.type";
import { ArrowRight, Calendar, Clock, User } from "lucide-react";
import Link from "next/link";

const formatDate = (value: string): string =>
  new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));

function ArticleCard({ article }: { article: TArticleListItem }) {
  const href = `/articles/${article.slug ?? article._id}`;
  const topic =
    article.category?.name ??
    (article.primary_pillar ? getPillarLabel(article.primary_pillar) : null);

  return (
    <article className="fade-up group bg-card border-border flex h-full flex-col overflow-hidden rounded-[var(--radius-xl-token)] border shadow-[var(--shadow-xs)] transition-[border-color,box-shadow,transform] duration-[var(--motion-standard)] hover:shadow-[var(--shadow-md)] motion-safe:hover:-translate-y-1">
      <div className="relative aspect-[16/10] overflow-hidden">
        <OptimizedMedia
          src={article.thumbnail?.url}
          alt={article.thumbnail?.alt_text || `${article.name} article visual`}
          fallback="article"
          pillar={article.primary_pillar}
          sizes="(max-width: 768px) 100vw, 33vw"
          className="h-full w-full object-cover transition-transform duration-[var(--motion-slow)] motion-safe:group-hover:scale-[1.03]"
        />
      </div>

      <div className="flex flex-1 flex-col p-7 lg:p-8">
        {topic ? <p className="text-primary type-label mb-4">{topic}</p> : null}
        <h3 className="group-hover:text-primary text-2xl leading-tight font-black tracking-tight transition-colors">
          <Link href={href}>{article.name}</Link>
        </h3>
        {article.excerpt || article.description ? (
          <p className="text-muted-foreground mt-4 line-clamp-3 leading-relaxed">
            {article.excerpt || article.description}
          </p>
        ) : null}

        <div className="text-muted-foreground mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs">
          {article.published_at ? (
            <span className="flex items-center gap-2">
              <Calendar className="size-3.5" aria-hidden="true" />
              {formatDate(article.published_at)}
            </span>
          ) : null}
          {article.reading_time_minutes ? (
            <span className="flex items-center gap-2">
              <Clock className="size-3.5" aria-hidden="true" />
              {article.reading_time_minutes} min read
            </span>
          ) : null}
          {article.author?.name ? (
            <span className="flex items-center gap-2">
              <User className="size-3.5" aria-hidden="true" />
              {article.author.name}
            </span>
          ) : null}
        </div>

        <Link
          href={href}
          className="text-primary focus-visible:ring-ring mt-7 inline-flex min-h-11 w-fit items-center gap-2 rounded-sm text-sm font-black tracking-widest uppercase focus-visible:ring-2"
        >
          Read article <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}

export default function ArticlesSection({
  articles,
  unavailable = false,
  heading,
}: {
  articles: readonly TArticleListItem[];
  unavailable?: boolean;
  heading?: string;
}) {
  return (
    <section id="articles" className="py-[var(--space-section)]">
      <div className="container">
        <div className="mb-14 flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <SectionTitle variant="none" className="mb-0 max-w-2xl">
            <Subtitle>Engineering notes</Subtitle>
            <Title>{heading || "Published technical writing"}</Title>
            <Description className="mx-0">
              Long-form records keep authorship, publication state, reading
              metadata, and safe editorial content explicit.
            </Description>
          </SectionTitle>
          <Link
            href="/articles"
            className="border-border hover:border-primary focus-visible:ring-ring inline-flex min-h-11 w-fit items-center gap-3 rounded-full border px-5 text-sm font-bold focus-visible:ring-2"
          >
            Browse articles <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>

        {articles.length ? (
          <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
            {articles.slice(0, 6).map((article) => (
              <ArticleCard key={article._id} article={article} />
            ))}
          </div>
        ) : (
          <div className="border-border bg-surface-subtle rounded-[var(--radius-lg-token)] border p-8 text-center">
            <h3 className="font-bold">
              {unavailable
                ? "Articles are temporarily unavailable"
                : "No approved public article is available yet"}
            </h3>
            <p className="text-muted-foreground mx-auto mt-2 max-w-xl text-sm">
              {unavailable
                ? "The public article reader could not be reached. The articles page can be retried directly."
                : "Draft and incomplete writing remains private until its publication checks pass."}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
