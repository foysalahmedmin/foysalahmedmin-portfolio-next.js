"use client";

import { Button } from "@/components/ui/button";
import { TProject } from "@/types/project.type";
import { ArrowLeft, ExternalLink, Github, Tag } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface ProjectDetailsContentProps {
    project: TProject;
}

const ProjectDetailsContent: React.FC<ProjectDetailsContentProps> = ({ project }) => {
  const router = useRouter();

  if (!project) return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
          <h2 className="text-2xl font-bold">Project not found</h2>
          <Button onClick={() => router.back()} variant="outline" className="mt-8">Go Back</Button>
      </div>
  );

  return (
    <main className="min-h-screen pt-16">
      {/* Hero Section */}
      <section className="bg-muted/30 border-b border-border py-20 lg:py-32">
        <div className="container px-6 mx-auto">
          <Button 
            onClick={() => router.back()} 
            variant="ghost" 
            className="mb-12 hover:bg-transparent hover:text-primary transition-colors pl-0"
          >
            <ArrowLeft className="mr-2 size-4" /> Back to Projects
          </Button>
          
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
            <div>
              <div className="mb-6 flex flex-wrap gap-3">
                {project.tags?.map((tag, i) => (
                    <span key={i} className="flex items-center gap-1.5 rounded-full bg-primary/10 px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-primary">
                        <Tag className="size-3" /> {tag}
                    </span>
                ))}
              </div>
              <h1 className="text-4xl font-bold tracking-tight md:text-6xl lg:text-7xl">{project.name}</h1>
              <p className="text-muted-foreground mt-8 text-lg leading-relaxed md:text-xl">
                {project.description}
              </p>
              
              <div className="mt-12 flex flex-wrap gap-8 text-sm">
                  <div>
                      <p className="font-bold text-foreground">Date</p>
                      <p className="text-muted-foreground mt-1">
                          {project.started_at ? new Date(project.started_at).toLocaleDateString() : 'Recently'}
                      </p>
                  </div>
                  <div>
                      <p className="font-bold text-foreground">Status</p>
                      <p className="text-primary mt-1 font-bold uppercase tracking-widest">{project.status}</p>
                  </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-24 lg:py-32">
        <div className="container px-6 mx-auto">
          <div className="grid grid-cols-1 gap-16 lg:grid-cols-12">
            {/* Project Banner & Content */}
            <div className="lg:col-span-8 space-y-16">
                <div className="relative aspect-video w-full overflow-hidden rounded-3xl shadow-2xl">
                    <img 
                        src={project.thumbnail || "/images/placeholder.png"} 
                        alt={project.name} 
                        className="h-full w-full object-cover" 
                    />
                </div>

                <div 
                    className="prose prose-lg dark:prose-invert max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-a:text-primary"
                    dangerouslySetInnerHTML={{ __html: project.content }}
                />

                {/* Gallery */}
                {project.images && project.images.length > 0 && (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        {project.images.map((img, i) => (
                            <div key={i} className="aspect-video overflow-hidden rounded-2xl border border-border">
                                <img src={img} alt={`${project.name} screenshot ${i+1}`} className="h-full w-full object-cover hover:scale-105 transition-transform duration-500" />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Sidebar Tools/Resources */}
            <aside className="lg:col-span-4 space-y-12 h-fit lg:sticky lg:top-32">
                <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
                    <h3 className="mb-6 text-xl font-bold">Project Info</h3>
                    <div className="space-y-6 text-sm">
                        <div className="flex items-center justify-between border-b border-border pb-4">
                            <span className="text-muted-foreground">Category</span>
                            <span className="font-bold text-foreground">{project.category?.name || "Web Development"}</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-border pb-4">
                            <span className="text-muted-foreground">Author</span>
                            <span className="font-bold text-foreground">{project.author?.name || "Foysal Ahmed"}</span>
                        </div>
                    </div>
                    
                    <div className="mt-10 space-y-4">
                        <Button className="w-full uppercase font-bold tracking-widest" size="lg">
                            Live Demo <ExternalLink className="ml-2 size-4" />
                        </Button>
                        <Button variant="outline" className="w-full uppercase font-bold tracking-widest" size="lg">
                            Source Code <Github className="ml-2 size-4" />
                        </Button>
                    </div>
                </div>

                <div className="rounded-2xl border border-border bg-muted/30 p-8 text-center lg:text-left">
                     <h4 className="mb-4 font-bold">Interested in this?</h4>
                     <p className="text-muted-foreground text-sm leading-relaxed">Let's collaborate on your next project and build something amazing together.</p>
                     <Link href="/contact" className="mt-6 inline-block text-sm font-bold text-primary uppercase tracking-widest hover:underline underline-offset-4">Get in touch →</Link>
                </div>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
};

export default ProjectDetailsContent;
