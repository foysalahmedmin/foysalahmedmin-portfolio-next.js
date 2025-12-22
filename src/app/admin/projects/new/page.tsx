"use client";

import ProjectForm from "@/components/admin/project-form";
import { Button } from "@/components/ui/button";
import { createProject } from "@/services/project.service";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const AdminNewProjectPage = () => {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (data: any) => {
        setLoading(true);
        setError(null);
        try {
            const res = await createProject(data);
            if (res.success) {
                router.push("/admin/projects");
            }
        } catch (err: any) {
            setError(err.message || "Failed to create project");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex items-center gap-4">
                <Link href="/admin/projects">
                    <Button variant="outline" shape="icon">
                        <ArrowLeft className="size-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Create New Project</h1>
                    <p className="text-muted-foreground mt-1">Add a new workspace to your portfolio.</p>
                </div>
            </div>

            {error && (
                <div className="p-4 rounded-xl bg-destructive/10 text-destructive text-sm font-bold">
                    {error}
                </div>
            )}

            <div className="rounded-3xl border border-border bg-card p-8 shadow-sm">
                <ProjectForm 
                    onSubmit={handleSubmit} 
                    onCancel={() => router.push("/admin/projects")} 
                    loading={loading}
                />
            </div>
        </div>
    );
};

export default AdminNewProjectPage;
