import { PageDomainError } from "@/app/api/pages/page.policy";
import { getAdminPage } from "@/app/api/pages/page.service";
import {
  PAGE_ROUTE_KEYS,
  PAGE_ROUTE_PATHS,
  type TPageAdminDto,
  type TPageRouteKey,
} from "@/app/api/pages/page.type";
import { ConsoleList } from "@/components/templates/console-templates";
import { Button } from "@/components/ui/button";
import { MonoLabel } from "@/components/ui/mono-label";
import { StatusMark } from "@/components/ui/status-mark";
import { requireAdminSession } from "@/lib/auth/admin-session";
import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page composition",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const readPageOrNull = async (
  routeKey: TPageRouteKey
): Promise<TPageAdminDto | null> =>
  await getAdminPage(routeKey).catch((error: unknown) => {
    if (error instanceof PageDomainError && error.code === "PAGE_NOT_FOUND") {
      return null;
    }
    throw error;
  });

export default async function AdminPagesIndex() {
  const session = await requireAdminSession("/admin/pages", "site:read");
  const pages = await Promise.all(
    PAGE_ROUTE_KEYS.map(async (routeKey) => ({
      routeKey,
      page: await readPageOrNull(routeKey),
    }))
  );

  const canEdit = session.capabilities.includes("site:edit");

  return (
    <ConsoleList
      title="Pages"
      description="Nine bounded public routes with revisioned SEO, typed section order, graph validation, private preview sessions and independent publish state."
      actions={canEdit ? null : <MonoLabel>Read only</MonoLabel>}
    >
      <ul className="cwb-routes" aria-label="Fixed routes">
        {pages.map(({ routeKey, page }) => {
          const publishedRevision = page?.published?.revision;
          const currentPublished = page && publishedRevision === page.revision;
          return (
            <li key={routeKey} className="cwb-route">
              <div className="cwb-route__name">
                <MonoLabel>{PAGE_ROUTE_PATHS[routeKey]}</MonoLabel>
                <h2 className="cwb-route__title">{routeKey}</h2>
              </div>
              <div className="cwb-route__marks">
                {page ? (
                  <>
                    <span>
                      Draft <span className="t-mono">r{page.revision}</span>
                    </span>
                    {publishedRevision ? (
                      <StatusMark state="published">
                        Published r{publishedRevision}
                      </StatusMark>
                    ) : (
                      <StatusMark state="draft">Never published</StatusMark>
                    )}
                    {!currentPublished ? (
                      <StatusMark state="pending">
                        Unpublished revision
                      </StatusMark>
                    ) : null}
                  </>
                ) : (
                  <StatusMark state="warning">Not configured</StatusMark>
                )}
              </div>
              <p className="cwb-route__summary">
                {page
                  ? `${page.draft.sections.length} draft section${page.draft.sections.length === 1 ? "" : "s"}; ${page.draft.sections.filter((section) => section.visible).length} visible.`
                  : "No record exists. The editor can create a neutral, non-public route-compatible draft."}
              </p>
              <Button asChild variant="outline">
                <Link href={`/admin/pages/${routeKey}`}>
                  {canEdit
                    ? page
                      ? "Edit composition"
                      : "Configure Page"
                    : "Inspect composition"}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </Button>
            </li>
          );
        })}
      </ul>
    </ConsoleList>
  );
}
