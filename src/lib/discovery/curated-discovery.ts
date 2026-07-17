import type {
  ArticleDiscoveryQuery,
  ProjectDiscoveryQuery,
} from "@/lib/discovery/public-discovery";
import type { TArticleListItem } from "@/types/article.type";
import type { TProjectListItem } from "@/types/project.type";

export const filterAndSortCuratedProjects = (
  projects: readonly TProjectListItem[],
  query: ProjectDiscoveryQuery
): TProjectListItem[] => {
  const search = query.search.trim().toLowerCase();
  const filtered = projects.filter((project) => {
    const startedYear = project.started_at
      ? new Date(project.started_at).getUTCFullYear()
      : null;
    return (
      (!search ||
        [
          project.name,
          project.description,
          project.role,
          ...(project.tags ?? []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(search)) &&
      (query.pillar === "all" ||
        project.primary_pillar === query.pillar ||
        project.secondary_pillars?.includes(query.pillar)) &&
      (query.category === "all" || project.category?.slug === query.category) &&
      (query.technology === "all" ||
        project.tags?.includes(query.technology)) &&
      (query.type === "all" || project.project_type === query.type) &&
      (query.year === null || startedYear === query.year)
    );
  });
  return [...filtered].sort((left, right) => {
    if (query.sort === "name") return left.name.localeCompare(right.name);
    const leftTime = left.started_at ? Date.parse(left.started_at) : 0;
    const rightTime = right.started_at ? Date.parse(right.started_at) : 0;
    if (query.sort === "oldest") return leftTime - rightTime;
    if (query.sort === "newest") return rightTime - leftTime;
    return (
      Number(right.is_featured) - Number(left.is_featured) ||
      rightTime - leftTime
    );
  });
};

export const filterAndSortCuratedArticles = (
  articles: readonly TArticleListItem[],
  query: ArticleDiscoveryQuery
): TArticleListItem[] => {
  const search = query.search.trim().toLowerCase();
  const filtered = articles.filter(
    (article) =>
      (!search ||
        [
          article.name,
          article.description,
          article.excerpt,
          ...(article.tags ?? []),
          ...(article.topics ?? []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(search)) &&
      (query.pillar === "all" ||
        article.primary_pillar === query.pillar ||
        article.secondary_pillars?.includes(query.pillar)) &&
      (query.category === "all" || article.category?.slug === query.category) &&
      (query.topic === "all" || article.topics?.includes(query.topic))
  );
  return [...filtered].sort((left, right) => {
    if (query.sort === "name") return left.name.localeCompare(right.name);
    if (query.sort === "featured") {
      const featured = Number(right.is_featured) - Number(left.is_featured);
      if (featured) return featured;
    }
    const leftTime = left.published_at ? Date.parse(left.published_at) : 0;
    const rightTime = right.published_at ? Date.parse(right.published_at) : 0;
    return query.sort === "oldest"
      ? leftTime - rightTime
      : rightTime - leftTime;
  });
};
