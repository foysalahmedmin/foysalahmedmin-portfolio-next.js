import { createEmergencyPublicSite } from "@/app/api/site/site.policy";
import { resolveMediaAlt } from "@/lib/media/presentation";
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
        focal_point: { x: 0.7, y: 0.4 },
        dominant_color: "#102a43",
        blur_data_url: "data:image/webp;base64,UklGRg==",
      },
    };

    const hero = buildPublicHero(site);
    expect(hero.eyebrow).toBe("One positioning source");
    expect(hero.slides[0]).toMatchObject({
      headline: "Accessible product interfaces",
      summary: "A published summary",
      outcome: "A published outcome",
      image: expect.objectContaining({
        url: "https://res.cloudinary.com/demo/image/upload/frontend.png",
        focal_point: { x: 0.7, y: 0.4 },
        dominant_color: "#102a43",
      }),
      cta: { href: "/projects?pillar=frontend" },
    });
    expect(resolveMediaAlt(hero.slides[0].image)).toBe(
      "Abstract interface layers"
    );
  });

  it("uses File purpose as the sole decorative-alt authority", () => {
    const site = createEmergencyPublicSite();
    site.pillars[0] = {
      ...site.pillars[0],
      visual: {
        id: "507f1f77bcf86cd799439011",
        url: "https://cdn.example.com/frontend.webp",
        alt_text: "Contradictory legacy copy",
        is_decorative: true,
      },
    };

    const hero = buildPublicHero(site);
    expect(resolveMediaAlt(hero.slides[0].image)).toBe("");
  });
});
