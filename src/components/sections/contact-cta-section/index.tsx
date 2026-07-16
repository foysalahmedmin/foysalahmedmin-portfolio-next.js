import type { TPublicSiteDto } from "@/app/api/site/site.type";
import { PublicSiteLink } from "@/components/content/public-site-link";
import { getPrimaryPublicCta } from "@/lib/site/public-shell";
import { Braces, MessageSquare, ShieldCheck } from "lucide-react";

const ContactCTASection = ({ site }: { site: TPublicSiteDto }) => {
  const cta = getPrimaryPublicCta(site);
  if (!cta) return null;

  return (
    <section id="contact" className="py-[var(--space-section)]">
      <div className="container mx-auto px-6">
        <div className="bg-primary text-primary-foreground relative overflow-hidden rounded-[2rem] px-6 py-16 md:px-16 md:py-24">
          <div className="bg-background/10 absolute -top-24 -right-24 size-96 rounded-full blur-3xl" />
          <div className="bg-background/10 absolute -bottom-24 -left-24 size-96 rounded-full blur-3xl" />
          <div className="relative z-10 flex flex-col items-center text-center">
            <span className="bg-background/10 mb-6 inline-flex size-16 items-center justify-center rounded-2xl shadow-inner backdrop-blur-sm">
              <Braces className="size-9" aria-hidden="true" />
            </span>
            <h2 className="max-w-4xl text-3xl leading-tight font-black tracking-tight text-balance md:text-5xl">
              {site.positioning.client_promise ||
                "Bring the goal and constraints. Shape the engineering path together."}
            </h2>
            {site.positioning.short_bio && (
              <p className="mt-6 max-w-2xl text-lg leading-8 opacity-90">
                {site.positioning.short_bio}
              </p>
            )}
            <PublicSiteLink
              link={cta}
              showIcon
              className="bg-background text-foreground focus-visible:ring-ring mt-9 inline-flex min-h-12 items-center gap-2 rounded-xl px-6 text-sm font-black focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            />
            <div className="mt-10 flex flex-wrap justify-center gap-6 text-sm font-semibold">
              <span className="flex items-center gap-2">
                <MessageSquare
                  className="size-4 opacity-75"
                  aria-hidden="true"
                />
                Outcome-led brief
              </span>
              <span className="flex items-center gap-2">
                <ShieldCheck className="size-4 opacity-75" aria-hidden="true" />
                Protected intake
              </span>
              {site.contact.response_promise && (
                <span>{site.contact.response_promise}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactCTASection;
