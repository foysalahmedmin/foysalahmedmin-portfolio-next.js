import type { TPublicLegalDocumentDto } from "@/app/api/legal-documents/legal-document.type";
import type { TPublicSiteDto } from "@/app/api/site/site.type";
import PageHeaderSection from "@/components/sections/page-header-section";
import { Button } from "@/components/ui/button";
import TrustedRichText from "./trusted-rich-text";
import { CalendarDays, FileCheck2, Mail } from "lucide-react";
import Link from "next/link";

const formatDate = (value: string): string =>
  new Intl.DateTimeFormat("en", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(value));

const documentLabel = (type: TPublicLegalDocumentDto["type"]): string =>
  type === "privacy"
    ? "Privacy Policy"
    : type === "terms"
      ? "Terms of Service"
      : "Accessibility Statement";

export const LegalDocumentUnavailable = ({
  type,
}: {
  type: TPublicLegalDocumentDto["type"];
}) => {
  const label = documentLabel(type);
  return (
    <main className="min-h-[70vh] pb-24">
      <PageHeaderSection
        title={`${label} unavailable`}
        subtitle="LEGAL"
        description="A reviewed public version has not been published yet. No placeholder legal terms are shown."
        breadcrumbItems={[
          { index: 1, name: "Home", href: "/", icon: "house" },
          { index: 2, name: label, href: `/${type}` },
        ]}
      />
      <section className="container mx-auto px-6 py-20 text-center">
        <div className="border-border bg-card mx-auto max-w-2xl rounded-3xl border p-8 md:p-12">
          <FileCheck2 className="text-primary mx-auto size-10" aria-hidden />
          <h2 className="mt-6 text-2xl font-bold">Reviewed copy is pending</h2>
          <p className="text-muted-foreground mx-auto mt-4 max-w-xl leading-7">
            Please use the contact page if you need information about data
            handling or engagement terms before the reviewed document is
            available.
          </p>
          <Button asChild className="mt-8">
            <Link href="/contact">Contact about this document</Link>
          </Button>
        </div>
      </section>
    </main>
  );
};

export const LegalDocumentView = ({
  document,
  site,
}: {
  document: TPublicLegalDocumentDto;
  site: TPublicSiteDto;
}) => {
  const label = documentLabel(document.type);
  const publicEmail = site.contact.public_email;
  const contactOwner =
    site.identity.public_name || site.identity.short_name || "Site owner";

  return (
    <main className="min-h-screen pb-24 lg:pb-32 print:pb-0">
      <div className="print:hidden">
        <PageHeaderSection
          title={document.title || label}
          subtitle="REVIEWED LEGAL DOCUMENT"
          description={
            document.summary ||
            `The current reviewed and published ${label.toLowerCase()}.`
          }
          breadcrumbItems={[
            { index: 1, name: "Home", href: "/", icon: "house" },
            { index: 2, name: label, href: `/${document.type}` },
          ]}
        />
      </div>

      <article className="container mx-auto px-6 pt-16 lg:pt-24 print:max-w-none print:px-0 print:pt-0">
        <header className="border-border bg-card mx-auto max-w-5xl rounded-3xl border p-7 md:p-10 print:max-w-none print:rounded-none print:border-0 print:p-0">
          <p className="text-primary text-xs font-black tracking-[0.18em] uppercase">
            {label}
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
            {document.title}
          </h1>
          {document.summary && (
            <p className="text-muted-foreground mt-4 max-w-3xl text-lg leading-8">
              {document.summary}
            </p>
          )}
          <dl className="text-muted-foreground mt-8 grid gap-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-foreground font-bold">Effective date</dt>
              <dd className="mt-1 flex items-center gap-2">
                <CalendarDays className="size-4" aria-hidden />
                <time dateTime={document.effective_at}>
                  {formatDate(document.effective_at)}
                </time>
              </dd>
            </div>
            <div>
              <dt className="text-foreground font-bold">Revision</dt>
              <dd className="mt-1">Version {document.document_version}</dd>
            </div>
            <div>
              <dt className="text-foreground font-bold">Contact owner</dt>
              <dd className="mt-1">{contactOwner}</dd>
            </div>
          </dl>
        </header>

        <div className="mx-auto mt-10 grid max-w-5xl gap-10 lg:grid-cols-[minmax(0,1fr)_15rem] print:mt-8 print:block print:max-w-none">
          <div className="border-border bg-card rounded-3xl border p-7 md:p-12 print:rounded-none print:border-0 print:p-0">
            {document.sections.map((section, index) => (
              <section
                key={section.key}
                id={section.key}
                className="border-border scroll-mt-28 border-b py-9 first:pt-0 last:border-0 last:pb-0 print:break-inside-avoid"
                aria-labelledby={`${section.key}-heading`}
              >
                <p className="text-primary text-xs font-black tracking-[0.15em] uppercase">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <h2
                  id={`${section.key}-heading`}
                  className="mt-2 text-2xl font-bold tracking-tight md:text-3xl"
                >
                  {section.heading}
                </h2>
                <TrustedRichText
                  html={section.body}
                  className="editorial text-muted-foreground mt-5 max-w-none leading-8 whitespace-pre-line"
                />
              </section>
            ))}

            <aside className="bg-muted/50 mt-12 rounded-2xl p-6 print:border print:bg-transparent">
              <h2 className="font-bold">Questions about this document?</h2>
              <p className="text-muted-foreground mt-2 leading-7">
                Contact {contactOwner} through the published contact channel.
              </p>
              {publicEmail ? (
                <a
                  href={`mailto:${publicEmail}`}
                  className="text-primary focus-visible:ring-ring mt-4 inline-flex min-h-11 items-center gap-2 rounded-md font-bold hover:underline focus-visible:ring-2 focus-visible:outline-none"
                >
                  <Mail className="size-4" aria-hidden />
                  {publicEmail}
                </a>
              ) : (
                <Button asChild variant="outline" className="mt-4 print:hidden">
                  <Link href="/contact">Use the contact form</Link>
                </Button>
              )}
            </aside>
          </div>

          <nav
            aria-labelledby="legal-document-contents"
            className="hidden lg:block print:hidden"
          >
            <div className="sticky top-28">
              <p
                id="legal-document-contents"
                className="text-xs font-black tracking-[0.15em] uppercase"
              >
                In this document
              </p>
              <ol className="border-border mt-4 space-y-1 border-l pl-4">
                {document.sections.map((section) => (
                  <li key={section.key}>
                    <a
                      href={`#${section.key}`}
                      className="text-muted-foreground hover:text-primary focus-visible:ring-ring inline-flex min-h-11 items-center rounded-md text-sm leading-5 focus-visible:ring-2 focus-visible:outline-none"
                    >
                      {section.heading}
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          </nav>
        </div>
      </article>
    </main>
  );
};
