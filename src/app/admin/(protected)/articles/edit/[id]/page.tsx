"use client";

import ArticleForm from "@/components/admin/article-form";
import { buttonVariants } from "@/components/ui/button";
import { getAdminArticleById, updateArticle } from "@/services/article.service";
import type { TArticle, TArticleInput } from "@/types/article.type";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
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

  if (loading) return <p role="status">Loading article…</p>;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/articles"
          aria-label="Back to articles"
          className={buttonVariants({ variant: "outline", shape: "icon" })}
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Article</h1>
          <p className="text-muted-foreground mt-1">
            Update your article content and settings.
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive rounded-xl p-4 text-sm font-bold">
          {error}
        </div>
      )}

      <div className="border-border bg-card rounded-3xl border p-8 shadow-sm">
        {article && (
          <ArticleForm
            initialData={article}
            onSubmit={handleSubmit}
            onCancel={() => router.push("/admin/articles")}
            loading={saving}
          />
        )}
      </div>
    </div>
  );
};

export default AdminEditArticlePage;
