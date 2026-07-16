import { createNeutralSiteDraft } from "@/app/api/site/site.policy";
import { siteDraftSnapshotSchema } from "@/app/api/site/site.validation";
import { PILLAR_CONTRACT } from "@/lib/content/pillars";

export const buildPublishableSiteDraft = () => {
  const neutral = createNeutralSiteDraft();
  return siteDraftSnapshotSchema.parse({
    ...neutral,
    identity: {
      public_name: "Portfolio Owner",
      short_name: "Portfolio",
      canonical_url: "https://portfolio.example.com",
      locale: "en",
      timezone: "Asia/Dhaka",
    },
    positioning: {
      canonical: PILLAR_CONTRACT.map(({ label }) => label).join(" · "),
      compact: "Five connected engineering capabilities",
      mobile: "Full-stack systems and automation",
      long: "End-to-end product engineering across five connected capability pillars.",
      short_bio: "A test-only portfolio identity fixture.",
      long_bio:
        "A deterministic test fixture for the revisioned Site publishing contract.",
      client_promise:
        "Clear decisions, secure delivery, and measurable outcomes.",
    },
    pillars: neutral.pillars.map((pillar) => ({
      ...pillar,
      enabled: true,
      headline: `${pillar.label} capability`,
      summary: `${pillar.label} delivery summary for the Site contract fixture.`,
      client_outcome: `${pillar.label} outcomes connected to product goals.`,
      capabilities: [`${pillar.key}-capability`],
      technologies: [`${pillar.key}-technology`],
      cta: {
        key: `${pillar.key}-cta`,
        label: `Explore ${pillar.label}`,
        kind: "internal" as const,
        href: "/projects",
        enabled: true,
      },
      seo_summary: `${pillar.label} portfolio capability and outcomes.`,
    })),
    navigation: {
      header: [
        {
          key: "projects",
          label: "Projects",
          kind: "internal" as const,
          href: "/projects",
          enabled: true,
        },
      ],
      footer: [],
      legal: [],
    },
    seo: {
      default_title: "Portfolio",
      title_template: "%s | Portfolio",
      default_description:
        "A professional engineering portfolio spanning five capability pillars.",
      canonical_url: "https://portfolio.example.com",
      allow_indexing: true,
    },
  });
};
