"use client";

import { Button } from "@/components/ui/button";
import Magnetic from "@/components/ui/magnetic";
import { TProject } from "@/types/project.type";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, ExternalLink, Eye, Github, Layout, Tag, User } from "lucide-react";
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
    <main className="min-h-screen bg-background">
      {/* Hero Header */}
      <section className="relative overflow-hidden pt-32 pb-20 lg:pt-48 lg:pb-32">
        <div className="absolute inset-0 z-0">
            <div className="absolute top-0 left-1/2 h-[600px] w-full -translate-x-1/2 bg-primary/5 blur-[120px] mask-radial" />
        </div>
        
        <div className="container relative z-10 px-6 mx-auto">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Button 
                onClick={() => router.back()} 
                variant="ghost" 
                className="group mb-12 text-muted-foreground hover:text-primary pl-0"
            >
                <ArrowLeft className="mr-2 size-4 transition-transform group-hover:-translate-x-1" /> Back to Projects
            </Button>
          </motion.div>
          
          <div className="max-w-4xl">
            <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.1 }}
               className="mb-8 flex flex-wrap gap-3"
            >
                {project.tags?.map((tag, i) => (
                    <span key={i} className="flex items-center gap-1.5 rounded-full glass border-primary/20 px-5 py-2 text-[10px] font-bold uppercase tracking-widest text-primary">
                        <Tag className="size-3" /> {tag}
                    </span>
                ))}
            </motion.div>

            <motion.h1 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="text-5xl font-black tracking-tighter md:text-7xl lg:text-9xl leading-[0.9] text-foreground"
            >
                {project.name}
            </motion.h1>

            <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-muted-foreground mt-12 text-xl leading-relaxed md:text-2xl max-w-2xl font-medium"
            >
            {project.description}
            </motion.p>
          </div>
        </div>
      </section>

      {/* Main Content Grid */}
      <section className="pb-32">
        <div className="container px-6 mx-auto">
          <div className="grid grid-cols-1 gap-16 lg:grid-cols-12">
            
            {/* Left Column: Visuals & Content */}
            <div className="lg:col-span-8 space-y-20">
                <motion.div 
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="relative aspect-video w-full overflow-hidden rounded-[2.5rem] bg-card shadow-2xl border border-border/50"
                >
                    <img 
                        src={project.thumbnail || "/images/placeholder.png"} 
                        alt={project.name} 
                        className="h-full w-full object-cover" 
                    />
                    <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-[2.5rem]" />
                </motion.div>

                <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="prose prose-xl dark:prose-invert max-w-none 
                        prose-headings:text-foreground prose-headings:font-black prose-headings:tracking-tighter
                        prose-p:text-muted-foreground/80 prose-p:leading-relaxed
                        prose-a:text-primary prose-a:font-bold prose-a:no-underline hover:prose-a:underline
                        prose-strong:text-foreground prose-strong:font-bold"
                    dangerouslySetInnerHTML={{ __html: project.content }}
                />

                {/* Gallery */}
                {project.images && project.images.length > 0 && (
                    <div className="space-y-10 pt-10">
                        <h3 className="text-3xl font-black tracking-tighter">Project Highlights</h3>
                        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                            {project.images.map((img, i) => (
                                <motion.div 
                                    key={i}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1 }}
                                    className="group relative aspect-[4/3] overflow-hidden rounded-3xl border border-border/50 shadow-lg cursor-zoom-in"
                                >
                                    <img 
                                        src={img} 
                                        alt={`${project.name} screenshot ${i+1}`} 
                                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" 
                                    />
                                    <div className="absolute inset-0 bg-primary/20 opacity-0 transition-opacity group-hover:opacity-100 flex items-center justify-center">
                                       <Eye className="text-white size-10" />
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Right Column: Sticky Sidebar */}
            <aside className="lg:col-span-4 h-fit lg:sticky lg:top-32 space-y-8">
                <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    className="rounded-[2.5rem] glass-card p-10 space-y-10"
                >
                    <div className="space-y-6">
                        <h3 className="text-2xl font-black tracking-tighter">Project Logistics</h3>
                        
                        <div className="space-y-5">
                            <div className="flex items-center gap-4">
                                <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                    <Layout className="size-5" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Category</p>
                                    <p className="font-bold">{project.category?.name || "Web Development"}</p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-4">
                                <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                    <Calendar className="size-5" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Release Date</p>
                                    <p className="font-bold">
                                        {project.started_at ? new Date(project.started_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Recently'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                    <User className="size-5" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Project Lead</p>
                                    <p className="font-bold">{project.author?.name || "Foysal Ahmed"}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        <Magnetic strength={0.1}>
                           <Button className="w-full h-16 rounded-2xl text-base font-black uppercase tracking-widest shadow-xl shadow-primary/20">
                                Live Preview <ExternalLink className="ml-2 size-5" />
                           </Button>
                        </Magnetic>
                        <Magnetic strength={0.1}>
                           <Button variant="outline" className="w-full h-16 rounded-2xl text-base font-black uppercase tracking-widest border-2">
                                Source Code <Github className="ml-2 size-5" />
                           </Button>
                        </Magnetic>
                    </div>
                </motion.div>

                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 }}
                    className="rounded-[2.5rem] bg-primary p-10 text-primary-foreground overflow-hidden relative group"
                >
                     <div className="relative z-10">
                        <h4 className="text-2xl font-black tracking-tighter leading-tight">Ready to build something phenomenal?</h4>
                        <p className="mt-4 text-primary-foreground/80 font-medium">I'm currently accepting new projects and collaborations.</p>
                        <Link href="/contact" className="mt-8 inline-flex items-center gap-2 font-black uppercase tracking-[0.2em] text-sm group/link">
                            Start Conversation 
                            <ArrowLeft className="size-4 rotate-180 transition-transform group-hover/link:translate-x-2" />
                        </Link>
                     </div>
                     <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 size-40 rounded-full bg-white/10 blur-3xl group-hover:scale-150 transition-transform duration-1000" />
                </motion.div>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
};

export default ProjectDetailsContent;
