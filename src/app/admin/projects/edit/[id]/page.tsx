"use client";

import ProjectForm from "@/components/admin/project-form";
import { Button } from "@/components/ui/button";
import { getProjectById, updateProject } from "@/services/project.service";
import { TProject } from "@/types/project.type";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const AdminEditProjectPage = () => {
    const params = useParams();
    const router = useRouter();
    const [project, setProject] = useState<TProject | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchProject = async () => {
            try {
                const res = await getProjectById(params.id as string);
                if (res.success && res.data) {
                    setProject(res.data);
                }
            } catch (err: any) {
                setError(err.message || "Failed to fetch project");
            } finally {
                setLoading(false);
            }
        };
        fetchProject();
    }, [params.id]);

    const handleSubmit = async (data: any) => {
        setSaving(true);
        setError(null);
        try {
            const res = await updateProject(params.id as string, data);
            if (res.success) {
                router.push("/admin/projects");
            }
        } catch (err: any) {
            setError(err.message || "Failed to update project");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex items-center gap-4">
                <Link href="/admin/projects">
                    <Button variant="outline" shape="icon">
                        <ArrowLeft className="size-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Edit Project</h1>
                    <p className="text-muted-foreground mt-1">Update project details and settings.</p>
                </div>
            </div>

            {error && (
                <div className="p-4 rounded-xl bg-destructive/10 text-destructive text-sm font-bold">
                    {error}
                </div>
            )}

            <div className="rounded-3xl border border-border bg-card p-8 shadow-sm">
                {project && (
                    <ProjectForm 
                        initialData={project}
                        onSubmit={handleSubmit} 
                        onCancel={() => router.push("/admin/projects")} 
                        loading={saving}
                    />
                )}
            </div>
        </div>
    );
};

export default AdminEditProjectPage;
