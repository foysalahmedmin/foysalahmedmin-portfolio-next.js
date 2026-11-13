"use client";

import ProjectForm from "@/components/admin/project-form";
import { createProject } from "@/services/project.service";
import type { TProjectInput } from "@/types/project.type";
import { useRouter } from "next/navigation";
import { useState } from "react";

const AdminNewProjectPage = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: TProjectInput) => {
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
    <ProjectForm
      onSubmit={handleSubmit}
      onCancel={() => router.push("/admin/projects")}
      loading={loading}
      error={error}
    />
  );
};

export default AdminNewProjectPage;
