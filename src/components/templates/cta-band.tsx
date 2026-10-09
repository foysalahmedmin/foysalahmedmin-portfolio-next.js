import type { TPublicSiteDto } from "@/app/api/site/site.type";
import { PublicSiteLink } from "@/components/content/public-site-link";
import { buttonVariants } from "@/components/ui/button-variants";
import { getPrimaryPublicCta } from "@/lib/site/public-shell";
import { cn } from "@/lib/utils";

/**
 * The one call-to-action band (docs plan 3.13). It takes the opposite tone of the page body, so every
 * page ends with the same inversion before the footer returns to the page tone. Copy varies through
 * site data; the layout never does. Renders nothing when the site has no primary action.
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
        className="hairline-grid pointer-events-none absolute inset-0 -z-10 [mask-image:linear-gradient(to_top,black,transparent_85%)] opacity-60"
        aria-hidden="true"
      />
      <div className="container grid gap-10 py-[var(--space-section)] lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-end">
        <div className="flex flex-col gap-6">
          <p className="t-eyebrow text-fg-secondary">/contact</p>
          <h2 id="cta-band-title" className="t-h2 max-w-[16em]">
            {heading}
          </h2>
          {site.positioning.short_bio ? (
            <p className="t-lead t-measure">{site.positioning.short_bio}</p>
          ) : null}
        </div>
        <div className="flex flex-col items-start gap-5 lg:items-end">
          <PublicSiteLink
            link={cta}
            showIcon
            className={cn(buttonVariants({ size: "lg" }), "gap-3")}
          />
          <ul
            className="t-eyebrow text-fg-secondary flex flex-col gap-1 lg:items-end"
            role="list"
          >
            <li>Outcome-led brief</li>
            <li>Protected intake</li>
            {site.contact.response_promise ? (
              <li>{site.contact.response_promise}</li>
            ) : null}
          </ul>
        </div>
      </div>
    </section>
  );
}
