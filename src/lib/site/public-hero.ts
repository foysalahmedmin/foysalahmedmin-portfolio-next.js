import type { TPublicSiteDto } from "@/app/api/site/site.type";
import { PILLAR_CONTRACT, type PillarKey } from "@/lib/content/pillars";
import { getPrimaryPublicCta, type TPublicShellLink } from "./public-shell";

/**
 * Hero copy that is not yet Site data (docs plan 5.4, owner decision D-01: the kicker stays as it was at
 * the owner's request). Phase 4 moves these into the Site document with the rest of the copy deck; until
 * then they live here, in one place, and the three roles read everything else from `Site.pillars`.
 */
export const HERO_COPY = {
  kicker: "Business problems in. Reliable systems out.",
  roleEyebrow: "I take this off your plate",
  cue: "Scroll",
  primary: "Describe your problem",
  secondary: "See how I work",
} as const;

export type TPublicHeroRole = Readonly<{
  key: PillarKey;
  label: string;
  /** The label broken into at most two display lines: the last word drops to the second line. */
  lines: readonly string[];
  headline: string;
  capabilities: readonly string[];
}>;

export type TPublicHero = Readonly<{
  kicker: string;
  roles: readonly TPublicHeroRole[];
  primary: TPublicShellLink;
  secondary: TPublicShellLink;
}>;

export const splitRoleTitle = (label: string): readonly string[] => {
  const words = label.trim().split(/\s+/).filter(Boolean);
  if (words.length < 2) return [label.trim()];
  const last = words.pop()!;
  return [words.join(" "), last];
};

export const buildPublicHero = (
  site: TPublicSiteDto,
  options: Readonly<{ processHref?: string }> = {}
): TPublicHero => {
  const roles: TPublicHeroRole[] = site.pillars.map((pillar) => ({
    key: pillar.key,
    label: pillar.label,
    lines: splitRoleTitle(pillar.label),
    headline: pillar.headline?.trim() || pillar.label,
    capabilities: pillar.capabilities.slice(0, 3),
  }));

  if (roles.length !== PILLAR_CONTRACT.length) {
    throw new Error(
      `The public hero requires exactly ${PILLAR_CONTRACT.length} Site pillars`
    );
  }

  const configured = getPrimaryPublicCta(site);
  return {
    kicker: HERO_COPY.kicker,
    roles,
    // The configured call to action decides where it goes; the hero decides what it says
    primary: {
      key: configured?.key ?? "hero-primary",
      label: HERO_COPY.primary,
      href: configured?.href ?? "/contact",
      external: configured?.external ?? false,
    },
    secondary: {
      key: "hero-secondary",
      label: HERO_COPY.secondary,
      href: options.processHref ?? "/about",
      external: false,
    },
  };
};
