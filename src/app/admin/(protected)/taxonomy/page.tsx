import TaxonomyAdminWorkspace from "@/components/admin/taxonomy-admin-workspace";
import { requireAdminSession } from "@/lib/auth/admin-session";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Taxonomy | Portfolio Admin",
  robots: { index: false, follow: false },
};

const AdminTaxonomyPage = async () => {
  const session = await requireAdminSession("/admin/taxonomy", "content:read");

  return (
    <TaxonomyAdminWorkspace
      canEdit={session.capabilities.includes("content:edit")}
      canPermanentDelete={session.capabilities.includes(
        "content:permanent-delete"
      )}
    />
  );
};

export default AdminTaxonomyPage;
