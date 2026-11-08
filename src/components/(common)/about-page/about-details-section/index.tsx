import type { TPublicSiteDto } from "@/app/api/site/site.type";
import ParallaxLayer from "@/components/motion/parallax-layer";
import Reveal from "@/components/motion/reveal";
import { SectionHead } from "@/components/sections/signal/section-head";
import OptimizedMedia from "@/components/ui/optimized-media";
import { resolveMediaAlt } from "@/lib/media/presentation";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

// Fixed copy: true whatever the data holds.
const COPY = {
  eyebrow: "/about",
  title: "Who is solving your problem.",
  promise: "The promise",
  empty: "Published practice details are being prepared.",
} as const;

const LINKS = [
  { href: "/case-studies", path: "/case-files", label: "Read the case files" },
  { href: "/#services", path: "/stack", label: "See the stack" },
  { href: "/contact", path: "/contact", label: "Tell me about the problem" },
] as const;

/**
 * The person behind the practice (A5 Narrative): a Mono-treated portrait that is revealed through a
 * wipe and drifts inside its frame (M25), the long positioning, the client promise and three ways on.
 * With no portrait the copy stands alone in a calm typographic column. A server component; the only
 * client pieces are the media and the parallax layer that already ship with the shell.
 * `compact` uses the short bio and drops the long one.
 */
const AboutDetailsSection = ({
  site,
  compact = false,
  id,
}: {
  site: TPublicSiteDto;
  compact?: boolean;
  id?: string;
}) => {
  const { positioning } = site;
  const profile = site.brand.profile ?? site.fallbacks.profile;
  const portrait = profile?.url ? profile : undefined;
  const statement = compact
    ? positioning.short_bio || positioning.long || positioning.canonical
    : positioning.long || positioning.canonical || positioning.short_bio;
  const bio =
    !compact && positioning.long_bio && positioning.long_bio !== statement
      ? positioning.long_bio
      : "";
  const lead = statement || positioning.long_bio || COPY.empty;
  const name = site.identity.public_name;

  return (
    <section
      {...(id ? { id } : {})}
      className="nr-about"
      aria-labelledby="about-practice-title"
    >
      <div className="nr-about-grid container" data-portrait={!!portrait}>
        {portrait ? (
          <figure className="nr-portrait ticks">
            <Reveal variant="wipe" className="nr-portrait-frame">
              <ParallaxLayer className="nr-portrait-layer" depth="medium">
                <OptimizedMedia
                  src={portrait.url}
                  alt={resolveMediaAlt(portrait, "Portrait")}
                  fallback="profile"
                  focalPoint={portrait.focal_point}
                  dominantColor={portrait.dominant_color}
                  blurDataUrl={portrait.blur_data_url}
                  className="object-cover"
                  sizes="(min-width: 1024px) 400px, 352px"
                />
              </ParallaxLayer>
            </Reveal>
            {name ? (
              <figcaption className="nr-portrait-caption t-eyebrow">
                {name}
              </figcaption>
            ) : null}
          </figure>
        ) : null}

        <Reveal className="nr-about-copy">
          <SectionHead
            eyebrow={COPY.eyebrow}
            title={COPY.title}
            titleId="about-practice-title"
            lead={lead}
          />
          {bio ? <p className="nr-bio">{bio}</p> : null}
          {positioning.client_promise ? (
            <div className="nr-promise">
              <p className="t-eyebrow text-fg-secondary">{COPY.promise}</p>
              <p>{positioning.client_promise}</p>
            </div>
          ) : null}
          <ul className="nr-links" role="list">
            {LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="nr-link">
                  <span
                    className="nr-link-path t-eyebrow text-fg-secondary"
                    aria-hidden="true"
                  >
                    {link.path}
                  </span>
                  <span className="nr-link-label">{link.label}</span>
                  <ArrowRight className="nr-link-arrow" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
};

export default AboutDetailsSection;
