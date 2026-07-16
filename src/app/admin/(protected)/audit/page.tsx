import AuditLogWorkspace from "@/components/admin/audit-log-workspace";
import { requireAdminSession } from "@/lib/auth/admin-session";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Audit Log | Portfolio Admin",
  robots: { index: false, follow: false },
};

const AdminAuditPage = async () => {
  await requireAdminSession("/admin/audit", "audit:read");
  return <AuditLogWorkspace />;
};

export default AdminAuditPage;
