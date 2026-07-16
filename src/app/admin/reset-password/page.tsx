import AdminRecoveryForm from "@/components/admin/admin-recovery-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reset password",
};

type ResetPasswordPageProps = {
  searchParams: Promise<{ token?: string | string[] }>;
};

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const params = await searchParams;
  const token = Array.isArray(params.token) ? params.token[0] : params.token;
  const safeToken = token?.match(/^[A-Za-z0-9_-]{43}$/)?.[0] ?? null;

  return <AdminRecoveryForm mode="reset" token={safeToken} />;
}
