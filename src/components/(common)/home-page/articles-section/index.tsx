"use client";

import { Button } from "@/components/ui/button";
import { getArticles } from "@/services/article.service";
import type { TArticle } from "@/types/article.type";
import { ArrowRight, Calendar, User } from "lucide-react";
import Link from "next/link";
import React, { useEffect, useState } from "react";

const ArticleCard: React.FC<{ article: TArticle; index: number }> = ({
  article,
  index,
}) => {
  const date = article.published_at
    ? new Date(article.published_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Recently";

  return (
    <div
      className="fade-up group bg-card border-border/50 hover:shadow-primary/5 flex flex-col overflow-hidden rounded-[2rem] border transition-all duration-500 hover:shadow-2xl"
      style={{ transitionDelay: `${index * 100}ms` } as React.CSSProperties}
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <img
          src={article.thumbnail || "/images/placeholder-article.png"}
          alt={article.name}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="from-background/80 absolute inset-0 bg-gradient-to-t via-transparent to-transparent opacity-60" />
        <div className="absolute top-6 left-6">
          <span className="glass border-primary/20 text-primary rounded-full px-4 py-1.5 text-[10px] font-black tracking-widest uppercase">
            Insights
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-8 lg:p-10">
        <div className="text-muted-foreground/60 mb-6 flex items-center gap-6 text-[10px] font-bold tracking-widest uppercase">
          <div className="flex items-center gap-2">
            <Calendar className="size-3.5" />
            <span>{date}</span>
          </div>
          <div className="flex items-center gap-2">
            <User className="size-3.5" />
            <span>Foysal Ahmed</span>
          </div>
        </div>

        <h3 className="group-hover:text-primary mb-5 text-2xl leading-[1.2] font-black tracking-tighter transition-colors lg:text-3xl">
          <Link href={`/articles/${article._id}`}>{article.name}</Link>
        </h3>

        <p className="text-muted-foreground/80 mb-8 line-clamp-3 text-base leading-relaxed font-medium">
          {article.description}
        </p>

        <div className="mt-auto">
          <Link
            href={`/articles/${article._id}`}
            className="text-primary group/btn inline-flex items-center gap-3 text-sm font-black tracking-widest uppercase"
          >
            Deep Dive{" "}
            <ArrowRight className="size-4 transition-transform group-hover/btn:translate-x-2" />
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
    <section id="articles" className="relative overflow-hidden py-24 lg:py-48">
      <div className="bg-primary/5 absolute bottom-0 left-0 size-96 -translate-x-1/2 translate-y-1/2 rounded-full opacity-50 blur-3xl" />

      <div className="container mx-auto px-6">
        <div className="mb-20 flex flex-col items-center justify-between gap-8 md:flex-row md:items-end">
          <div className="max-w-xl text-center md:text-left">
            <span className="fade-left text-primary mb-4 inline-block text-[11px] font-black tracking-[0.3em] uppercase">
              Latest Insights
            </span>
            <h2 className="fade-up text-3xl leading-tight font-black tracking-tighter delay-100 md:text-5xl">
              The Article
            </h2>
          </div>
          <Link href="/articles">
            <Button
              variant="none"
              className="group glass hover:bg-primary hover:text-primary-foreground border-primary/20 rounded-2xl border px-8 py-6 text-sm font-black tracking-widest uppercase transition-all"
            >
              Reading List
              <ArrowRight className="ml-3 size-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-3">
          {articles.map((article, index) => (
            <ArticleCard key={article._id} article={article} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default ArticlesSection;
