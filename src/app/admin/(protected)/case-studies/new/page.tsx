"use client";

import CaseStudyForm from "@/components/admin/case-study-form";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createCaseStudy } from "@/services/case-study.service";
import type { TCaseStudyInput } from "@/types/case-study.type";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
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
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/case-studies"
          aria-label="Back to case studies"
          className={cn(buttonVariants({ variant: "outline", shape: "icon" }))}
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Create New Case Study
          </h1>
          <p className="text-muted-foreground mt-1">
            Tell the full story of a problem solved, from challenge to result.
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive rounded-xl p-4 text-sm font-bold">
          {error}
        </div>
      )}

      <div className="border-border bg-card rounded-3xl border p-8 shadow-sm">
        <CaseStudyForm
          onSubmit={handleSubmit}
          onCancel={() => router.push("/admin/case-studies")}
          loading={loading}
        />
      </div>
    </div>
  );
};

export default AdminNewCaseStudyPage;
