import ContactContentSection from "@/components/(common)/contact-page/contact-content-section";
import { readTopicServices } from "@/components/(common)/contact-page/read-services";
import {
  resolveContactTopic,
  resolveStartLabels,
  type ContactSearchParams,
} from "@/components/(common)/contact-page/topic";
import { JsonLdScript } from "@/components/content/json-ld-script";
import { getPublicRouteHeader } from "@/components/pages/public-route-page";
import { PublicPageSections } from "@/components/pages/public-page-sections";
import { ConversationLayout } from "@/components/templates";
import {
  buildBreadcrumbJsonLd,
  buildWebPageJsonLd,
} from "@/lib/metadata/json-ld";
import { buildPageMetadata } from "@/lib/metadata/site-metadata";
import { getPublicPagePayloadOrFallback } from "@/lib/pages/public-page-fallback";
import type { Metadata } from "next";

const CONTACT_TITLE = "Contact";

export const generateMetadata = async (): Promise<Metadata> => {
  const payload = await getPublicPagePayloadOrFallback("contact");
  const presentation = getPublicRouteHeader(payload);
  const metadata = buildPageMetadata(payload.site, {
    pathname: "/contact",
    title: payload.page.seo.title || CONTACT_TITLE,
    description: presentation?.description,
  });
  return payload.page.seo.noindex
    ? { ...metadata, robots: { index: false, follow: true } }
    : metadata;
};

const ContactPage = async ({
  searchParams,
}: {
  searchParams: Promise<ContactSearchParams>;
}) => {
  const [payload, params] = await Promise.all([
    getPublicPagePayloadOrFallback("contact"),
    searchParams,
  ]);
  const presentation = getPublicRouteHeader(payload);
  const topic = await resolveContactTopic(
    params.topic,
    payload.site,
    readTopicServices
  );
  const startLabels = resolveStartLabels(params.start, payload.site.finder);
  const title = presentation?.title || CONTACT_TITLE;
  const description =
    presentation?.description ||
    "Share the context for a potential engineering engagement.";

  return (
    <>
      <JsonLdScript
        data={[
          buildWebPageJsonLd(payload.site, {
            pathname: "/contact",
            title,
            description,
          }),
          buildBreadcrumbJsonLd(payload.site, [
            { name: "Home", pathname: "/" },
            { name: CONTACT_TITLE, pathname: "/contact" },
          ]),
        ].filter((item) => item !== null)}
      />
      {/* The same composition as PublicRoutePage, with the form given what the URL resolved to */}
      <ConversationLayout
        route="contact"
        revision={payload.page.published_revision || undefined}
        site={payload.site}
        header={
          presentation
            ? {
                title: presentation.title,
                lede: presentation.description,
                path: presentation.breadcrumbs,
              }
            : null
        }
      >
        <PublicPageSections
          payload={payload}
          sectionOverrides={{
            "contact-form": () => (
              <ContactContentSection
                site={payload.site}
                topic={topic}
                startLabels={startLabels}
              />
            ),
          }}
        />
      </ConversationLayout>
    </>
  );
};

export default ContactPage;
