"use client";

import { Button } from "@/components/ui/button";
import type { TArticle } from "@/types/article.type";
import { ArrowLeft, Share2, User } from "lucide-react";
import { useRouter } from "next/navigation";

interface ArticleDetailsContentProps {
  article: TArticle;
}

const ArticleDetailsContent: React.FC<ArticleDetailsContentProps> = ({
  article,
}) => {
  const router = useRouter();

  if (!article)
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <h2 className="text-2xl font-bold">Article not found</h2>
        <Button
          onClick={() => router.back()}
          variant="outline"
          className="mt-8"
        >
          Go Back
        </Button>
      </div>
    );

  const date = article.published_at
    ? new Date(article.published_at).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "Recently Published";

  return (
    <main className="min-h-screen">
      {/* Article Header */}
      <section className="bg-muted/30 border-border border-b py-20 lg:py-32">
        <div className="container mx-auto px-6">
          <Button
            onClick={() => router.back()}
            variant="ghost"
            className="hover:text-primary mb-12 pl-0 transition-colors hover:bg-transparent"
          >
            <ArrowLeft className="mr-2 size-4" /> Back to Articles
          </Button>

          <div className="mx-auto max-w-4xl text-center">
            <div className="text-primary mb-6 flex items-center justify-center gap-4 text-xs font-bold tracking-widest uppercase">
              <span>{article.category?.name || "Tutorial"}</span>
              <span className="bg-border size-1 rounded-full" />
              <span>{date}</span>
            </div>
            <h1 className="text-4xl leading-tight font-bold tracking-tight md:text-6xl lg:text-7xl">
              {article.name}
            </h1>

            <div className="mt-12 flex items-center justify-center gap-4">
              <div className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-full">
                <User className="size-6" />
              </div>
              <div className="text-left">
                <p className="font-bold">
                  {article.author?.name || "Foysal Ahmed"}
                </p>
                <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
                  Software Engineer
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Hero Image */}
      <div className="container mx-auto -mt-16 px-6 md:-mt-24 lg:-mt-32">
        <div className="border-border relative aspect-[21/9] w-full overflow-hidden rounded-3xl border shadow-2xl">
          <img
            src={article.thumbnail || "/images/placeholder-article.png"}
            alt={article.name}
            className="h-full w-full object-cover"
          />
        </div>
      </div>

      {/* Content */}
      <section className="py-24 lg:py-32">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 gap-16 lg:grid-cols-12">
            <div className="lg:col-span-8 lg:col-start-3">
              <div
                className="prose prose-lg dark:prose-invert prose-headings:font-bold prose-headings:tracking-tight prose-a:text-primary prose-pre:bg-muted/50 prose-pre:border prose-pre:border-border max-w-none"
                dangerouslySetInnerHTML={{ __html: article.content }}
              />

              <div className="border-border mt-20 flex flex-wrap gap-3 border-t pt-10">
                <span className="text-muted-foreground mr-4 flex items-center gap-2 text-sm font-bold tracking-widest uppercase">
                  Tags:
                </span>
                {article.tags?.map((tag, i) => (
                  <span
                    key={i}
                    className="bg-muted border-border rounded-full border px-4 py-1.5 text-[10px] font-bold tracking-widest uppercase"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="border-border bg-card mt-16 flex flex-col items-center gap-8 rounded-3xl border p-10 md:flex-row">
                <div className="bg-primary/10 text-primary flex size-24 flex-shrink-0 items-center justify-center rounded-3xl">
                  <User className="size-12" />
                </div>
                <div className="space-y-3 text-center md:text-left">
                  <h4 className="text-xl font-bold">Written by Foysal Ahmed</h4>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    I'm a full-stack engineer passionate about building scalable
                    web applications and sharing my experiences in system
                    engineering and performance optimization.
                  </p>
                  <div className="flex justify-center gap-4 pt-2 md:justify-start">
                    <Button
                      variant="outline"
                      shape="icon"
                      className="h-10 w-10 rounded-full"
                    >
                      <Share2 className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default ArticleDetailsContent;
