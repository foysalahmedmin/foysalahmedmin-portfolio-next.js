import AdminShell from "@/components/admin/admin-shell";
import { requireAdminSession } from "@/lib/auth/admin-session";
import { getAdminSite } from "@/app/api/site/site.service";
import type { ReactNode } from "react";

const ProtectedAdminLayout = async ({ children }: { children: ReactNode }) => {
  const session = await requireAdminSession();
  const site = session.capabilities.includes("site:read")
    ? await getAdminSite().catch(() => null)
    : null;

  return (
    <AdminShell
      user={session}
      environment={
        process.env.VERCEL_ENV || process.env.NODE_ENV || "development"
      }
      siteState={{
        configured: Boolean(site),
        published: Boolean(site?.published),
        ...(site ? { draftRevision: site.revision } : {}),
        ...(site?.published
          ? { publishedRevision: site.published.revision }
          : {}),
      }}
    >
      {children}
    </AdminShell>
  );
};

export default ProtectedAdminLayout;
