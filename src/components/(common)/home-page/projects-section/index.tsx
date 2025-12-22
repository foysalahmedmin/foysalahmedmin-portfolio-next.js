"use client";

import { Button } from "@/components/ui/button";
import { getProjects } from "@/services/project.service";
import { TProject } from "@/types/project.type";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import React, { useEffect, useState } from "react";

const ProjectCard: React.FC<{ project: TProject }> = ({ project }) => {
  return (
    <div className="group relative overflow-hidden rounded-xl bg-card border border-border transition-all duration-300 hover:-translate-y-2 hover:shadow-xl">
      <div className="aspect-video w-full overflow-hidden">
        <img
          src={project.thumbnail || "/images/placeholder.png"}
          alt={project.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      </div>

      <div className="p-6">
        <div className="mb-3 flex flex-wrap gap-2">
          {project.tags?.slice(0, 3).map((tag, i) => (
            <span key={i} className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-semibold tracking-wider uppercase text-primary">
              {tag}
            </span>
          ))}
        </div>
        <h3 className="mb-2 text-xl font-bold transition-colors group-hover:text-primary">
          {project.name}
        </h3>
        <p className="text-muted-foreground line-clamp-2 text-sm">
          {project.description}
        </p>
        
        <div className="mt-6 flex items-center justify-between">
          <Link href={`/projects/${project._id}`} className="text-primary flex items-center text-sm font-semibold transition-gap duration-300 hover:gap-2">
            Details <ArrowRight className="ml-1 size-4" />
          </Link>
          <div className="flex gap-3">
             {/* We could add repo/live links here if they exist in project resources */}
          </div>
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
      <div className="container">
        <div className="mb-12 flex items-end justify-between">
            <div className="h-10 w-48 animate-pulse rounded bg-muted" />
            <div className="h-10 w-24 animate-pulse rounded bg-muted" />
        </div>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => <div key={i} className="aspect-[4/5] animate-pulse rounded-xl bg-muted" />)}
        </div>
      </div>
    </section>
  );

  return (
    <section id="projects" className="py-24 lg:py-32">
      <div className="container px-6 mx-auto">
        <div className="mb-16 flex flex-col items-center justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-xl text-center md:text-left">
            <span className="text-primary mb-3 inline-block text-sm font-bold uppercase tracking-widest">
              My Portfolio
            </span>
            <h2 className="text-3xl font-bold tracking-tight md:text-5xl">
              Featured Projects
            </h2>
          </div>
          <Link href="/projects">
            <Button variant="outline" className="group">
              View All Projects 
              <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project._id} project={project} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProjectsSection;
