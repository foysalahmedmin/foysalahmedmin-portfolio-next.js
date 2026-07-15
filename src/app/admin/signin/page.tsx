import AdminSignInForm from "@/components/admin/admin-signin-form";
import { getSafeAdminReturnPath } from "@/lib/auth/admin-access";
import { getAdminSession } from "@/lib/auth/admin-session";
import { redirect } from "next/navigation";

type AdminSignInPageProps = {
  searchParams: Promise<{ returnTo?: string | string[] }>;
};

const AdminSignInPage = async ({ searchParams }: AdminSignInPageProps) => {
  const params = await searchParams;
  const requestedPath = Array.isArray(params.returnTo)
    ? params.returnTo[0]
    : params.returnTo;
  const returnTo = getSafeAdminReturnPath(requestedPath);
  const session = await getAdminSession();

  if (session) redirect(returnTo);

  return <AdminSignInForm returnTo={returnTo} />;
};

export default AdminSignInPage;
