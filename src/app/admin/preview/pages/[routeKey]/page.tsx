import {
  PAGE_PREVIEW_COOKIE,
  verifyPagePreviewToken,
} from "@/app/api/pages/page.preview";
import { PageDomainError } from "@/app/api/pages/page.policy";
import { readDraftPreview } from "@/app/api/pages/page.service";
import { PAGE_ROUTE_KEYS, type TPageRouteKey } from "@/app/api/pages/page.type";
import PagePreviewRuntime from "@/components/admin/page-preview-runtime";
import { PublicRoutePage } from "@/components/pages/public-route-page";
import Footer from "@/components/partials/footer";
import Header from "@/components/partials/Header";
import ScrollToTop from "@/components/ui/scroll-to-top";
import { requireAdminSession } from "@/lib/auth/admin-session";
import { normalizePagePreviewDisplay } from "@/lib/pages/page-preview-display";
import { getAdminPagePreviewPath } from "@/lib/pages/page-preview-path";
import { loadPublicRouteDiscovery } from "@/lib/pages/public-route-discovery";
import { resolvePageSnapshotUncached } from "@/lib/pages/published-page-resolver";
import { readPublishedSite } from "@/lib/site/published-site";
import { cookies } from "next/headers";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type PreviewPageProps = Readonly<{
  params: Promise<{ routeKey: string }>;
  searchParams: Promise<{
    theme?: string | string[];
    motion?: string | string[];
  }>;
}>;

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Private Page preview",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
    noimageindex: true,
  },
  referrer: "no-referrer",
};

const isRouteKey = (value: string): value is TPageRouteKey =>
  (PAGE_ROUTE_KEYS as readonly string[]).includes(value);

const PreviewFailure = ({
  code,
  sources = [],
}: {
  code:
    | "PREVIEW_SESSION_REQUIRED"
    | "PAGE_PREVIEW_STALE"
    | "PAGE_REFERENCE_INVALID"
    | "PAGE_PREVIEW_UNAVAILABLE";
  sources?: readonly string[];
}) => (
  <main className="bg-background text-foreground grid min-h-screen place-items-center p-6">
    <section
      aria-labelledby="preview-failure-heading"
      className="border-border bg-card w-full max-w-2xl rounded-3xl border p-8 shadow-[var(--shadow-md)]"
    >
      <p className="text-destructive text-xs font-black tracking-[0.16em] uppercase">
        Private preview unavailable
      </p>
      <h1
        id="preview-failure-heading"
        className="mt-3 text-3xl font-black tracking-tight"
      >
        Refresh the preview session
      </h1>
      <p className="text-muted-foreground mt-4 leading-7">
        The saved draft could not be rendered safely. Return to the Page editor,
        resolve the listed fields, then start a new preview.
      </p>
      <p className="bg-muted mt-6 rounded-xl px-4 py-3 font-mono text-xs">
        {code}
      </p>
      {sources.length ? (
        <ul className="mt-5 space-y-2 text-sm" aria-label="Validation sources">
          {sources.map((source) => (
            <li
              key={source}
              className="border-border rounded-lg border px-4 py-3 font-mono"
            >
              {source}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  </main>
);

const safeFailure = (
  error: unknown
): Readonly<{
  code:
    | "PAGE_PREVIEW_STALE"
    | "PAGE_REFERENCE_INVALID"
    | "PAGE_PREVIEW_UNAVAILABLE";
  sources: readonly string[];
}> => {
  if (error instanceof PageDomainError) {
    if (error.code === "PAGE_PREVIEW_STALE") {
      return { code: "PAGE_PREVIEW_STALE", sources: [] };
    }
    if (
      error.code === "PAGE_REFERENCE_INVALID" ||
      error.code === "PAGE_GRAPH_BUDGET_EXCEEDED"
    ) {
      return {
        code: "PAGE_REFERENCE_INVALID",
        sources: error.sources.slice(0, 20),
      };
    }
  }
  return { code: "PAGE_PREVIEW_UNAVAILABLE", sources: [] };
};

export default async function AdminPublicPagePreview({
  params,
  searchParams,
}: PreviewPageProps) {
  const { routeKey: candidate } = await params;
  if (!isRouteKey(candidate)) notFound();
  const routeKey = candidate;
  await requireAdminSession(getAdminPagePreviewPath(routeKey), "site:read");

  const display = normalizePagePreviewDisplay(await searchParams);
  const token = (await cookies()).get(PAGE_PREVIEW_COOKIE)?.value;
  const preview = verifyPagePreviewToken(token, routeKey);
  if (!preview) {
    return (
      <PagePreviewRuntime {...display}>
        <PreviewFailure code="PREVIEW_SESSION_REQUIRED" />
      </PagePreviewRuntime>
    );
  }

  let resolved: Readonly<{
    revision: number;
    payload: Awaited<ReturnType<typeof resolvePageSnapshotUncached>>;
    discovery: Awaited<ReturnType<typeof loadPublicRouteDiscovery>>;
  }>;
  try {
    const [page, site] = await Promise.all([
      readDraftPreview(routeKey, preview.page_id, preview.revision),
      readPublishedSite(),
    ]);
    const payload = await resolvePageSnapshotUncached({
      route_key: routeKey,
      revision: page.revision,
      resolved_at: page.updated_at,
      snapshot: page.draft,
      site,
    });
    const discovery = await loadPublicRouteDiscovery(payload, {
      mode: "preview",
    });
    resolved = { revision: page.revision, payload, discovery };
  } catch (error) {
    return (
      <PagePreviewRuntime {...display}>
        <PreviewFailure {...safeFailure(error)} />
      </PagePreviewRuntime>
    );
  }

  return (
    <PagePreviewRuntime {...display}>
      <div className="bg-background text-foreground min-h-screen">
        <a
          href="#preview-main-content"
          className="bg-background text-foreground focus-visible:ring-ring fixed top-3 left-3 z-[2000] -translate-y-24 rounded-lg px-4 py-3 font-semibold shadow-lg transition-transform focus-visible:translate-y-0 focus-visible:ring-2"
        >
          Skip to preview content
        </a>
        <Header site={resolved.payload.site} />
        <div
          id="preview-main-content"
          tabIndex={-1}
          data-page-preview=""
          data-page-revision={resolved.revision}
        >
          <PublicRoutePage
            payload={resolved.payload}
            discovery={resolved.discovery}
          />
        </div>
        <Footer site={resolved.payload.site} />
        <ScrollToTop />
      </div>
    </PagePreviewRuntime>
  );
}
