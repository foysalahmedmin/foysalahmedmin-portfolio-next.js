"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getProjectCategories } from "@/services/category.service";
import { getProjects } from "@/services/project.service";
import { TProject } from "@/types/project.type";
import { ChevronLeft, ChevronRight, LayoutGrid, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const ProjectsPage = () => {
  const [projects, setProjects] = useState<TProject[]>([]);
  const [categories, setCategories] = useState<{ _id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await getProjectCategories();
        if (res.success) setCategories(res.data);
      } catch (e) {
        console.error(e);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      try {
        const params: Record<string, string> = {
          limit: "9",
          page: page.toString(),
        };
        if (search) params.searchTerm = search;
        if (category !== "all") params.category = category;

        const res = await getProjects(params);
        if (res.success && Array.isArray(res.data)) {
          setProjects(res.data);
          const total = (res.meta?.total as number) || 0;
          const limit = (res.meta?.limit as number) || 9;
          setTotalPages(Math.ceil(total / limit) || 1);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, [search, category, page]);

  return (
    <main className="min-h-screen pt-32 pb-20">
      <div className="container px-6 mx-auto">
        <div className="mb-16 space-y-4 text-center">
            <h1 className="text-4xl font-bold tracking-tight md:text-6xl lg:text-7xl">Browse My <span className="text-primary">Projects</span></h1>
            <p className="text-muted-foreground mx-auto max-w-2xl text-lg">Explore a selection of my recent work across web development, system engineering, and design.</p>
        </div>

        {/* Filters */}
        <div className="mb-12 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 items-center gap-4">
            <div className="relative flex-1 max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input 
                    type="text" 
                    placeholder="Search projects..." 
                    className="w-full rounded-2xl border border-border bg-card py-3 pl-12 pr-4 focus:border-primary focus:outline-none transition-colors"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0">
                <button 
                    onClick={() => setCategory("all")}
                    className={cn(
                        "whitespace-nowrap rounded-xl px-6 py-2.5 text-sm font-bold transition-all",
                        category === "all" ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "bg-card border border-border hover:bg-muted"
                    )}
                >
                    All Work
                </button>
                {categories.map((cat) => (
                    <button 
                        key={cat._id}
                        onClick={() => setCategory(cat._id)}
                        className={cn(
                            "whitespace-nowrap rounded-xl px-6 py-2.5 text-sm font-bold transition-all",
                            category === cat._id ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "bg-card border border-border hover:bg-muted"
                        )}
                    >
                        {cat.name}
                    </button>
                ))}
            </div>
          </div>
        </div>

        {/* Projects Grid */}
        {loading ? (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="aspect-[4/3] animate-pulse rounded-3xl bg-muted" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <div key={project._id} className="group relative overflow-hidden rounded-3xl border border-border bg-card transition-all hover:-translate-y-2 hover:shadow-2xl hover:shadow-primary/5">
                <div className="aspect-[4/3] overflow-hidden">
                    <img 
                        src={project.thumbnail || "/images/placeholder.png"} 
                        alt={project.name} 
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" 
                    />
                </div>
                <div className="p-8">
                    <div className="mb-3 flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-primary">{project.category?.name || "Project"}</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{project.status}</span>
                    </div>
                    <h3 className="text-2xl font-bold transition-colors group-hover:text-primary">{project.name}</h3>
                    <p className="mt-4 line-clamp-2 text-sm text-muted-foreground leading-relaxed">{project.description}</p>
                    <Link href={`/projects/${project._id}`} className="mt-8 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-primary group/link">
                        View Details 
                        <ArrowRight className="size-4 transition-transform group-hover/link:translate-x-1" />
                    </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && projects.length === 0 && (
          <div className="py-20 text-center">
            <LayoutGrid className="mx-auto size-16 text-muted-foreground/20" />
            <h3 className="mt-6 text-xl font-bold">No projects found</h3>
            <p className="text-muted-foreground mt-2">Try adjusting your filters or search terms.</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
            <div className="mt-20 flex items-center justify-center gap-4">
                <Button 
                    variant="outline" 
                    shape="icon"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                >
                    <ChevronLeft className="size-4" />
                </Button>
                
                <div className="flex items-center gap-2">
                    {[...Array(totalPages)].map((_, i) => (
                        <Button
                            key={i}
                            variant={page === i + 1 ? "default" : "outline"}
                            shape="icon"
                            onClick={() => setPage(i + 1)}
                        >
                            {i + 1}
                        </Button>
                    ))}
                </div>

                <Button 
                    variant="outline" 
                    shape="icon"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                >
                    <ChevronRight className="size-4" />
                </Button>
            </div>
        )}
      </div>
    </main>
  );
};

const ArrowRight = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
    </svg>
);

export default ProjectsPage;
