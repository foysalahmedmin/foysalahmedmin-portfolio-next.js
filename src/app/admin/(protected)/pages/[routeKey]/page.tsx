import { PageDomainError } from "@/app/api/pages/page.policy";
import { getAdminPage } from "@/app/api/pages/page.service";
import { PAGE_ROUTE_KEYS, type TPageRouteKey } from "@/app/api/pages/page.type";
import PageAdminEditor from "@/components/admin/page-admin-editor";
import { requireAdminSession } from "@/lib/auth/admin-session";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type PageProps = Readonly<{
  params: Promise<{ routeKey: string }>;
}>;

export const dynamic = "force-dynamic";

const isRouteKey = (value: string): value is TPageRouteKey =>
  (PAGE_ROUTE_KEYS as readonly string[]).includes(value);

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { routeKey } = await params;
  return {
    title: isRouteKey(routeKey) ? `${routeKey} Page` : "Page not found",
    robots: { index: false, follow: false },
  };
}

export default async function AdminPageEditorRoute({ params }: PageProps) {
  const { routeKey: candidate } = await params;
  if (!isRouteKey(candidate)) notFound();
  const routeKey = candidate;
  const session = await requireAdminSession(
    `/admin/pages/${routeKey}`,
    "site:read"
  );
  const page = await getAdminPage(routeKey).catch((error: unknown) => {
    if (error instanceof PageDomainError && error.code === "PAGE_NOT_FOUND") {
      return null;
    }
    throw error;
  });

  return (
    <PageAdminEditor
      routeKey={routeKey}
      initialPage={page}
      canEdit={session.capabilities.includes("site:edit")}
      canPublish={session.capabilities.includes("site:publish")}
    />
  );
}
