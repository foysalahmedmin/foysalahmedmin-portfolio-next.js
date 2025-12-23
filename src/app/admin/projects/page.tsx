"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getProjects } from "@/services/project.service";
import type { TProject } from "@/types/project.type";
import {
    Edit,
    Filter,
    Plus,
    Search,
    Trash2
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const AdminProjectsPage = () => {
    const [projects, setProjects] = useState<TProject[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const res = await getProjects();
                if (res.success && Array.isArray(res.data)) {
                    setProjects(res.data);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchProjects();
    }, []);

    const filteredProjects = projects.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Projects Management</h1>
                    <p className="text-muted-foreground mt-1">Manage your portfolio projects and case studies.</p>
                </div>
                <Link href="/admin/projects/new">
                    <Button className="font-bold uppercase tracking-widest text-[10px] md:text-sm">
                        <Plus className="mr-2 size-4" /> Add New Project
                    </Button>
                </Link>
            </div>

            <div className="rounded-3xl border border-border bg-card shadow-sm overflow-hidden">
                {/* Search & Filter */}
                <div className="p-6 border-b border-border flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <input 
                            type="text" 
                            placeholder="Search by name..." 
                            className="w-full rounded-xl border border-border bg-background py-2 pl-10 pr-4 text-sm focus:border-primary focus:outline-none"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Button variant="outline" className="gap-2">
                        <Filter className="size-4" /> Filters
                    </Button>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-muted/50 text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b border-border">
                                <th className="px-6 py-4">Project</th>
                                <th className="px-6 py-4">Category</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Featured</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {loading ? (
                                [1, 2, 3].map(i => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={5} className="px-6 py-6 h-20 bg-muted/10"></td>
                                    </tr>
                                ))
                            ) : filteredProjects.map((project) => (
                                <tr key={project._id} className="hover:bg-muted/20 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-4">
                                            <div className="size-12 rounded-lg bg-muted overflow-hidden">
                                                <img src={project.thumbnail || "/images/placeholder.png"} alt="" className="h-full w-full object-cover" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm">{project.name}</p>
                                                <p className="text-xs text-muted-foreground">{project.slug}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-xs font-medium">{project.category?.name || "N/A"}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={cn(
                                            "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                                            project.status === 'completed' ? "bg-green-500/10 text-green-500" : "bg-yellow-500/10 text-yellow-500"
                                        )}>
                                            {project.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {project.is_featured ? (
                                            <span className="text-primary text-[10px] font-bold uppercase tracking-widest">Yes</span>
                                        ) : (
                                            <span className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <Link href={`/admin/projects/edit/${project._id}`}>
                                                <Button variant="ghost" shape="icon" className="h-8 w-8">
                                                    <Edit className="size-4" />
                                                </Button>
                                            </Link>
                                            <Button variant="ghost" shape="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10">
                                                <Trash2 className="size-4" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {!loading && filteredProjects.length === 0 && (
                    <div className="py-20 text-center">
                        <p className="text-muted-foreground">No projects found.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminProjectsPage;
