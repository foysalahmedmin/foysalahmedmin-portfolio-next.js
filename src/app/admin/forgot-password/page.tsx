import AdminRecoveryForm from "@/components/admin/admin-recovery-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Recover access",
};

export default function ForgotPasswordPage() {
  return <AdminRecoveryForm mode="request" />;
}
