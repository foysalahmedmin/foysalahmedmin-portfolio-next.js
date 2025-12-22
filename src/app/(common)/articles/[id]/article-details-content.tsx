"use client";

import { Button } from "@/components/ui/button";
import { TArticle } from "@/types/article.type";
import { ArrowLeft, Share2, User } from "lucide-react";
import { useRouter } from "next/navigation";

interface ArticleDetailsContentProps {
    article: TArticle;
}

const ArticleDetailsContent: React.FC<ArticleDetailsContentProps> = ({ article }) => {
  const router = useRouter();

  if (!article) return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
          <h2 className="text-2xl font-bold">Article not found</h2>
          <Button onClick={() => router.back()} variant="outline" className="mt-8">Go Back</Button>
      </div>
  );

  const date = article.published_at 
    ? new Date(article.published_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : 'Recently Published';

  return (
    <main className="min-h-screen pt-16">
      {/* Article Header */}
      <section className="bg-muted/30 border-b border-border py-20 lg:py-32">
        <div className="container px-6 mx-auto">
          <Button 
            onClick={() => router.back()} 
            variant="ghost" 
            className="mb-12 hover:bg-transparent hover:text-primary transition-colors pl-0"
          >
            <ArrowLeft className="mr-2 size-4" /> Back to Articles
          </Button>

          <div className="max-w-4xl mx-auto text-center">
            <div className="mb-6 flex items-center justify-center gap-4 text-xs font-bold uppercase tracking-widest text-primary">
                <span>{article.category?.name || "Tutorial"}</span>
                <span className="size-1 rounded-full bg-border" />
                <span>{date}</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight md:text-6xl lg:text-7xl leading-tight">
                {article.name}
            </h1>
            
            <div className="mt-12 flex items-center justify-center gap-4">
                <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <User className="size-6" />
                </div>
                <div className="text-left">
                    <p className="font-bold">{article.author?.name || "Foysal Ahmed"}</p>
                    <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Software Engineer</p>
                </div>
            </div>
          </div>
        </div>
      </section>

      {/* Hero Image */}
      <div className="container px-6 mx-auto -mt-16 md:-mt-24 lg:-mt-32">
        <div className="relative aspect-[21/9] w-full overflow-hidden rounded-3xl shadow-2xl border border-border">
          <img 
            src={article.thumbnail || "/images/placeholder-article.png"} 
            alt={article.name} 
            className="h-full w-full object-cover" 
          />
        </div>
      </div>

      {/* Content */}
      <section className="py-24 lg:py-32">
        <div className="container px-6 mx-auto">
          <div className="grid grid-cols-1 gap-16 lg:grid-cols-12">
            <div className="lg:col-span-8 lg:col-start-3">
                <div 
                    className="prose prose-lg dark:prose-invert max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-a:text-primary prose-pre:bg-muted/50 prose-pre:border prose-pre:border-border"
                    dangerouslySetInnerHTML={{ __html: article.content }}
                />

                <div className="mt-20 flex flex-wrap gap-3 border-t border-border pt-10">
                    <span className="mr-4 flex items-center gap-2 text-sm font-bold text-muted-foreground uppercase tracking-widest">
                        Tags:
                    </span>
                    {article.tags?.map((tag, i) => (
                        <span key={i} className="rounded-full bg-muted border border-border px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest">
                            {tag}
                        </span>
                    ))}
                </div>

                <div className="mt-16 rounded-3xl border border-border bg-card p-10 flex flex-col md:flex-row items-center gap-8">
                     <div className="size-24 rounded-3xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                         <User className="size-12" />
                     </div>
                     <div className="text-center md:text-left space-y-3">
                         <h4 className="text-xl font-bold">Written by Foysal Ahmed</h4>
                         <p className="text-muted-foreground leading-relaxed text-sm">
                             I'm a full-stack engineer passionate about building scalable web applications and sharing my experiences in system engineering and performance optimization.
                         </p>
                         <div className="flex justify-center md:justify-start gap-4 pt-2">
                             <Button variant="outline" shape="icon" className="rounded-full h-10 w-10">
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
