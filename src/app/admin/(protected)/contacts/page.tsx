import ContactInboxWorkspace from "@/components/admin/contact-inbox-workspace";
import {
  CONTACT_DELIVERY_STATUSES,
  CONTACT_STATUSES,
} from "@/app/api/contacts/contact.type";
import { requireAdminSession } from "@/lib/auth/admin-session";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Inbox | Portfolio Admin",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const pick = (
  value: string | string[] | undefined,
  allowed: readonly string[]
): string | undefined => {
  const single = Array.isArray(value) ? value[0] : value;
  return single && allowed.includes(single) ? single : undefined;
};

const ContactInboxPage = async ({
  searchParams,
}: {
  searchParams?: SearchParams;
} = {}) => {
  await requireAdminSession("/admin/contacts", "inbox:manage");
  // The dashboard's deep links (`?status=new`, `?delivery_status=dead_letter`) open the filtered inbox;
  // only known values are honoured.
  const params = (await searchParams) ?? {};
  const status = pick(params.status, CONTACT_STATUSES);
  const deliveryStatus = pick(
    params.delivery_status,
    CONTACT_DELIVERY_STATUSES
  );
  return (
    <ContactInboxWorkspace
      initialFilters={{
        ...(status ? { status } : {}),
        ...(deliveryStatus ? { delivery_status: deliveryStatus } : {}),
      }}
    />
  );
};

export default ContactInboxPage;
