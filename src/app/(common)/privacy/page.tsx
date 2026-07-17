import type { TPublicLegalDocumentDto } from "@/app/api/legal-documents/legal-document.type";
import { PublicRoutePage } from "@/components/pages/public-route-page";
import { buildPageMetadata } from "@/lib/metadata/site-metadata";
import { getPublicPagePayloadOrFallback } from "@/lib/pages/public-page-fallback";
import type { Metadata } from "next";

const legalDocument = (
  payload: Awaited<ReturnType<typeof getPublicPagePayloadOrFallback>>
) =>
  payload.sections.find((section) => section.kind === "legal-document")
    ?.items[0] as TPublicLegalDocumentDto | undefined;

export async function generateMetadata(): Promise<Metadata> {
  const payload = await getPublicPagePayloadOrFallback("privacy");
  const document = legalDocument(payload);
  const metadata = buildPageMetadata(payload.site, {
    pathname: "/privacy",
    title: payload.page.seo.title || document?.title || "Privacy Policy",
    description: payload.page.seo.description || document?.summary,
  });
  return document && !payload.page.seo.noindex
    ? metadata
    : { ...metadata, robots: { index: false, follow: true } };
}

export default async function PrivacyPage() {
  const payload = await getPublicPagePayloadOrFallback("privacy");
  return <PublicRoutePage payload={payload} />;
}
