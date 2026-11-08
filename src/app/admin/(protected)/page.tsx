import { getDashboardSnapshot } from "@/app/api/dashboard/dashboard.service";
import { getAdminSite } from "@/app/api/site/site.service";
import {
  DashboardUnavailable,
  WorkspaceDirectory,
} from "@/components/admin/dashboard/dashboard-fallbacks";
import { DashboardView } from "@/components/admin/dashboard/dashboard-view";
import { diffSiteSnapshots } from "@/components/admin/site-review/diff";
import { requireAdminSession } from "@/lib/auth/admin-session";

const AdminDashboardPage = async () => {
  const session = await requireAdminSession("/admin");
  if (!session.capabilities.includes("dashboard:read")) {
    return <WorkspaceDirectory capabilities={session.capabilities} />;
  }

  const canReadSite = session.capabilities.includes("site:read");
  const [snapshot, site] = await Promise.all([
    getDashboardSnapshot().catch(() => null),
    canReadSite ? getAdminSite().catch(() => null) : null,
  ]);
  if (!snapshot) return <DashboardUnavailable />;

  return (
    <DashboardView
      snapshot={snapshot}
      capabilities={session.capabilities}
      environment={
        process.env.VERCEL_ENV || process.env.NODE_ENV || "development"
      }
      unpublishedChanges={
        site ? diffSiteSnapshots(site.published, site.draft).length : null
      }
    />
  );
};

export default AdminDashboardPage;
