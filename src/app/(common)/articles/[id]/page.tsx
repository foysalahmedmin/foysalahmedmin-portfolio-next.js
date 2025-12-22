import { getArticleById } from "@/services/article.service";
import { TArticle } from "@/types/article.type";
import { Metadata } from "next";
import ArticleDetailsContent from "./article-details-content";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const res = await getArticleById(id);
    const article = res.data as TArticle;
    return {
      title: `${article.name} | Blog | Foysal Ahmed`,
      description: article.description,
      openGraph: {
        images: article.thumbnail ? [article.thumbnail] : [],
      },
    };
  } catch (e) {
    return {
      title: "Article | Foysal Ahmed",
    };
  }
}

export default async function ArticleDetailsPage({ params }: Props) {
  const { id } = await params;
  const res = await getArticleById(id);
  const article = res.data as TArticle;

  return <ArticleDetailsContent article={article} />;
}
