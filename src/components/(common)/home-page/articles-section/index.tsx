"use client";

import { Button } from "@/components/ui/button";
import { getArticles } from "@/services/article.service";
import { TArticle } from "@/types/article.type";
import { ArrowRight, Calendar, User } from "lucide-react";
import Link from "next/link";
import React, { useEffect, useState } from "react";

const ArticleCard: React.FC<{ article: TArticle }> = ({ article }) => {
  const date = article.published_at 
    ? new Date(article.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Recently';

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl bg-card border border-border transition-all duration-300 hover:border-primary/50">
      <div className="relative aspect-[16/10] overflow-hidden">
        <img
          src={article.thumbnail || "/images/placeholder-article.png"}
          alt={article.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute top-4 left-4">
          <span className="rounded-full bg-primary px-4 py-1.5 text-[10px] font-bold tracking-wider uppercase text-primary-foreground shadow-lg">
            Article
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-6 lg:p-8">
        <div className="mb-4 flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Calendar className="size-3.5" />
            <span>{date}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <User className="size-3.5" />
            <span>Admin</span>
          </div>
        </div>

        <h3 className="mb-4 text-xl font-bold leading-tight transition-colors group-hover:text-primary lg:text-2xl">
          <Link href={`/articles/${article._id}`}>
            {article.name}
          </Link>
        </h3>
        
        <p className="text-muted-foreground mb-6 line-clamp-3 text-sm leading-relaxed">
          {article.description}
        </p>

        <div className="mt-auto">
          <Link 
            href={`/articles/${article._id}`} 
            className="inline-flex items-center gap-2 text-sm font-bold tracking-tight text-primary uppercase transition-gap duration-300 hover:gap-3"
          >
            Read Article <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </div>
  );
};

const ArticlesSection: React.FC = () => {
  const [articles, setArticles] = useState<TArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const response = await getArticles({ limit: "3", status: "published" });
        if (response.success && Array.isArray(response.data)) {
          setArticles(response.data);
        }
      } catch (error) {
        console.error("Error fetching articles:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchArticles();
  }, []);

  if (loading) return null;

  return (
    <section id="articles" className="bg-muted/30 py-24 lg:py-32">
      <div className="container px-6 mx-auto">
        <div className="mb-16 flex flex-col items-center justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-xl text-center md:text-left">
            <span className="text-primary mb-3 inline-block text-sm font-bold uppercase tracking-widest">
              Knowledge Base
            </span>
            <h2 className="text-3xl font-bold tracking-tight md:text-5xl">
              Latest Articles
            </h2>
          </div>
          <Link href="/articles">
            <Button variant="outline" className="group">
              View All Posts 
              <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <ArticleCard key={article._id} article={article} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default ArticlesSection;
