"use client";

import CaseStudyForm from "@/components/admin/case-study-form";
import { ConsoleError, ConsoleListSkeleton } from "@/components/console";
import {
  getAdminCaseStudyById,
  updateCaseStudy,
} from "@/services/case-study.service";
import type { TCaseStudy, TCaseStudyInput } from "@/types/case-study.type";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

const AdminEditCaseStudyPage = () => {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [caseStudy, setCaseStudy] = useState<TCaseStudy | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const fetchItem = async () => {
      try {
        const response = await getAdminCaseStudyById(id, {
          signal: controller.signal,
        });
        if (!response.success || !response.data) {
          throw new Error(response.message || "Failed to fetch case study");
        }

        setCaseStudy(response.data);
      } catch (requestError) {
        if (controller.signal.aborted) return;
        setError(getErrorMessage(requestError, "Failed to fetch case study"));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void fetchItem();
    return () => controller.abort();
  }, [id]);

  const handleSubmit = async (data: TCaseStudyInput) => {
    setSaving(true);
    setError(null);
    try {
      const res = await updateCaseStudy(id, data);
      if (res.success) {
        router.push("/admin/case-studies");
      }
    } catch (updateError) {
      setError(getErrorMessage(updateError, "Failed to update case study"));
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <ConsoleListSkeleton rows={6} columns={2} label="Loading case study" />
    );

  if (!caseStudy) {
    return (
      <ConsoleError
        title="Could not load this case study"
        description={error ?? "The case study was not found."}
        retryHref={`/admin/case-studies/edit/${id}`}
      />
    );
  }

  return (
    <CaseStudyForm
      initialData={caseStudy}
      onSubmit={handleSubmit}
      onCancel={() => router.push("/admin/case-studies")}
      loading={saving}
      error={error}
    />
  );
};

export default AdminEditCaseStudyPage;
