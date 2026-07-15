import AdminShell from "@/components/admin/admin-shell";
import { requireAdminSession } from "@/lib/auth/admin-session";
import type { ReactNode } from "react";

const ProtectedAdminLayout = async ({ children }: { children: ReactNode }) => {
  const session = await requireAdminSession();

  return <AdminShell user={session}>{children}</AdminShell>;
};

export default ProtectedAdminLayout;
