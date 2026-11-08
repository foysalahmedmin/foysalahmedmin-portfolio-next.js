import MediaLibraryWorkspace from "@/components/admin/media-library-workspace";
import { requireAdminSession } from "@/lib/auth/admin-session";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Media Library | Portfolio Admin",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const MediaLibraryPage = async ({
  searchParams,
}: {
  searchParams?: SearchParams;
} = {}) => {
  const session = await requireAdminSession("/admin/media", "media:manage");
  // The dashboard's deep link (`?metadata_status=incomplete`) opens the filtered library
  const params = (await searchParams) ?? {};
  const metadata = Array.isArray(params.metadata_status)
    ? params.metadata_status[0]
    : params.metadata_status;

  return (
    <MediaLibraryWorkspace
      canPermanentDelete={session.capabilities.includes(
        "media:permanent-delete"
      )}
      initialFilters={
        metadata === "complete" || metadata === "incomplete"
          ? { metadata_status: metadata }
          : {}
      }
    />
  );
};

export default MediaLibraryPage;
