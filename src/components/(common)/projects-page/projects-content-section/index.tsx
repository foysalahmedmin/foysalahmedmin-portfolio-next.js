"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getProjectCategories } from "@/services/category.service";
import { getProjects } from "@/services/project.service";
import type { TProject } from "@/types/project.type";
import { ChevronLeft, ChevronRight, LayoutGrid, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const ProjectsContentSection = () => {
  const [projects, setProjects] = useState<TProject[]>([]);
  const [categories, setCategories] = useState<{ _id: string; name: string }[]>(
    []
  );
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
          const total = res.meta?.total || 0;
          const limit = res.meta?.limit || 9;
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
    <div className="container mx-auto px-6 pt-24">
      {/* Filters */}
      <div className="mb-12 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 items-center gap-4">
          <div className="relative max-w-md flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-4 size-4 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search projects..."
              className="border-border bg-card focus:border-primary w-full rounded-2xl border py-3 pr-4 pl-12 transition-colors focus:outline-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0">
            <button
              onClick={() => setCategory("all")}
              className={cn(
                "whitespace-nowrap rounded-xl px-6 py-2.5 text-sm font-bold transition-all",
                category === "all"
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                  : "bg-card border-border hover:bg-muted border"
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
                  category === cat._id
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                    : "bg-card border-border hover:bg-muted border"
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
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-muted aspect-[4/3] animate-pulse rounded-3xl"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <div
              key={project._id}
              className="group border-border bg-card relative overflow-hidden rounded-3xl border transition-all hover:-translate-y-2 hover:shadow-2xl hover:shadow-primary/5"
            >
              <div className="aspect-[4/3] overflow-hidden">
                <img
                  src={project.thumbnail?.url || "/images/placeholder.png"}
                  alt={project.name}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
              </div>
              <div className="p-8">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-primary text-[10px] font-bold tracking-widest uppercase">
                    {project.category?.name || "Project"}
                  </span>
                  <span className="text-muted-foreground text-[10px] font-bold tracking-widest uppercase">
                    {project.status}
                  </span>
                </div>
                <h3 className="text-2xl font-bold transition-colors group-hover:text-primary">
                  {project.name}
                </h3>
                <p className="text-muted-foreground mt-4 line-clamp-2 text-sm leading-relaxed">
                  {project.description}
                </p>
                <Link
                  href={`/projects/${project._id}`}
                  className="group/link text-primary mt-8 flex items-center gap-2 text-sm font-bold tracking-widest uppercase"
                >
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
          <LayoutGrid className="text-muted-foreground/20 mx-auto size-16" />
          <h3 className="mt-6 text-xl font-bold">No projects found</h3>
          <p className="text-muted-foreground mt-2">
            Try adjusting your filters or search terms.
          </p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-20 flex items-center justify-center gap-4">
          <Button
            variant="outline"
            shape="icon"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
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
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

const ArrowRight = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M14 5l7 7m0 0l-7 7m7-7H3"
    />
  </svg>
);

export default ProjectsContentSection;
