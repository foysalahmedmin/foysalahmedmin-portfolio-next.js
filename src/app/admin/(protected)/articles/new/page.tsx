"use client";

import ArticleForm from "@/components/admin/article-form";
import { createArticle } from "@/services/article.service";
import type { TArticleInput } from "@/types/article.type";
import { useRouter } from "next/navigation";
import { useState } from "react";

const AdminNewArticlePage = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: TArticleInput) => {
    setLoading(true);
    setError(null);
    try {
      const res = await createArticle(data);
      if (res.success) {
        router.push("/admin/articles");
      }
    } catch (err: any) {
      setError(err.message || "Failed to create article");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ArticleForm
      onSubmit={handleSubmit}
      onCancel={() => router.push("/admin/articles")}
      loading={loading}
      error={error}
    />
  );
};

export default AdminNewArticlePage;
