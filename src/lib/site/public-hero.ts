import type {
  TPublicSiteDto,
  TPublicSiteMediaDto,
} from "@/app/api/site/site.type";
import { PILLAR_CONTRACT, type PillarKey } from "@/lib/content/pillars";
import {
  getPrimaryPublicCta,
  resolvePublicSiteLink,
  type TPublicShellLink,
} from "./public-shell";

export type TPublicHeroSlide = Readonly<{
  key: PillarKey;
  label: string;
  headline: string;
  summary: string;
  outcome?: string;
  capabilities: readonly string[];
  image?: TPublicSiteMediaDto;
  priority: boolean;
  cta: TPublicShellLink | null;
}>;

export type TPublicHero = Readonly<{
  eyebrow: string;
  slides: readonly [
    TPublicHeroSlide,
    TPublicHeroSlide,
    TPublicHeroSlide,
    TPublicHeroSlide,
    TPublicHeroSlide,
  ];
  primary_cta: TPublicShellLink | null;
}>;

export const buildPublicHero = (site: TPublicSiteDto): TPublicHero => {
  const slides = site.pillars.map((pillar, index) => ({
    key: pillar.key,
    label: pillar.label,
    headline: pillar.headline?.trim() || pillar.label,
    summary:
      pillar.summary?.trim() ||
      pillar.seo_summary?.trim() ||
      site.positioning.short_bio?.trim() ||
      "Published details are being prepared.",
    ...(pillar.client_outcome?.trim()
      ? { outcome: pillar.client_outcome.trim() }
      : {}),
    capabilities: pillar.capabilities.slice(0, 4),
    ...(pillar.visual ? { image: pillar.visual } : {}),
    priority: index === 0,
    cta: pillar.cta ? resolvePublicSiteLink(pillar.cta, site) : null,
  }));

  if (slides.length !== PILLAR_CONTRACT.length) {
    throw new Error(
      `The public hero requires exactly ${PILLAR_CONTRACT.length} Site pillars`
    );
  }

  return {
    eyebrow:
      site.positioning.mobile?.trim() ||
      site.positioning.compact?.trim() ||
      site.positioning.canonical?.trim() ||
      `${PILLAR_CONTRACT.length}-discipline product engineering`,
    slides: slides as unknown as TPublicHero["slides"],
    primary_cta: getPrimaryPublicCta(site),
  };
};
