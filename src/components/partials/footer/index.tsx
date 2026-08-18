import type { TPublicSiteDto } from "@/app/api/site/site.type";
import MotionControl from "@/components/ui/motion-control";
import {
  getPrimaryPublicCta,
  getPublicShellLinks,
  getPublicSocialLinks,
  type TPublicShellLink,
} from "@/lib/site/public-shell";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";

const FooterLink = ({
  link,
  className,
}: {
  link: TPublicShellLink;
  className: string;
}) =>
  link.external ? (
    <a
      href={link.href}
      target={link.href.startsWith("https:") ? "_blank" : undefined}
      rel={link.href.startsWith("https:") ? "noopener noreferrer" : undefined}
      className={className}
    >
      {link.label}
      {link.href.startsWith("https:") && (
        <ArrowUpRight className="size-3.5" aria-hidden="true" />
      )}
    </a>
  ) : (
    <Link href={link.href} className={className}>
      {link.label}
    </Link>
  );

const Footer = ({ site }: { site: TPublicSiteDto }) => {
  const currentYear = new Date().getFullYear();
  const navigation = getPublicShellLinks(site, "footer");
  const legal = getPublicShellLinks(site, "legal");
  const socials = getPublicSocialLinks(site.social_links);
  const cta = getPrimaryPublicCta(site);
  const name = site.identity.public_name || "Engineering Portfolio";
  const tagline =
    site.footer.tagline ||
    site.positioning.compact ||
    site.positioning.canonical ||
    "Six-discipline product engineering";

  return (
    <footer className="bg-card border-border border-t pt-20 pb-10">
      <div className="container mx-auto px-6">
        <div className="border-border mb-16 grid gap-8 border-b pb-16 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-3xl">
            <p className="text-primary text-sm font-bold tracking-[0.2em] uppercase">
              Build with intent
            </p>
            <h2 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
              Turn a complex goal into a clear engineering path.
            </h2>
            <p className="text-muted-foreground mt-5 max-w-2xl text-lg leading-8">
              {site.positioning.client_promise ||
                "Share the outcome and constraints; the system can be shaped from interface through operations."}
            </p>
          </div>
          {cta && (
            <FooterLink
              link={cta}
              className="bg-primary text-primary-foreground focus-visible:ring-ring inline-flex min-h-12 items-center justify-center gap-3 rounded-2xl px-6 text-sm font-black tracking-wide focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            />
          )}
        </div>

        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_0.8fr_0.8fr_1fr]">
          <div>
            <Link
              href="/"
              className="inline-flex min-h-11 items-center text-xl font-black tracking-tight"
            >
              {name}
            </Link>
            <p className="text-muted-foreground mt-4 max-w-sm text-sm leading-7">
              {tagline}
            </p>
            {site.contact.location && (
              <p className="text-muted-foreground mt-4 text-xs font-semibold tracking-wide uppercase">
                {site.contact.location}
              </p>
            )}
          </div>

          <div>
            <h3 className="text-xs font-black tracking-[0.16em] uppercase">
              Navigate
            </h3>
            {navigation.length ? (
              <ul className="mt-5 space-y-3" role="list">
                {navigation.map((link) => (
                  <li key={link.key}>
                    <FooterLink
                      link={link}
                      className="text-muted-foreground hover:text-primary inline-flex min-h-11 items-center gap-1 text-sm font-semibold transition-colors"
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground mt-5 text-sm">
                No footer links published.
              </p>
            )}
          </div>

          <div>
            <h3 className="text-xs font-black tracking-[0.16em] uppercase">
              Connect
            </h3>
            {socials.length || site.contact.public_email ? (
              <ul className="mt-5 space-y-3" role="list">
                {socials.map((link) => (
                  <li key={link.key}>
                    <FooterLink
                      link={link}
                      className="text-muted-foreground hover:text-primary inline-flex min-h-11 items-center gap-1 text-sm font-semibold transition-colors"
                    />
                  </li>
                ))}
                {site.contact.public_email && (
                  <li>
                    <a
                      href={`mailto:${site.contact.public_email}`}
                      className="text-muted-foreground hover:text-primary inline-flex min-h-11 items-center text-sm font-semibold transition-colors"
                    >
                      Email
                    </a>
                  </li>
                )}
              </ul>
            ) : (
              <p className="text-muted-foreground mt-5 text-sm">
                Use the protected contact brief.
              </p>
            )}
          </div>

          <div>
            <h3 className="text-xs font-black tracking-[0.16em] uppercase">
              Practice
            </h3>
            <ol
              className="text-muted-foreground mt-5 space-y-2 text-sm leading-6"
              role="list"
            >
              {site.pillars.map((pillar) => (
                <li key={pillar.key}>{pillar.label}</li>
              ))}
            </ol>
          </div>
        </div>

        <div className="border-border mt-16 flex flex-col gap-5 border-t pt-8 md:flex-row md:items-center md:justify-between">
          <p className="text-muted-foreground text-xs leading-6">
            © {currentYear} {site.footer.copyright_name || name}.{" "}
            {site.footer.legal_notice ||
              "Custom-designed and engineered portfolio."}
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <MotionControl />
            {legal.map((link) => (
              <FooterLink
                key={link.key}
                link={link}
                className="text-muted-foreground hover:text-foreground inline-flex min-h-11 items-center gap-1 text-xs font-bold transition-colors"
              />
            ))}
            {cta && (
              <FooterLink
                link={cta}
                className="text-primary inline-flex min-h-11 items-center gap-1 text-xs font-black"
              />
            )}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
