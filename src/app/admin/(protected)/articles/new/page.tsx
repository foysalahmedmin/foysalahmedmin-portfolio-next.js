"use client";

import ArticleForm from "@/components/admin/article-form";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createArticle } from "@/services/article.service";
import type { TArticleInput } from "@/types/article.type";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
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
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/articles"
          aria-label="Back to articles"
          className={cn(buttonVariants({ variant: "outline", shape: "icon" }))}
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Create New Article
          </h1>
          <p className="text-muted-foreground mt-1">
            Share your knowledge with the world.
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive rounded-xl p-4 text-sm font-bold">
          {error}
        </div>
      )}

      <div className="border-border bg-card rounded-3xl border p-8 shadow-sm">
        <ArticleForm
          onSubmit={handleSubmit}
          onCancel={() => router.push("/admin/articles")}
          loading={loading}
        />
      </div>
    </div>
  );
};

export default AdminNewArticlePage;
