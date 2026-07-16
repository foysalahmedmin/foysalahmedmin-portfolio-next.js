import {
  LegalDocumentUnavailable,
  LegalDocumentView,
} from "@/components/content/legal-document-view";
import { readPublishedLegalDocument } from "@/lib/content/published-legal-document";
import { buildPageMetadata } from "@/lib/metadata/site-metadata";
import { readPublishedSite } from "@/lib/site/published-site";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const [site, document] = await Promise.all([
    readPublishedSite(),
    readPublishedLegalDocument("terms"),
  ]);
  const metadata = buildPageMetadata(site, {
    pathname: "/terms",
    title: document?.title || "Terms of Service",
    description: document?.summary,
  });
  return document
    ? metadata
    : { ...metadata, robots: { index: false, follow: true } };
}

export default async function TermsPage() {
  const [site, document] = await Promise.all([
    readPublishedSite(),
    readPublishedLegalDocument("terms"),
  ]);
  return document ? (
    <LegalDocumentView document={document} site={site} />
  ) : (
    <LegalDocumentUnavailable type="terms" />
  );
}
