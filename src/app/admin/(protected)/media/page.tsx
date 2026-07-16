import MediaLibraryWorkspace from "@/components/admin/media-library-workspace";
import { requireAdminSession } from "@/lib/auth/admin-session";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Media Library | Portfolio Admin",
  robots: { index: false, follow: false },
};

const MediaLibraryPage = async () => {
  const session = await requireAdminSession("/admin/media", "media:manage");

  return (
    <MediaLibraryWorkspace
      canPermanentDelete={session.capabilities.includes(
        "media:permanent-delete"
      )}
    />
  );
};

export default MediaLibraryPage;
