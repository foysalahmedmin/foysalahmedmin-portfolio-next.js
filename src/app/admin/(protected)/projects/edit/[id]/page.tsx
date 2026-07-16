"use client";

import ProjectForm from "@/components/admin/project-form";
import { buttonVariants } from "@/components/ui/button";
import { getAdminProjectById, updateProject } from "@/services/project.service";
import type { TProject, TProjectInput } from "@/types/project.type";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

const AdminEditProjectPage = () => {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<TProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const fetchProject = async () => {
      try {
        const response = await getAdminProjectById(id, {
          signal: controller.signal,
        });
        if (!response.success || !response.data) {
          throw new Error(response.message || "Failed to fetch project");
        }

        setProject(response.data);
      } catch (requestError) {
        if (controller.signal.aborted) return;
        setError(getErrorMessage(requestError, "Failed to fetch project"));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void fetchProject();
    return () => controller.abort();
  }, [id]);

  const handleSubmit = async (data: TProjectInput) => {
    setSaving(true);
    setError(null);
    try {
      const res = await updateProject(id, data);
      if (res.success) {
        router.push("/admin/projects");
      }
    } catch (updateError) {
      setError(getErrorMessage(updateError, "Failed to update project"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p role="status">Loading project…</p>;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/projects"
          aria-label="Back to projects"
          className={buttonVariants({ variant: "outline", shape: "icon" })}
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Project</h1>
          <p className="text-muted-foreground mt-1">
            Update project details and settings.
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive rounded-xl p-4 text-sm font-bold">
          {error}
        </div>
      )}

      <div className="border-border bg-card rounded-3xl border p-8 shadow-sm">
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
