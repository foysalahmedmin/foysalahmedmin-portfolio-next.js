import type { TPublicSiteDto } from "@/app/api/site/site.type";
import { Magnetic } from "@/components/motion/magnetic";
import ParallaxLayer from "@/components/motion/parallax-layer";
import { PinBeat } from "@/components/motion/pin-scene";
import { HeroCanvas } from "@/components/three/hero-canvas";
import { Button } from "@/components/ui/button";
import { RollLabel } from "@/components/ui/roll-label";
import { buildPublicHero, HERO_COPY } from "@/lib/site/public-hero";
import type { TPublicShellLink } from "@/lib/site/public-shell";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";
import { HeroScene } from "./hero-scene";

const POSTER_THEMES = ["dark", "light"] as const;

const posterSource = (theme: string, frame: string, format: string) =>
  `/images/hero/maquette-${theme}-${frame}.${format}`;

const HeroLink = ({ link }: { link: TPublicShellLink }) => {
  const content = (
    <>
      <RollLabel>{link.label}</RollLabel>
      {link.external ? (
        <ArrowUpRight className="size-4" aria-hidden="true" />
      ) : (
        <ArrowRight className="size-4" aria-hidden="true" />
      )}
    </>
  );
  return link.external ? (
    <a
      href={link.href}
      target={link.href.startsWith("https:") ? "_blank" : undefined}
      rel={link.href.startsWith("https:") ? "noopener noreferrer" : undefined}
    >
      {content}
    </a>
  ) : (
    <Link href={link.href}>{content}</Link>
  );
};

/**
 * Chapter 0, "ingress" (docs plan 4.1): the three roles as one scroll story. Everything is in the HTML,
 * in reading order, and visible without JavaScript: the kicker (the page h1), the primary actions, then
 * each role with its plain line and its three capabilities. With the engine the section pins and the
 * roles change as you scroll; without it (reduced motion, touch, no JavaScript) they simply stack over
 * the still poster. The poster is a server-rendered picture of the same scene the canvas draws, so the
 * canvas can cross-fade over it with no shift.
 */
export default function SiteHeroSection({
  site,
  processHref,
  scene3d = true,
}: {
  site: TPublicSiteDto;
  /** Where "See how I work" goes; the pin never traps anyone, because this jumps past it. */
  processHref?: string;
  /** Result of the kill switches (PUBLIC_3D_ENABLED and the site's motion default). */
  scene3d?: boolean;
}) {
  const hero = buildPublicHero(site, processHref ? { processHref } : {});
  const roleCount = hero.roles.length;

  return (
    <HeroScene>
      <div className="hero-backdrop" aria-hidden="true">
        <ParallaxLayer
          depth="subtle"
          pointerStrength={0.25}
          className="hero-grid-layer"
        >
          <div className="hero-grid" />
        </ParallaxLayer>

        {POSTER_THEMES.map((theme) => (
          <picture key={theme} className={`hero-poster hero-poster--${theme}`}>
            <source
              media="(orientation: portrait)"
              type="image/avif"
              srcSet={posterSource(theme, "portrait", "avif")}
            />
            <source
              media="(orientation: portrait)"
              type="image/webp"
              srcSet={posterSource(theme, "portrait", "webp")}
            />
            <source
              type="image/avif"
              srcSet={posterSource(theme, "landscape", "avif")}
            />
            {/* A static, pre-rendered poster: the optimiser would only re-encode it */}
            <img
              src={posterSource(theme, "landscape", "webp")}
              alt=""
              width={1920}
              height={1080}
              decoding="async"
              loading="lazy"
            />
          </picture>
        ))}

        <HeroCanvas enabled={scene3d} />
        <div className="hero-scrim" />
      </div>

      <div className="hero-copy container">
        <h1 className="hero-kicker t-eyebrow">{hero.kicker}</h1>

        <div className="hero-ctas">
          <Magnetic>
            <Button asChild>
              <HeroLink link={hero.primary} />
            </Button>
          </Magnetic>
          <Button variant="outline" asChild>
            <HeroLink link={hero.secondary} />
          </Button>
        </div>

        <div className="hero-beats">
          {hero.roles.map((role, index) => (
            <PinBeat
              key={role.key}
              index={index}
              className="hero-beat"
              style={
                {
                  "--i": index,
                  "--first": index === 0 ? 1 : 0,
                  "--last": index === roleCount - 1 ? 1 : 0,
                } as CSSProperties
              }
            >
              <p className="hero-eyebrow t-eyebrow">{HERO_COPY.roleEyebrow}</p>
              <h2 className="hero-title">
                {role.lines.map((line, lineIndex) => (
                  <span
                    key={line}
                    className="hero-line"
                    style={{ "--k": lineIndex } as CSSProperties}
                  >
                    <span>{line}</span>{" "}
                  </span>
                ))}
              </h2>
              <p className="hero-lead t-lead">{role.headline}</p>
              {role.capabilities.length > 0 && (
                <ul className="hero-caps" role="list">
                  {role.capabilities.map((capability, capIndex) => (
                    <li
                      key={capability}
                      style={{ "--c": capIndex } as CSSProperties}
                    >
                      {capability}
                    </li>
                  ))}
                </ul>
              )}
            </PinBeat>
          ))}
        </div>
      </div>

      <div className="hero-cue t-eyebrow" aria-hidden="true">
        <span>{HERO_COPY.cue}</span>
        <i />
      </div>
      <div className="hero-rolebar t-eyebrow" aria-hidden="true">
        {hero.roles.map((role) => (
          <span key={role.key}>{role.label}</span>
        ))}
        <div className="hero-track">
          <div className="hero-fill" />
        </div>
      </div>
    </HeroScene>
  );
}
