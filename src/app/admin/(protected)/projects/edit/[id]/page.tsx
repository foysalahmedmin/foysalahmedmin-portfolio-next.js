"use client";

import ProjectForm from "@/components/admin/project-form";
import { ConsoleError, ConsoleListSkeleton } from "@/components/console";
import { getAdminProjectById, updateProject } from "@/services/project.service";
import type { TProject, TProjectInput } from "@/types/project.type";
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

  if (loading)
    return <ConsoleListSkeleton rows={6} columns={2} label="Loading project" />;

  if (!project) {
    return (
      <ConsoleError
        title="Could not load this project"
        description={error ?? "The project was not found."}
        retryHref={`/admin/projects/edit/${id}`}
      />
    );
  }

  return (
    <ProjectForm
      initialData={project}
      onSubmit={handleSubmit}
      onCancel={() => router.push("/admin/projects")}
      loading={saving}
      error={error}
    />
  );
};

export default AdminEditProjectPage;
