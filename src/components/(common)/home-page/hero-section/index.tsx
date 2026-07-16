"use client";

import type { TPublicSiteDto } from "@/app/api/site/site.type";
import ParallaxLayer from "@/components/motion/parallax-layer";
import { Button } from "@/components/ui/button";
import OptimizedMedia from "@/components/ui/optimized-media";
import { useAutoplayController } from "@/hooks/ui/use-autoplay-controller";
import { buildPublicHero } from "@/lib/site/public-hero";
import type { TPublicShellLink } from "@/lib/site/public-shell";
import { resolveMediaAlt } from "@/lib/media/presentation";
import { cn } from "@/lib/utils";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Pause,
  Play,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useState, type ComponentProps } from "react";

type HeroLinkProps = { link: TPublicShellLink } & Omit<
  ComponentProps<"a">,
  "href" | "target" | "rel"
>;

const HeroLink = ({ link, ...props }: HeroLinkProps) => {
  const content = (
    <>
      <span>{link.label}</span>
      {link.external ? (
        <ArrowUpRight className="size-4" aria-hidden="true" />
      ) : (
        <ArrowRight className="size-4" aria-hidden="true" />
      )}
    </>
  );
  return link.external ? (
    <a
      {...props}
      href={link.href}
      target={link.href.startsWith("https:") ? "_blank" : undefined}
      rel={link.href.startsWith("https:") ? "noopener noreferrer" : undefined}
    >
      {content}
    </a>
  ) : (
    <Link {...props} href={link.href}>
      {content}
    </Link>
  );
};

