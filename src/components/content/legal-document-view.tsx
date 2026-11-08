import type { TPublicLegalDocumentDto } from "@/app/api/legal-documents/legal-document.type";
import type { TPublicSiteDto } from "@/app/api/site/site.type";
import { ReadingProgress } from "@/components/motion/reading-progress";
import { PageHeader } from "@/components/templates/page-header";
import { Button } from "@/components/ui/button";
import TrustedRichText from "./trusted-rich-text";
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

const documentPath = (type: TPublicLegalDocumentDto["type"], label: string) => [
  { index: 1, name: "Home", href: "/", icon: "house" },
  { index: 2, name: label, href: `/${type}` },
];

export const LegalDocumentUnavailable = ({
  type,
}: {
  type: TPublicLegalDocumentDto["type"];
}) => {
  const label = documentLabel(type);
  return (
    <div className="cv-doc">
      <PageHeader
        level="detail"
        title={`${label} unavailable`}
        lede="A reviewed public version has not been published yet. No placeholder legal terms are shown."
        path={documentPath(type, label)}
      />
      <div className="cv-doc__body container">
        <div className="cv-doc__text">
          <h2 className="cv-doc__heading">Reviewed copy is pending</h2>
          <p className="cv-doc__prose">
            Please use the contact page if you need information about data
            handling or engagement terms before the reviewed document is
            available.
          </p>
          <Button asChild className="mt-8">
            <Link href="/contact">Contact about this document</Link>
          </Button>
        </div>
      </div>
    </div>
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
    <div className="cv-doc">
      <ReadingProgress />
      <PageHeader
        level="detail"
        title={document.title || label}
        lede={
          document.summary ||
          `The current reviewed and published ${label.toLowerCase()}.`
        }
        path={documentPath(document.type, label)}
        meta={
          <>
            <span>
              Effective{" "}
              <time dateTime={document.effective_at}>
                {formatDate(document.effective_at)}
              </time>
            </span>
            {document.reviewed_at ? (
              <span>
                Reviewed{" "}
                <time dateTime={document.reviewed_at}>
                  {formatDate(document.reviewed_at)}
                </time>
              </span>
            ) : null}
            <span>Version {document.document_version}</span>
          </>
        }
      />

      <article className="cv-doc__body container">
        <div className="cv-doc__text">
          {document.sections.map((section) => (
            <section
              key={section.key}
              id={section.key}
              className="cv-doc__section"
              aria-labelledby={`${section.key}-heading`}
            >
              <h2 id={`${section.key}-heading`} className="cv-doc__heading">
                {section.heading}
              </h2>
              <TrustedRichText
                html={section.body}
                className="editorial cv-doc__prose"
              />
            </section>
          ))}

          <aside className="cv-doc__contact">
            <h2 className="t-eyebrow">Questions about this document?</h2>
            <p className="cv-doc__prose">
              Contact {contactOwner} through the published contact channel.
            </p>
            {publicEmail ? (
              <a
                href={`mailto:${publicEmail}`}
                className="inline-flex min-h-11 items-center underline underline-offset-4"
              >
                {publicEmail}
              </a>
            ) : (
              <Button asChild variant="outline" className="print:hidden">
                <Link href="/contact">Use the contact form</Link>
              </Button>
            )}
          </aside>
        </div>

        <nav aria-labelledby="legal-document-contents" className="cv-doc__toc">
          <p id="legal-document-contents" className="t-eyebrow">
            In this document
          </p>
          <ol role="list">
            {document.sections.map((section) => (
              <li key={section.key}>
                <a href={`#${section.key}`}>{section.heading}</a>
              </li>
            ))}
          </ol>
        </nav>
      </article>
    </div>
  );
};
