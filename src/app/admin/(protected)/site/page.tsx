import SiteAdminEditor from "@/components/admin/site-admin-editor";
import { SiteDomainError } from "@/app/api/site/site.policy";
import { getAdminSite } from "@/app/api/site/site.service";
import { requireAdminSession } from "@/lib/auth/admin-session";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Site settings",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminSitePage() {
  const session = await requireAdminSession("/admin/site", "site:read");
  const site = await getAdminSite().catch((error: unknown) => {
    if (error instanceof SiteDomainError && error.code === "SITE_NOT_FOUND") {
      return null;
    }
    throw error;
  });

  return (
    <SiteAdminEditor
      initialSite={site}
      canEdit={session.capabilities.includes("site:edit")}
      canPublish={session.capabilities.includes("site:publish")}
    />
  );
}
