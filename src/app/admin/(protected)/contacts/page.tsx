import ContactInboxWorkspace from "@/components/admin/contact-inbox-workspace";
import { requireAdminSession } from "@/lib/auth/admin-session";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Inbox | Portfolio Admin",
  robots: { index: false, follow: false },
};

const ContactInboxPage = async () => {
  await requireAdminSession("/admin/contacts", "inbox:manage");
  return <ContactInboxWorkspace />;
};

export default ContactInboxPage;
