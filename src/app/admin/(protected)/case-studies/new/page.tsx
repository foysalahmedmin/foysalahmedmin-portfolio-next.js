"use client";

import CaseStudyForm from "@/components/admin/case-study-form";
import { createCaseStudy } from "@/services/case-study.service";
import type { TCaseStudyInput } from "@/types/case-study.type";
import { useRouter } from "next/navigation";
import { useState } from "react";

const AdminNewCaseStudyPage = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: TCaseStudyInput) => {
    setLoading(true);
    setError(null);
    try {
      const res = await createCaseStudy(data);
      if (res.success) {
        router.push("/admin/case-studies");
      }
    } catch (err: any) {
      setError(err.message || "Failed to create case study");
    } finally {
      setLoading(false);
    }
  };

  return (
    <CaseStudyForm
      onSubmit={handleSubmit}
      onCancel={() => router.push("/admin/case-studies")}
      loading={loading}
      error={error}
    />
  );
};

export default AdminNewCaseStudyPage;