const HeroSection = ({ site }: { site: TPublicSiteDto }) => {
  const hero = useMemo(() => buildPublicHero(site), [site]);
  const slides = hero.slides;
  const [selectedIndex, setSelectedIndex] = useState(0);
  const handleSlideChange = useCallback((index: number) => {
    setSelectedIndex(index);
  }, []);
  const autoplay = useAutoplayController({
    itemCount: slides.length,
    activeIndex: selectedIndex,
    onChange: handleSlideChange,
    intervalMs: 7_000,
    label: (index) => `${slides[index]?.label}, slide ${index + 1} of 5`,
  });
  const activeSlide = slides[selectedIndex];
  const secondaryCta =
    activeSlide.cta?.href === hero.primary_cta?.href ? null : activeSlide.cta;

  return (
    <section
      {...autoplay.rootProps}
      id="home"
      aria-roledescription="carousel"
      aria-label="Five engineering capabilities"
      className="bg-background text-foreground relative flex min-h-[43rem] w-full max-w-screen flex-col overflow-hidden py-24 md:py-32 lg:min-h-[52rem]"
    >
      <div className="absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
        <ParallaxLayer
          depth="medium"
          pointerStrength={0.25}
          className="absolute inset-0"
        >
          <div className="bg-primary/15 absolute top-[8%] -left-[18%] size-[32rem] rounded-full blur-[120px]" />
          <div className="bg-secondary/20 absolute -right-[15%] bottom-[5%] size-[30rem] rounded-full blur-[120px]" />
        </ParallaxLayer>
        <div className="absolute inset-0">
          <OptimizedMedia
            key={activeSlide.key}
            src={activeSlide.image?.url}
            alt={resolveMediaAlt(activeSlide.image)}
            fallback="hero"
            pillar={activeSlide.key}
            focalPoint={activeSlide.image?.focal_point}
            dominantColor={activeSlide.image?.dominant_color}
            blurDataUrl={activeSlide.image?.blur_data_url}
            sizes="100vw"
            priority={activeSlide.priority}
            className="scale-[1.03] object-cover opacity-45 saturate-75 transition-[opacity,transform] duration-[var(--motion-slow)] motion-reduce:transform-none motion-reduce:transition-none"
          />
          <div className="from-background via-background/75 to-background/95 absolute inset-0 bg-gradient-to-r" />
          <div className="from-background/10 via-background/50 to-background absolute inset-0 bg-gradient-to-b" />
          <div className="hero-grid-mask absolute inset-0 opacity-35" />
        </div>
      </div>

      <div className="relative z-10 container mx-auto flex flex-1 items-center px-6">
        <div className="grid w-full gap-12 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-end">
          <div className="max-w-5xl">
            <div className="border-primary/20 bg-background/65 text-primary inline-flex min-h-9 items-center gap-2 rounded-full border px-4 py-2 text-[0.68rem] font-black tracking-[0.18em] uppercase backdrop-blur-xl">
              <Sparkles className="size-4" aria-hidden="true" />
              <span>{hero.eyebrow}</span>
            </div>

            <p className="text-muted-foreground mt-8 text-sm font-black tracking-[0.2em] uppercase">
              {String(selectedIndex + 1).padStart(2, "0")} / 05 ·{" "}
              {activeSlide.label}
            </p>
            <h1
              key={`${activeSlide.key}-headline`}
              className="type-display mt-4 max-w-5xl text-balance"
            >
              {activeSlide.headline}
            </h1>
            <p
              key={`${activeSlide.key}-summary`}
              className="type-lead mt-6 max-w-3xl text-balance"
            >
              {activeSlide.summary}
            </p>
            {activeSlide.outcome && (
              <p className="border-primary text-foreground mt-6 max-w-2xl border-l-2 pl-4 text-sm leading-7 font-semibold">
                {activeSlide.outcome}
              </p>
            )}

            {activeSlide.capabilities.length > 0 && (
              <ul
                className="mt-7 flex flex-wrap gap-2"
                aria-label={`${activeSlide.label} capabilities`}
              >
                {activeSlide.capabilities.map((capability) => (
                  <li
                    key={capability}
                    className="border-border bg-background/70 rounded-full border px-3 py-1.5 text-xs font-semibold backdrop-blur"
                  >
                    {capability}
                  </li>
                ))}
              </ul>
            )}

            {(hero.primary_cta || secondaryCta) && (
              <div className="mt-9 flex flex-wrap items-center gap-3">
                {hero.primary_cta && (
                  <Button asChild>
                    <HeroLink link={hero.primary_cta} />
                  </Button>
                )}
                {secondaryCta && (
                  <Button variant="outline" asChild>
                    <HeroLink link={secondaryCta} />
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="border-border bg-background/70 hidden rounded-3xl border p-5 backdrop-blur-xl lg:block">
            <p className="text-muted-foreground text-xs font-bold tracking-[0.16em] uppercase">
              Capability map
            </p>
            <ol className="mt-4 space-y-1" aria-label="Select capability slide">
              {slides.map((slide, index) => (
                <li key={slide.key}>
                  <button
                    type="button"
                    onClick={() => autoplay.goTo(index)}
                    className={cn(
                      "focus-visible:ring-primary flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-bold transition-colors focus-visible:ring-2 focus-visible:outline-none",
                      index === selectedIndex
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                    aria-current={index === selectedIndex ? "true" : undefined}
                  >
                    <span className="text-xs tabular-nums">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span>{slide.label}</span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      <div className="relative z-10 container mx-auto mt-10 flex items-center justify-between gap-5 px-6">
        <Link
          href="#about"
          className="text-muted-foreground focus-visible:ring-primary inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-xs font-black tracking-[0.16em] uppercase focus-visible:ring-2 focus-visible:outline-none"
        >
          Explore the practice
          <ArrowDown className="size-4" aria-hidden="true" />
        </Link>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            shape="icon"
            onClick={autoplay.previous}
            aria-label="Previous capability"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="outline"
            shape="icon"
            onClick={autoplay.toggleUserPause}
            aria-label={
              autoplay.userPaused
                ? "Play capability slides"
                : "Pause capability slides"
            }
            aria-pressed={autoplay.userPaused}
          >
            {autoplay.userPaused ? (
              <Play className="size-4" aria-hidden="true" />
            ) : (
              <Pause className="size-4" aria-hidden="true" />
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            shape="icon"
            onClick={autoplay.next}
            aria-label="Next capability"
          >
            <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      <span className="sr-only" role="status" aria-live="polite">
        {autoplay.manualAnnouncement}
      </span>
    </section>
  );
};

export default HeroSection;
