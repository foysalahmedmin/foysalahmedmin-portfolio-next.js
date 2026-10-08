"use client";

import VideoForm from "@/components/admin/video-form";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createVideo } from "@/services/video.service";
import type { TVideoInput } from "@/types/video.type";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const AdminNewVideoPage = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: TVideoInput) => {
    setLoading(true);
    setError(null);
    try {
      const res = await createVideo(data);
      if (res.success) {
        router.push("/admin/videos");
      }
    } catch (err: any) {
      setError(err.message || "Failed to create video");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/videos"
          aria-label="Back to videos"
          className={cn(buttonVariants({ variant: "outline", shape: "icon" }))}
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Add New Video
          </h1>
          <p className="text-muted-foreground mt-1">
            Add a landscape video or a reel from YouTube or an uploaded file.
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive rounded-xl p-4 text-sm font-bold">
          {error}
        </div>
      )}

      <div className="border-border bg-card rounded-3xl border p-8 shadow-sm">
        <VideoForm
          onSubmit={handleSubmit}
          onCancel={() => router.push("/admin/videos")}
          loading={loading}
        />
      </div>
    </div>
  );
};

export default AdminNewVideoPage;
