import { createEmergencyPublicSite } from "@/app/api/site/site.policy";
import { PILLAR_CONTRACT } from "@/lib/content/pillars";
import {
  HERO_COPY,
  buildPublicHero,
  splitRoleTitle,
} from "@/lib/site/public-hero";
import { describe, expect, it } from "vitest";

describe("public hero projection", () => {
  it("is one beat per role, in the canonical order", () => {
    const hero = buildPublicHero(createEmergencyPublicSite());
    expect(hero.roles.map((role) => role.key)).toEqual(
      PILLAR_CONTRACT.map(({ key }) => key)
    );
    expect(hero.roles).toHaveLength(3);
    expect(hero.kicker).toBe(HERO_COPY.kicker);
  });

  it("reads each role from Site.pillars: label, headline and the first three capabilities", () => {
    const site = createEmergencyPublicSite();
    site.pillars[0] = {
      ...site.pillars[0],
      headline: "Get the design right before it gets expensive",
      capabilities: ["One", "Two", "Three", "Four"],
    };
    const [first] = buildPublicHero(site).roles;
    expect(first).toMatchObject({
      label: site.pillars[0].label,
      headline: "Get the design right before it gets expensive",
      capabilities: ["One", "Two", "Three"],
    });
  });

  it("falls back to the label when a role has no headline", () => {
    const site = createEmergencyPublicSite();
    site.pillars[1] = { ...site.pillars[1], headline: "  " };
    expect(buildPublicHero(site).roles[1]!.headline).toBe(
      site.pillars[1].label
    );
  });

  it("sends the primary action where the site's call to action goes, with the hero's words", () => {
    const site = createEmergencyPublicSite();
    site.primary_ctas = [
      {
        key: "start",
        label: "Contact me",
        kind: "internal",
        href: "/contact?topic=hero",
        enabled: true,
      },
    ];
    const hero = buildPublicHero(site, { processHref: "#working-process" });
    expect(hero.primary).toMatchObject({
      label: HERO_COPY.primary,
      href: "/contact?topic=hero",
    });
    expect(hero.secondary).toMatchObject({
      label: HERO_COPY.secondary,
      href: "#working-process",
      external: false,
    });
  });

  it("still has a primary action when the site configures none", () => {
    const site = createEmergencyPublicSite();
    site.primary_ctas = [];
    expect(buildPublicHero(site).primary.href).toBe("/contact");
    expect(buildPublicHero(site).secondary.href).toBe("/about");
  });

  it("refuses a site that does not have exactly the three roles", () => {
    const site = createEmergencyPublicSite();
    site.pillars = site.pillars.slice(0, 2);
    expect(() => buildPublicHero(site)).toThrow(/exactly 3/);
  });
});

describe("splitRoleTitle", () => {
  it("drops the last word to the second line", () => {
    expect(splitRoleTitle("System Architect")).toEqual(["System", "Architect"]);
    expect(splitRoleTitle("Software Developer")).toEqual([
      "Software",
      "Developer",
    ]);
    expect(splitRoleTitle("AI Automation Developer")).toEqual([
      "AI Automation",
      "Developer",
    ]);
  });

  it("keeps a single word on one line and trims", () => {
    expect(splitRoleTitle("  Architect ")).toEqual(["Architect"]);
  });
});
