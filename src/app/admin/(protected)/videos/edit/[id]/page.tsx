"use client";

import VideoForm from "@/components/admin/video-form";
import { ConsoleError, ConsoleListSkeleton } from "@/components/console";
import { getAdminVideoById, updateVideo } from "@/services/video.service";
import type { TVideo, TVideoInput } from "@/types/video.type";
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

  if (loading)
    return <ConsoleListSkeleton rows={6} columns={2} label="Loading video" />;

  if (!video) {
    return (
      <ConsoleError
        title="Could not load this video"
        description={error ?? "The video was not found."}
        retryHref={`/admin/videos/edit/${id}`}
      />
    );
  }

  return (
    <VideoForm
      initialData={video}
      onSubmit={handleSubmit}
      onCancel={() => router.push("/admin/videos")}
      loading={saving}
      error={error}
    />
  );
};

export default AdminEditVideoPage;
