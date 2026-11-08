import { Tag } from "@/components/ui/tag";
import { getPillarLabel } from "@/lib/content/pillars";
import type { TArticleListItem } from "@/types/article.type";
import Link from "next/link";

const formatDate = (value?: string) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return null;
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
};

const isMeaningfullyUpdated = (published?: string, updated?: string) => {
  if (!published || !updated) return false;
  const publishedTime = new Date(published).valueOf();
  const updatedTime = new Date(updated).valueOf();
  return (
    Number.isFinite(publishedTime) &&
    Number.isFinite(updatedTime) &&
    updatedTime - publishedTime >= 24 * 60 * 60 * 1000
  );
};

/**
 * One article as a hairline row, not a card: Mono dates on the left, the role and category as a kicker, a
 * Display title, the excerpt as a one-line takeaway, then reading time, author and topics in Mono. The title
 * link stretches over the whole row. Used by the index and by "Continue reading" on the detail page.
 */
export function ArticleRow({ article }: { article: TArticleListItem }) {
  const href = `/articles/${article.slug ?? article._id}`;
  const published = formatDate(article.published_at);
  const updated = isMeaningfullyUpdated(
    article.published_at,
    article.updated_at
  )
    ? formatDate(article.updated_at)
    : null;
  const role = article.primary_pillar
    ? getPillarLabel(article.primary_pillar)
    : null;
  const category = article.category?.name;
  const takeaway = article.excerpt || article.description;

  return (
    <li className="ed-row" data-featured={article.is_featured || undefined}>
      <div className="ed-row__body">
        <p className="ed-row__kicker t-eyebrow">
          <span>{role ?? category ?? "Engineering"}</span>
          {role && category ? <span>{category}</span> : null}
          {article.is_featured ? (
            <span className="ed-row__featured">Featured</span>
          ) : null}
        </p>
        <h3 className="ed-row__title">
          <Link href={href} className="ed-row__link">
            {article.name}
          </Link>
        </h3>
        {takeaway ? <p className="ed-row__take">{takeaway}</p> : null}
      </div>

      <dl className="ed-row__when t-eyebrow">
        {published ? (
          <div>
            <dt className="sr-only">Published</dt>
            <dd>
              <time dateTime={article.published_at}>{published}</time>
            </dd>
          </div>
        ) : null}
        {updated ? (
          <div>
            <dt className="sr-only">Updated</dt>
            <dd>
              Updated <time dateTime={article.updated_at}>{updated}</time>
            </dd>
          </div>
        ) : null}
      </dl>

      <div className="ed-row__meta">
        <dl className="ed-row__facts t-eyebrow">
          {article.reading_time_minutes ? (
            <div>
              <dt className="sr-only">Reading time</dt>
              <dd>{article.reading_time_minutes} min read</dd>
            </div>
          ) : null}
          {article.author?.name ? (
            <div>
              <dt className="sr-only">Author</dt>
              <dd>{article.author.name}</dd>
            </div>
          ) : null}
        </dl>
        {article.topics?.length ? (
          <ul className="ed-row__topics" aria-label="Article topics">
            {article.topics.slice(0, 4).map((topic) => (
              <li key={topic}>
                <Tag>{topic}</Tag>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </li>
  );
}
