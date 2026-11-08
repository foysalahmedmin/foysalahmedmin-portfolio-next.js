"use client";

import ArticleForm from "@/components/admin/article-form";
import { ConsoleError, ConsoleListSkeleton } from "@/components/console";
import { getAdminArticleById, updateArticle } from "@/services/article.service";
import type { TArticle, TArticleInput } from "@/types/article.type";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

const AdminEditArticlePage = () => {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [article, setArticle] = useState<TArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const fetchArticle = async () => {
      try {
        const response = await getAdminArticleById(id, {
          signal: controller.signal,
        });
        if (!response.success || !response.data) {
          throw new Error(response.message || "Failed to fetch article");
        }

        setArticle(response.data);
      } catch (requestError) {
        if (controller.signal.aborted) return;
        setError(getErrorMessage(requestError, "Failed to fetch article"));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void fetchArticle();
    return () => controller.abort();
  }, [id]);

  const handleSubmit = async (data: TArticleInput) => {
    setSaving(true);
    setError(null);
    try {
      const res = await updateArticle(id, data);
      if (res.success) {
        router.push("/admin/articles");
      }
    } catch (updateError) {
      setError(getErrorMessage(updateError, "Failed to update article"));
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return <ConsoleListSkeleton rows={6} columns={2} label="Loading article" />;

  if (!article) {
    return (
      <ConsoleError
        title="Could not load this article"
        description={error ?? "The article was not found."}
        retryHref={`/admin/articles/edit/${id}`}
      />
    );
  }

  return (
    <ArticleForm
      initialData={article}
      onSubmit={handleSubmit}
      onCancel={() => router.push("/admin/articles")}
      loading={saving}
      error={error}
    />
  );
};

export default AdminEditArticlePage;
