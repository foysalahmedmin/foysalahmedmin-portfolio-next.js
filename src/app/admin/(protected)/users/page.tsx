import UserManagementWorkspace from "@/components/admin/user-management-workspace";
import { requireAdminSession } from "@/lib/auth/admin-session";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Users | Portfolio Admin",
  robots: { index: false, follow: false },
};

const AdminUsersPage = async () => {
  const session = await requireAdminSession("/admin/users", "users:manage");
  return (
    <UserManagementWorkspace
      currentUserId={session.id}
      actorRole={session.role === "super-admin" ? "super-admin" : "admin"}
      canPermanentDelete={session.capabilities.includes(
        "users:permanent-delete"
      )}
    />
  );
};

export default AdminUsersPage;
