"use client";

import CaseStudyForm from "@/components/admin/case-study-form";
import { buttonVariants } from "@/components/ui/button";
import { getAdminCaseStudyById, updateCaseStudy } from "@/services/case-study.service";
import type { TCaseStudy, TCaseStudyInput } from "@/types/case-study.type";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
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

  if (loading) return <p role="status">Loading case study…</p>;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/case-studies"
          aria-label="Back to case studies"
          className={buttonVariants({ variant: "outline", shape: "icon" })}
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Case Study</h1>
          <p className="text-muted-foreground mt-1">
            Update the story, the results and the details.
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive rounded-xl p-4 text-sm font-bold">
          {error}
        </div>
      )}

      <div className="border-border bg-card rounded-3xl border p-8 shadow-sm">
        {caseStudy && (
          <CaseStudyForm
            initialData={caseStudy}
            onSubmit={handleSubmit}
            onCancel={() => router.push("/admin/case-studies")}
            loading={saving}
          />
        )}
      </div>
    </div>
  );
};

export default AdminEditCaseStudyPage;
