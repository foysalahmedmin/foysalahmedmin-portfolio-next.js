"use client";

import { Button } from "@/components/ui/button";
import Magnetic from "@/components/ui/magnetic";
import type { TProject } from "@/types/project.type";
import {
    ArrowLeft,
    Calendar,
    ExternalLink,
    Eye,
    Github,
    Layout,
    Tag,
    User,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface ProjectDetailsSectionProps {
  project: TProject;
}

const ProjectDetailsSection: React.FC<ProjectDetailsSectionProps> = ({
  project,
}) => {
  const router = useRouter();

  if (!project)
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <h2 className="text-2xl font-bold">Project not found</h2>
        <Button
          onClick={() => router.back()}
          variant="outline"
          className="mt-8"
        >
          Go Back
        </Button>
      </div>
    );

  return (
    <main className="min-h-screen bg-background">
      {/* Hero Header */}
      <section className="relative overflow-hidden pt-32 pb-20 lg:pt-48 lg:pb-32">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 left-1/2 h-[600px] w-full -translate-x-1/2 bg-primary/5 blur-[120px] mask-radial" />
        </div>

        <div className="container relative z-10 mx-auto px-6">
          <div className="fade-left active">
            <Button
              onClick={() => router.back()}
              variant="ghost"
              className="text-muted-foreground hover:text-primary group mb-12 pl-0"
            >
              <ArrowLeft className="mr-2 size-4 transition-transform group-hover:-translate-x-1" />{" "}
              Back to Projects
            </Button>
          </div>

          <div className="max-w-4xl">
            <div className="fade-up delay-100 mb-8 flex flex-wrap gap-3 active">
              {project.tags?.map((tag, i) => (
                <span
                  key={i}
                  className="glass border-primary/20 text-primary flex items-center gap-1.5 rounded-full border px-5 py-2 text-[10px] font-bold uppercase tracking-widest"
                >
                  <Tag className="size-3" /> {tag}
                </span>
              ))}
            </div>

            <h1 className="text-foreground leading-[0.9] skew-up delay-200 active text-5xl font-black tracking-tighter md:text-7xl lg:text-9xl">
              {project.name}
            </h1>

            <p className="fade-up delay-300 text-muted-foreground mt-12 max-w-2xl text-xl font-medium leading-relaxed active md:text-2xl">
              {project.description}
            </p>
          </div>
        </div>
      </section>

      {/* Main Content Grid */}
      <section className="pb-32">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 gap-16 lg:grid-cols-12">
            {/* Left Column: Visuals & Content */}
            <div className="lg:col-span-8 space-y-20">
              <div className="relative aspect-video w-full overflow-hidden rounded-[2.5rem] bg-card shadow-2xl border border-border/50 fade-up">
                <img
                  src={project.thumbnail?.url || "/images/placeholder.png"}
                  alt={project.name}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-[2.5rem]" />
              </div>

              <div
                className="prose prose-xl dark:prose-invert max-w-none 
                        prose-headings:text-foreground prose-headings:font-black prose-headings:tracking-tighter
                        prose-p:text-muted-foreground/80 prose-p:leading-relaxed
                        prose-a:text-primary prose-a:font-bold prose-a:no-underline hover:prose-a:underline
                        prose-strong:text-foreground prose-strong:font-bold fade-up"
                dangerouslySetInnerHTML={{ __html: project.content }}
              />

              {/* Gallery */}
              {project.images && project.images.length > 0 && (
                <div className="space-y-10 pt-10">
                  <h3 className="text-3xl font-black tracking-tighter fade-up">
                    Project Highlights
                  </h3>
                  <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                    {project.images.map((img, i) => (
                      <div
                        key={i}
                        className="scale-in group relative aspect-[4/3] cursor-zoom-in overflow-hidden rounded-3xl border border-border/50 shadow-lg"
                        style={
                          {
                            transitionDelay: `${i * 100}ms`,
                          } as React.CSSProperties
                        }
                      >
                        <img
                          src={img.url}
                          alt={`${project.name} screenshot ${i + 1}`}
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                        <div className="bg-primary/20 absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                          <Eye className="text-white size-10" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Sticky Sidebar */}
            <aside className="h-fit lg:sticky lg:top-32 lg:col-span-4 space-y-8">
              <div className="rounded-[2.5rem] glass-card fade-left p-10 space-y-10">
                <div className="space-y-6">
                  <h3 className="text-2xl font-black tracking-tighter">
                    Project Logistics
                  </h3>

                  <div className="space-y-5">
                    <div className="flex items-center gap-4">
                      <div className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-2xl">
                        <Layout className="size-5" />
                      </div>
                      <div>
                        <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">
                          Category
                        </p>
                        <p className="font-bold">
                          {project.category?.name || "Web Development"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-2xl">
                        <Calendar className="size-5" />
                      </div>
                      <div>
                        <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">
                          Release Date
                        </p>
                        <p className="font-bold">
                          {project.started_at
                            ? new Date(project.started_at).toLocaleDateString(
                                "en-US",
                                { month: "long", year: "numeric" }
                              )
                            : "Recently"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-2xl">
                        <User className="size-5" />
                      </div>
                      <div>
                        <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">
                          Project Lead
                        </p>
                        <p className="font-bold">
                          {project.author?.name || "Foysal Ahmed"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <Magnetic strength={0.1}>
                    <Button className="h-16 w-full rounded-2xl text-base font-black uppercase tracking-widest shadow-xl shadow-primary/20">
                      Live Preview <ExternalLink className="ml-2 size-5" />
                    </Button>
                  </Magnetic>
                  <Magnetic strength={0.1}>
                    <Button
                      variant="outline"
                      className="h-16 w-full rounded-2xl border-2 text-base font-black uppercase tracking-widest"
                    >
                      Source Code <Github className="ml-2 size-5" />
                    </Button>
                  </Magnetic>
                </div>
              </div>

              <div className="bg-primary rounded-[2.5rem] fade-up relative group overflow-hidden p-10 text-primary-foreground">
                <div className="relative z-10">
                  <h4 className="text-2xl leading-tight font-black tracking-tighter">
                    Ready to build something phenomenal?
                  </h4>
                  <p className="text-primary-foreground/80 mt-4 font-medium">
                    I'm currently accepting new projects and collaborations.
                  </p>
                  <Link
                    href="/contact"
                    className="group/link mt-8 inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.2em]"
                  >
                    Start Conversation
                    <ArrowLeft className="rotate-180 size-4 transition-transform group-hover/link:translate-x-2" />
                  </Link>
                </div>
                <div className="bg-white/10 absolute top-0 right-0 size-40 -translate-y-1/2 translate-x-1/2 rounded-full transition-transform duration-1000 blur-3xl group-hover:scale-150" />
              </div>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
};

export default ProjectDetailsSection;
