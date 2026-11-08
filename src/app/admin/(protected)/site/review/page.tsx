import { SiteDomainError } from "@/app/api/site/site.policy";
import { getAdminSite } from "@/app/api/site/site.service";
import { SiteReview } from "@/components/admin/site-review/site-review";
import { requireAdminSession } from "@/lib/auth/admin-session";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Review and publish",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminSiteReviewPage() {
  const session = await requireAdminSession("/admin/site/review", "site:read");
  const site = await getAdminSite().catch((error: unknown) => {
    if (error instanceof SiteDomainError && error.code === "SITE_NOT_FOUND") {
      return null;
    }
    throw error;
  });

  return (
    <SiteReview
      site={site}
      canPublish={session.capabilities.includes("site:publish")}
    />
  );
}
