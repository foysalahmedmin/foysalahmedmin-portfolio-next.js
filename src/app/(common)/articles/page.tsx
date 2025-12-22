"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getArticles } from "@/services/article.service";
import { getArticleCategories } from "@/services/category.service";
import { TArticle } from "@/types/article.type";
import { ArrowLeft, ArrowRight, Calendar, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const ArticlesPage = () => {
  const [articles, setArticles] = useState<TArticle[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const catRes = await getArticleCategories();
        if (catRes.success) setCategories(catRes.data);
      } catch (e) {
        console.error("Error fetching categories:", e);
      }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    const fetchArticlesList = async () => {
      setLoading(true);
      try {
        const params: Record<string, string> = {
          page: page.toString(),
          limit: "9",
          status: "published"
        };
        if (activeCategory !== "all") params.category = activeCategory;
        if (searchQuery) params.search = searchQuery;

        const res = await getArticles(params);
        if (res.success && Array.isArray(res.data)) {
          setArticles(res.data);
          if (res.meta) {
            setTotalPages(Math.ceil(res.meta.total / res.meta.limit));
          }
        }
      } catch (e) {
        console.error("Error fetching articles:", e);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(() => {
        fetchArticlesList();
    }, 300);

    return () => clearTimeout(timer);
  }, [page, activeCategory, searchQuery]);

  return (
    <main className="min-h-screen pt-16">
      <section className="bg-muted/30 border-b border-border py-20">
        <div className="container px-6 mx-auto">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">My <span className="text-primary">Articles</span></h1>
              <p className="text-muted-foreground mt-4 max-w-xl text-lg">
                Thoughts, tutorials, and insights about web development and technology.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="sticky top-16 z-30 bg-background/80 py-6 backdrop-blur-md border-b border-border">
        <div className="container px-6 mx-auto">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => { setActiveCategory("all"); setPage(1); }}
                className={cn(
                  "rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-all",
                  activeCategory === "all" ? "bg-primary text-primary-foreground shadow-lg" : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat._id}
                  onClick={() => { setActiveCategory(cat._id); setPage(1); }}
                  className={cn(
                    "rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-all",
                    activeCategory === cat._id ? "bg-primary text-primary-foreground shadow-lg" : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            <div className="relative max-w-md w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                className="w-full rounded-full border border-border bg-card py-2 pl-10 pr-4 text-sm focus:border-primary focus:outline-none transition-all"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-32">
        <div className="container px-6 mx-auto">
          {loading ? (
             <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="aspect-[16/10] animate-pulse rounded-2xl bg-muted" />
                ))}
             </div>
          ) : articles.length > 0 ? (
            <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-3">
              {articles.map((article) => {
                const date = article.published_at 
                    ? new Date(article.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : 'Recently';

                return (
                  <article key={(article as any)._id} className="group flex flex-col">
                    <Link href={`/articles/${(article as any)._id}`} className="block relative aspect-[16/10] overflow-hidden rounded-2xl border border-border transition-all group-hover:border-primary/50 group-hover:shadow-xl">
                        <img src={article.thumbnail || "/images/placeholder-article.png"} alt={article.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    </Link>
                    <div className="pt-8">
                        <div className="mb-4 flex items-center gap-4 text-xs font-bold text-primary uppercase tracking-widest">
                            <span className="flex items-center gap-1.5"><Calendar className="size-3.5" /> {date}</span>
                        </div>
                        <h3 className="text-xl font-bold leading-tight group-hover:text-primary transition-colors lg:text-2xl">
                            <Link href={`/articles/${(article as any)._id}`}>
                                {article.name}
                            </Link>
                        </h3>
                        <p className="text-muted-foreground mt-4 line-clamp-3 text-sm leading-relaxed">{article.description}</p>
                        <div className="mt-8">
                            <Link href={`/articles/${(article as any)._id}`} className="inline-flex items-center gap-2 text-sm font-bold text-primary tracking-widest uppercase transition-all hover:gap-3">
                                Read More <ArrowRight className="size-4" />
                            </Link>
                        </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-32 text-center">
              <div className="mb-6 rounded-full bg-muted p-6 text-4xl">📚</div>
              <h3 className="text-2xl font-bold">No articles found</h3>
              <p className="text-muted-foreground mt-2">Try adjusting your filters or search terms.</p>
              <Button onClick={() => { setActiveCategory("all"); setSearchQuery(""); }} variant="outline" className="mt-8">Clear filters</Button>
            </div>
          )}

          {!loading && totalPages > 1 && (
            <div className="mt-20 flex items-center justify-center gap-4">
              <Button 
                variant="outline" 
                shape="icon" 
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                <ArrowLeft className="size-4" />
              </Button>
              <div className="flex items-center gap-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={cn(
                            "size-10 rounded-lg text-sm font-bold transition-all",
                            page === p ? "bg-primary text-primary-foreground shadow-lg" : "hover:bg-muted"
                        )}
                    >
                        {p}
                    </button>
                ))}
              </div>
              <Button 
                variant="outline" 
                shape="icon" 
                disabled={page === totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              >
                <ArrowRight className="size-4" />
              </Button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
};

export default ArticlesPage;
