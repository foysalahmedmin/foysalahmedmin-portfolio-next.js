"use client";

import VideoForm from "@/components/admin/video-form";
import { buttonVariants } from "@/components/ui/button";
import { getAdminVideoById, updateVideo } from "@/services/video.service";
import type { TVideo, TVideoInput } from "@/types/video.type";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

const AdminEditVideoPage = () => {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [video, setVideo] = useState<TVideo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const fetchItem = async () => {
      try {
        const response = await getAdminVideoById(id, {
          signal: controller.signal,
        });
        if (!response.success || !response.data) {
          throw new Error(response.message || "Failed to fetch video");
        }

        setVideo(response.data);
      } catch (requestError) {
        if (controller.signal.aborted) return;
        setError(getErrorMessage(requestError, "Failed to fetch video"));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void fetchItem();
    return () => controller.abort();
  }, [id]);

  const handleSubmit = async (data: TVideoInput) => {
    setSaving(true);
    setError(null);
    try {
      const res = await updateVideo(id, data);
      if (res.success) {
        router.push("/admin/videos");
      }
    } catch (updateError) {
      setError(getErrorMessage(updateError, "Failed to update video"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p role="status">Loading video…</p>;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/videos"
          aria-label="Back to videos"
          className={buttonVariants({ variant: "outline", shape: "icon" })}
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Video</h1>
          <p className="text-muted-foreground mt-1">
            Update the video, its shape and its source.
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive rounded-xl p-4 text-sm font-bold">
          {error}
        </div>
      )}

      <div className="border-border bg-card rounded-3xl border p-8 shadow-sm">
        {video && (
          <VideoForm
            initialData={video}
            onSubmit={handleSubmit}
            onCancel={() => router.push("/admin/videos")}
            loading={saving}
          />
        )}
      </div>
    </div>
  );
};

export default AdminEditVideoPage;
