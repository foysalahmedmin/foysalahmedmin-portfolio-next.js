"use client";

import { Button } from "@/components/ui/button";
import { getArticles } from "@/services/article.service";
import { TArticle } from "@/types/article.type";
import { motion } from "framer-motion";
import { ArrowRight, Calendar, User } from "lucide-react";
import Link from "next/link";
import React, { useEffect, useState } from "react";

const ArticleCard: React.FC<{ article: TArticle; index: number }> = ({ article, index }) => {
  const date = article.published_at 
    ? new Date(article.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Recently';

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      className="group flex flex-col overflow-hidden rounded-[2rem] bg-card border border-border/50 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/5"
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <img
          src={article.thumbnail || "/images/placeholder-article.png"}
          alt={article.name}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-60" />
        <div className="absolute top-6 left-6">
          <span className="rounded-full glass border-primary/20 px-4 py-1.5 text-[10px] font-black tracking-widest uppercase text-primary">
            Insights
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-8 lg:p-10">
        <div className="mb-6 flex items-center gap-6 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
          <div className="flex items-center gap-2">
            <Calendar className="size-3.5" />
            <span>{date}</span>
          </div>
          <div className="flex items-center gap-2">
            <User className="size-3.5" />
            <span>Foysal Ahmed</span>
          </div>
        </div>

        <h3 className="mb-5 text-2xl font-black leading-[1.2] tracking-tighter transition-colors group-hover:text-primary lg:text-3xl">
          <Link href={`/articles/${article._id}`}>
            {article.name}
          </Link>
        </h3>
        
        <p className="text-muted-foreground/80 mb-8 line-clamp-3 text-base font-medium leading-relaxed">
          {article.description}
        </p>

        <div className="mt-auto">
          <Link 
            href={`/articles/${article._id}`} 
            className="inline-flex items-center gap-3 text-sm font-black tracking-widest text-primary uppercase group/btn"
          >
            Deep Dive <ArrowRight className="size-4 transition-transform group-hover/btn:translate-x-2" />
          </Link>
        </div>
      </div>
    </motion.div>
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
      <div className="absolute bottom-0 left-0 -translate-x-1/2 translate-y-1/2 size-96 rounded-full bg-primary/5 blur-3xl opacity-50" />
      
      <div className="container px-6 mx-auto">
        <div className="mb-20 flex flex-col items-center justify-between gap-8 md:flex-row md:items-end">
          <div className="max-w-xl text-center md:text-left">
            <motion.span 
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="text-primary mb-4 inline-block text-[11px] font-black uppercase tracking-[0.3em]"
            >
              Latest Insights
            </motion.span>
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-5xl font-black tracking-tighter md:text-7xl leading-tight"
            >
              The Blog
            </motion.h2>
          </div>
          <Link href="/articles">
            <Button variant="none" className="group rounded-2xl glass px-8 py-6 font-black uppercase tracking-widest text-sm hover:bg-primary hover:text-primary-foreground transition-all">
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
