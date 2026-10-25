import type { TPublicSiteDto } from "@/app/api/site/site.type";
import { PublicSiteLink } from "@/components/content/public-site-link";
import { buttonVariants } from "@/components/ui/button-variants";
import { getPrimaryPublicCta } from "@/lib/site/public-shell";
import { cn } from "@/lib/utils";

/**
 * The one call-to-action band (docs plan 3.13). It takes the opposite tone of the page body, so every
 * page ends with the same inversion before the footer returns to the page tone. One centred column:
 * a short heading, one line of support, the action and the email. Copy varies through site data; the
 * layout never does. Renders nothing when the site has no primary action.
 */
export function CtaBand({
  site,
  className,
}: {
  site: TPublicSiteDto;
  className?: string;
}) {
  const cta = getPrimaryPublicCta(site);
  if (!cta) return null;

  const heading =
    site.positioning.client_promise ||
    "Bring the goal and constraints. Shape the engineering path together.";
  const email = site.contact.public_email;

  return (
    <section
      id="contact"
      data-band
      data-tone="invert"
      data-cta-band
      aria-labelledby="cta-band-title"
      className={cn("relative isolate overflow-clip", className)}
    >
      <div
        className="hairline-grid pointer-events-none absolute inset-0 -z-10 [mask-image:radial-gradient(60%_80%_at_50%_100%,black,transparent)] opacity-60"
        aria-hidden="true"
      />
      <div className="container flex flex-col items-center gap-8 py-[var(--space-section)] text-center">
        <p className="t-eyebrow text-fg-secondary">Let&apos;s talk</p>
        <h2 id="cta-band-title" className="cta-title">
          {heading}
        </h2>
        {site.positioning.short_bio ? (
          <p className="t-lead text-fg-secondary max-w-2xl">
            {site.positioning.short_bio}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <PublicSiteLink
            link={cta}
            showIcon
            className={cn(buttonVariants({ size: "lg" }), "gap-3")}
          />
          {email ? (
            <a
              href={`mailto:${email}`}
              className={buttonVariants({ size: "lg", variant: "outline" })}
            >
              {email}
            </a>
          ) : null}
        </div>
        <ul
          className="t-eyebrow text-fg-secondary flex flex-wrap justify-center gap-x-6 gap-y-1"
          role="list"
        >
          <li>Outcome-led brief</li>
          <li>Protected intake</li>
          {site.contact.response_promise ? (
            <li>{site.contact.response_promise}</li>
          ) : null}
        </ul>
      </div>
    </section>
  );
}
