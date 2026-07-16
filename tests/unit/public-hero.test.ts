import { createEmergencyPublicSite } from "@/app/api/site/site.policy";
import { buildPublicHero } from "@/lib/site/public-hero";
import { describe, expect, it } from "vitest";

describe("public hero projection", () => {
  it("always follows the exact canonical five-pillar order", () => {
    const hero = buildPublicHero(createEmergencyPublicSite());
    expect(hero.slides.map((slide) => slide.key)).toEqual([
      "frontend",
      "backend",
      "ai_automation",
      "system_design",
      "full_stack",
    ]);
    expect(hero.slides.filter((slide) => slide.priority)).toHaveLength(1);
  });

  it("uses published Site content, visual metadata, and pillar CTA", () => {
    const site = createEmergencyPublicSite();
    site.content_source = "published";
    site.positioning.mobile = "One positioning source";
    site.pillars[0] = {
      ...site.pillars[0],
      headline: "Accessible product interfaces",
      summary: "A published summary",
      client_outcome: "A published outcome",
      capabilities: ["Design systems"],
      cta: {
        key: "frontend-work",
        label: "See frontend work",
        kind: "internal",
        href: "/projects?pillar=frontend",
        enabled: true,
      },
      visual: {
        id: "507f1f77bcf86cd799439011",
        url: "https://res.cloudinary.com/demo/image/upload/frontend.png",
        alt_text: "Abstract interface layers",
      },
    };

    const hero = buildPublicHero(site);
    expect(hero.eyebrow).toBe("One positioning source");
    expect(hero.slides[0]).toMatchObject({
      headline: "Accessible product interfaces",
      summary: "A published summary",
      outcome: "A published outcome",
      image_alt: "Abstract interface layers",
      cta: { href: "/projects?pillar=frontend" },
    });
  });
});
