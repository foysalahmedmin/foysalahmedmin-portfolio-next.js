"use client";

import { Button } from "@/components/ui/button";
import { getProjects } from "@/services/project.service";
import type { TProject } from "@/types/project.type";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import React, { useEffect, useState } from "react";

const ProjectCard: React.FC<{ project: TProject; index: number }> = ({
  project,
  index,
}) => {
  return (
    <div
      className="fade-up group bg-card border-border/50 hover:shadow-primary/5 relative overflow-hidden rounded-[2rem] border shadow-sm transition-all duration-500 hover:shadow-2xl"
      style={{ transitionDelay: `${index * 100}ms` } as React.CSSProperties}
    >
      <div className="aspect-[4/3] w-full overflow-hidden">
        <img
          src={project.thumbnail || "/images/placeholder.png"}
          alt={project.name}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="from-background/90 via-background/20 absolute inset-0 flex items-center justify-center bg-gradient-to-t to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <Link
            href={`/projects/${project._id}`}
            className="bg-primary text-primary-foreground flex size-16 scale-0 rotate-12 items-center justify-center rounded-full transition-transform delay-100 duration-500 group-hover:scale-100 group-hover:rotate-0"
          >
            <ArrowUpRight className="size-8" />
          </Link>
        </div>
      </div>

      <div className="p-8">
        <div className="mb-4 flex flex-wrap gap-2">
          {project.tags?.slice(0, 3).map((tag, i) => (
            <span
              key={i}
              className="glass border-primary/20 text-primary rounded-full px-4 py-1.5 text-[10px] font-bold tracking-[0.1em] uppercase"
            >
              {tag}
            </span>
          ))}
        </div>
        <h3 className="group-hover:text-primary mb-3 text-2xl font-black tracking-tighter transition-colors">
          {project.name}
        </h3>
        <p className="text-muted-foreground/80 line-clamp-2 text-base font-medium">
          {project.description}
        </p>

        <div className="mt-8 flex items-center justify-between">
          <Link
            href={`/projects/${project._id}`}
            className="text-primary flex items-center gap-2 text-sm font-black tracking-widest uppercase underline-offset-8 hover:underline"
          >
            Case Study <ArrowRight className="arrow-slide-right size-4" />
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

  if (loading)
    return (
      <section className="py-24">
        <div className="container mx-auto px-6">
          <div className="mb-12 flex items-end justify-between">
            <div className="bg-muted h-10 w-48 animate-pulse rounded" />
            <div className="bg-muted h-10 w-24 animate-pulse rounded" />
          </div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-muted aspect-[4/5] animate-pulse rounded-3xl"
              />
            ))}
          </div>
        </div>
      </section>
    );

  return (
    <section id="projects" className="relative overflow-hidden py-24 lg:py-48">
      <div className="bg-primary/5 absolute top-0 right-0 size-96 translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl" />

      <div className="container mx-auto px-6">
        <div className="mb-20 flex flex-col items-center justify-between gap-8 md:flex-row md:items-end">
          <div className="max-w-xl text-center md:text-left">
            <span className="fade-left text-primary mb-4 inline-block text-[11px] font-black tracking-[0.3em] uppercase">
              Curated Works
            </span>
            <h2 className="fade-up text-3xl leading-tight font-black tracking-tighter delay-100 md:text-5xl">
              Selected Projects
            </h2>
          </div>
          <div className="scale-in delay-200">
            <Link href="/projects">
              <Button
                variant="none"
                className="group glass hover:bg-primary hover:text-primary-foreground rounded-2xl px-8 py-6 text-sm font-black tracking-widest uppercase transition-all"
              >
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
