import * as ArticleService from "@/app/api/articles/article.service";
import ArticleDetailsSection from "@/components/(common)/articles-page/article-details-section";
import { JsonLdScript } from "@/components/content/json-ld-script";
import AppError from "@/builder/app-error";
import { buildPageMetadata } from "@/lib/metadata/site-metadata";
import {
  buildArticleJsonLd,
  buildBreadcrumbJsonLd,
  buildWebPageJsonLd,
} from "@/lib/metadata/json-ld";
import { readPublishedSite } from "@/lib/site/published-site";
import type { TArticleListItem, TPublicArticle } from "@/types/article.type";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

const asMetadataImage = (file: TPublicArticle["thumbnail"]) =>
  file
    ? {
        id: file._id,
        url: file.url,
        ...(file.alt_text ? { alt_text: file.alt_text } : {}),
        ...(file.metadata?.width && typeof file.metadata.width === "number"
          ? { width: file.metadata.width }
          : {}),
        ...(file.metadata?.height && typeof file.metadata.height === "number"
          ? { height: file.metadata.height }
          : {}),
      }
    : undefined;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const site = await readPublishedSite();
  try {
    const article = (await ArticleService.getPublicArticleByIdentifier(
      id
    )) as unknown as TPublicArticle;
    return buildPageMetadata(site, {
      pathname: `/articles/${article.slug ?? id}`,
      title: article.name,
      description: article.excerpt || article.description,
      kind: "article",
      pillar: article.primary_pillar,
      image: asMetadataImage(article.thumbnail),
    });
  } catch {
    return {
      title: "Article unavailable",
      robots: { index: false, follow: false },
    };
  }
}

export default async function ArticleDetailsPage({ params }: Props) {
  const { id } = await params;
  let article: TPublicArticle;
  try {
    article = (await ArticleService.getPublicArticleByIdentifier(
      id
    )) as unknown as TPublicArticle;
  } catch (error) {
    if (error instanceof AppError && error.status === 404) notFound();
    throw error;
  }
  if (article.slug && article.slug !== id) {
    permanentRedirect(`/articles/${article.slug}`);
  }

  const [site, relatedResult] = await Promise.all([
    readPublishedSite(),
    article.primary_pillar
      ? ArticleService.getPublicArticles({
          primary_pillar: article.primary_pillar,
          limit: 4,
          sort: "-published_at,name",
        }).catch(() => ({ data: [] }))
      : Promise.resolve({ data: [] }),
  ]);
  const related = (relatedResult.data as unknown as TArticleListItem[])
    .filter((item) => item._id !== article._id)
    .slice(0, 3);

  const pathname = `/articles/${article.slug ?? id}`;
  const structuredData = [
    buildWebPageJsonLd(site, {
      pathname,
      title: article.name,
      description: article.excerpt || article.description,
    }),
    buildArticleJsonLd(site, {
      pathname,
      title: article.name,
      description: article.excerpt || article.description,
      published_at: article.published_at,
      updated_at: article.updated_at,
      author_name: article.author?.name,
      image_url: article.thumbnail?.url,
      keywords: [
        ...(article.topics ?? []),
        ...(article.tags ?? []),
        ...(article.primary_pillar ? [article.primary_pillar] : []),
      ],
    }),
    buildBreadcrumbJsonLd(site, [
      { name: "Home", pathname: "/" },
      { name: "Articles", pathname: "/articles" },
      { name: article.name, pathname },
    ]),
  ].filter((item) => item !== null);

  return (
    <>
      <JsonLdScript data={structuredData} />
      <ArticleDetailsSection article={article} related={related} />
    </>
  );
}
