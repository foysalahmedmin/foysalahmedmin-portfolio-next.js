import { PageDomainError } from "@/app/api/pages/page.policy";
import { getAdminPage } from "@/app/api/pages/page.service";
import {
  PAGE_ROUTE_KEYS,
  PAGE_ROUTE_PATHS,
  type TPageAdminDto,
  type TPageRouteKey,
} from "@/app/api/pages/page.type";
import { EditorialStatus } from "@/components/admin/editorial-editor-primitives";
import { Button } from "@/components/ui/button";
import { requireAdminSession } from "@/lib/auth/admin-session";
import { ArrowRight, FileStack } from "lucide-react";
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

  return (
    <div className="mx-auto max-w-[100rem] space-y-7">
      <header className="border-border bg-card rounded-2xl border p-6 shadow-[var(--shadow-sm)] sm:p-8">
        <p className="text-primary text-xs font-black tracking-[0.18em] uppercase">
          Fixed-route composition
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
          Pages
        </h1>
        <p className="text-muted-foreground mt-2 max-w-3xl text-sm leading-6">
          Seven bounded public routes with revisioned SEO, typed section order,
          graph validation, private preview sessions and independent publish
          state.
        </p>
        {!session.capabilities.includes("site:edit") ? (
          <div className="mt-4">
            <EditorialStatus>Read only</EditorialStatus>
          </div>
        ) : null}
      </header>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {pages.map(({ routeKey, page }) => {
          const publishedRevision = page?.published?.revision;
          const currentPublished = page && publishedRevision === page.revision;
          return (
            <article
              key={routeKey}
              className="border-border bg-card flex min-h-64 flex-col rounded-2xl border p-6 shadow-[var(--shadow-sm)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-primary text-xs font-black tracking-wider uppercase">
                    {PAGE_ROUTE_PATHS[routeKey]}
                  </p>
                  <h2 className="mt-2 text-2xl font-black capitalize">
                    {routeKey}
                  </h2>
                </div>
                <FileStack
                  className="text-muted-foreground size-6"
                  aria-hidden="true"
                />
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {page ? (
                  <>
                    <EditorialStatus>Draft r{page.revision}</EditorialStatus>
                    {publishedRevision ? (
                      <EditorialStatus tone="success">
                        Published r{publishedRevision}
                      </EditorialStatus>
                    ) : (
                      <EditorialStatus tone="warning">
                        Never published
                      </EditorialStatus>
                    )}
                    {!currentPublished ? (
                      <EditorialStatus tone="warning">
                        Unpublished revision
                      </EditorialStatus>
                    ) : null}
                  </>
                ) : (
                  <EditorialStatus tone="warning">
                    Not configured
                  </EditorialStatus>
                )}
              </div>
              <p className="text-muted-foreground mt-5 flex-1 text-sm leading-6">
                {page
                  ? `${page.draft.sections.length} draft section${page.draft.sections.length === 1 ? "" : "s"}; ${page.draft.sections.filter((section) => section.visible).length} visible.`
                  : "No record exists. The editor can create a neutral, non-public route-compatible draft."}
              </p>
              <Button asChild variant="outline" className="mt-5 w-full">
                <Link href={`/admin/pages/${routeKey}`}>
                  {session.capabilities.includes("site:edit")
                    ? page
                      ? "Edit composition"
                      : "Configure Page"
                    : "Inspect composition"}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </Button>
            </article>
          );
        })}
      </div>
    </div>
  );
}
