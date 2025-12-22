"use client";

import ArticleForm from "@/components/admin/article-form";
import { Button } from "@/components/ui/button";
import { getArticleById, updateArticle } from "@/services/article.service";
import { TArticle } from "@/types/article.type";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const AdminEditArticlePage = () => {
    const params = useParams();
    const router = useRouter();
    const [article, setArticle] = useState<TArticle | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchArticle = async () => {
            try {
                const res = await getArticleById(params.id as string);
                if (res.success && res.data) {
                    setArticle(res.data);
                }
            } catch (err: any) {
                setError(err.message || "Failed to fetch article");
            } finally {
                setLoading(false);
            }
        };
        fetchArticle();
    }, [params.id]);

    const handleSubmit = async (data: any) => {
        setSaving(true);
        setError(null);
        try {
            const res = await updateArticle(params.id as string, data);
            if (res.success) {
                router.push("/admin/articles");
            }
        } catch (err: any) {
            setError(err.message || "Failed to update article");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex items-center gap-4">
                <Link href="/admin/articles">
                    <Button variant="outline" shape="icon">
                        <ArrowLeft className="size-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Edit Article</h1>
                    <p className="text-muted-foreground mt-1">Update your article content and settings.</p>
                </div>
            </div>

            {error && (
                <div className="p-4 rounded-xl bg-destructive/10 text-destructive text-sm font-bold">
                    {error}
                </div>
            )}

            <div className="rounded-3xl border border-border bg-card p-8 shadow-sm">
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
