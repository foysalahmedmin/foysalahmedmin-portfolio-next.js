import type { TPublicSiteDto } from "@/app/api/site/site.type";
import MotionControl from "@/components/ui/motion-control";
import {
  getPrimaryPublicCta,
  getPublicShellLinks,
  getPublicSocialLinks,
  type TPublicShellLink,
} from "@/lib/site/public-shell";
import { ArrowUpRight } from "lucide-react";
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
    "Architecture, software, and automation";

  return (
    <footer
      data-footer
      className="bg-background text-foreground border-line-2 border-t pt-16 pb-10"
    >
      <div className="container mx-auto px-6">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_0.8fr_0.8fr_1fr]">
          <div>
            <Link href="/" className="t-h4 inline-flex min-h-11 items-center">
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
            <h3 className="t-eyebrow text-fg-secondary">Navigate</h3>
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
            <h3 className="t-eyebrow text-fg-secondary">Connect</h3>
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
            <h3 className="t-eyebrow text-fg-secondary">Practice</h3>
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
