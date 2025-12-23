"use client";

import { Button } from "@/components/ui/button";
import { getProjects } from "@/services/project.service";
import type { TProject } from "@/types/project.type";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import React, { useEffect, useState } from "react";

const ProjectCard: React.FC<{ project: TProject; index: number }> = ({ project, index }) => {
  return (
    <div 
      className="fade-up group relative overflow-hidden rounded-[2rem] bg-card border border-border/50 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/5 shadow-sm"
      style={{ transitionDelay: `${index * 100}ms` } as React.CSSProperties}
    >
      <div className="aspect-[4/3] w-full overflow-hidden">
        <img
          src={project.thumbnail || "/images/placeholder.png"}
          alt={project.name}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex items-center justify-center">
            <Link 
              href={`/projects/${project._id}`}
              className="size-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center scale-0 group-hover:scale-100 transition-transform duration-500 delay-100 rotate-12 group-hover:rotate-0"
            >
              <ArrowUpRight className="size-8" />
            </Link>
        </div>
      </div>

      <div className="p-8">
        <div className="mb-4 flex flex-wrap gap-2">
          {project.tags?.slice(0, 3).map((tag, i) => (
            <span key={i} className="rounded-full glass border-primary/20 px-4 py-1.5 text-[10px] font-bold tracking-[0.1em] uppercase text-primary">
              {tag}
            </span>
          ))}
        </div>
        <h3 className="mb-3 text-2xl font-black tracking-tighter transition-colors group-hover:text-primary">
          {project.name}
        </h3>
        <p className="text-muted-foreground/80 line-clamp-2 text-base font-medium">
          {project.description}
        </p>
        
        <div className="mt-8 flex items-center justify-between">
          <Link 
            href={`/projects/${project._id}`} 
            className="text-primary flex items-center gap-2 text-sm font-black uppercase tracking-widest hover:underline underline-offset-8"
          >
            Case Study <ArrowRight className="size-4 arrow-slide-right" />
          </Link>
        </div>
      </div>
    </div>
  );
};

const ProjectsSection: React.FC = () => {
  const [projects, setProjects] = useState<TProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await getProjects({ limit: "3" });
        if (response.success && Array.isArray(response.data)) {
          setProjects(response.data);
        }
      } catch (error) {
        console.error("Error fetching projects:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  if (loading) return (
    <section className="py-24">
      <div className="container px-6 mx-auto">
        <div className="mb-12 flex items-end justify-between">
            <div className="h-10 w-48 animate-pulse rounded bg-muted" />
            <div className="h-10 w-24 animate-pulse rounded bg-muted" />
        </div>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => <div key={i} className="aspect-[4/5] animate-pulse rounded-3xl bg-muted" />)}
        </div>
      </div>
    </section>
  );

  return (
    <section id="projects" className="py-24 lg:py-48 overflow-hidden relative">
      <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 size-96 rounded-full bg-primary/5 blur-3xl" />
      
      <div className="container px-6 mx-auto">
        <div className="mb-20 flex flex-col items-center justify-between gap-8 md:flex-row md:items-end">
          <div className="max-w-xl text-center md:text-left">
            <span className="fade-left text-primary mb-4 inline-block text-[11px] font-black uppercase tracking-[0.3em]">
              Curated Works
            </span>
            <h2 className="fade-up text-5xl font-black tracking-tighter md:text-7xl leading-tight delay-100">
              Selected Projects
            </h2>
          </div>
          <div className="scale-in delay-200">
            <Link href="/projects">
              <Button variant="none" className="group rounded-2xl glass px-8 py-6 font-black uppercase tracking-widest text-sm hover:bg-primary hover:text-primary-foreground transition-all">
                The Archive
                <ArrowRight className="ml-3 size-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project, index) => (
            <ProjectCard key={project._id} project={project} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProjectsSection;
