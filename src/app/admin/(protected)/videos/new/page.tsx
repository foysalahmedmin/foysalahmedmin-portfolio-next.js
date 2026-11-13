"use client";

import VideoForm from "@/components/admin/video-form";
import { createVideo } from "@/services/video.service";
import type { TVideoInput } from "@/types/video.type";
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
    <VideoForm
      onSubmit={handleSubmit}
      onCancel={() => router.push("/admin/videos")}
      loading={loading}
      error={error}
    />
  );
};

export default AdminNewVideoPage;
