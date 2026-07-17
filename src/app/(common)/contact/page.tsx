import { JsonLdScript } from "@/components/content/json-ld-script";
import {
  getPublicRouteHeader,
  PublicRoutePage,
} from "@/components/pages/public-route-page";
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

const ContactPage = async () => {
  const payload = await getPublicPagePayloadOrFallback("contact");
  const presentation = getPublicRouteHeader(payload);
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
      <PublicRoutePage payload={payload} />
    </>
  );
};

export default ContactPage;
