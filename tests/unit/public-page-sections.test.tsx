// @vitest-environment jsdom

import { createEmergencyPublicSite } from "@/app/api/site/site.policy";
import type {
  TResolvedPageSection,
  TResolvedPublishedPagePayload,
} from "@/app/api/pages/page-resolver.type";
import { PublicPageSections } from "@/components/pages/public-page-sections";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/(common)/home-page/hero-section", () => ({
  default: () => <section>hero</section>,
}));
vi.mock("@/components/(common)/home-page/about-section", () => ({
  default: () => <section>introduction</section>,
}));
vi.mock("@/components/(common)/about-page/about-details-section", () => ({
  default: () => <section>about introduction</section>,
}));
vi.mock("@/components/(common)/home-page/projects-section", () => ({
  default: ({
    projects,
    fallbacks,
  }: {
    projects: Array<{ name: string }>;
    fallbacks?: {
      project_by_pillar?: { backend?: { url?: string } };
    };
  }) => (
    <section data-project-fallback={fallbacks?.project_by_pillar?.backend?.url}>
      projects:{projects.map(({ name }) => name).join(",")}
    </section>
  ),
}));
vi.mock("@/components/(common)/home-page/articles-section", () => ({
  default: ({
    articles,
    fallbacks,
  }: {
    articles: Array<{ name: string }>;
    fallbacks?: {
      article_by_pillar?: { system_design?: { url?: string } };
    };
  }) => (
    <section
      data-article-fallback={fallbacks?.article_by_pillar?.system_design?.url}
    >
      articles:{articles.map(({ name }) => name).join(",")}
    </section>
  ),
}));
vi.mock("@/components/sections/services-section", () => ({
  default: () => <section>services</section>,
}));
vi.mock("@/components/sections/skills-section", () => ({
  default: () => <section>skills</section>,
}));
vi.mock("@/components/sections/architecture-workflow-section", () => ({
  default: () => <section>architecture</section>,
}));
vi.mock("@/components/sections/contact-cta-section", () => ({
  default: () => <section>contact</section>,
}));
vi.mock("@/components/(common)/contact-page/contact-content-section", () => ({
  default: () => <section>contact form</section>,
}));
vi.mock("@/components/sections/evidence-sections", () => ({
  TimelineSection: () => <section>timeline</section>,
  CredentialsSection: () => <section>credentials</section>,
  FAQSection: () => <section>faqs</section>,
  TestimonialsSection: () => <section>testimonials</section>,
}));
const section = (
  key: string,
  kind: TResolvedPageSection["kind"],
  items: readonly Readonly<Record<string, unknown>>[] = []
): TResolvedPageSection => ({
  key,
  kind,
  layout: "test",
  source_mode: "automatic",
  items,
  health: {
    status: items.length ? "healthy" : "empty",
    requested_records: items.length,
    resolved_records: items.length,
    omitted_records: 0,
    reason_codes: items.length ? [] : ["source_empty"],
  },
});

describe("PublicPageSections", () => {
  afterEach(cleanup);

  it("renders primary content in the exact published Page order", () => {
    const site = createEmergencyPublicSite();
    site.fallbacks.project_by_pillar.backend = {
      id: "507f1f77bcf86cd799439031",
      url: "https://cdn.example.com/project-backend.webp",
    };
    site.fallbacks.article_by_pillar.system_design = {
      id: "507f1f77bcf86cd799439032",
      url: "https://cdn.example.com/article-system-design.webp",
    };
    const payload: TResolvedPublishedPagePayload = {
      page: {
        route_key: "home",
        route_path: "/",
        locale: "en",
        schema_version: 1,
        contract_version: 1,
        published_revision: 3,
        published_at: "2026-07-15T00:00:00.000Z",
        seo: { noindex: false },
      },
      site,
      sections: [
        section("projects", "project-collection", [
          { _id: "project-1", name: "First case study" },
        ]),
        section("hero", "site-hero"),
        section("architecture", "architecture-workflow"),
        section("articles", "article-collection", [
          { _id: "article-1", name: "First insight" },
        ]),
        section("contact", "contact-cta"),
      ],
      health: {
        status: "healthy",
        total_sections: 4,
        healthy_sections: 4,
        degraded_sections: 0,
        resolved_records: 2,
        omitted_records: 0,
      },
    };

    const { container } = render(<PublicPageSections payload={payload} />);
    expect(container.textContent).toBe(
      "projects:First case studyheroarchitecturearticles:First insightcontact"
    );
    expect(container.querySelector("[data-project-fallback]")).toHaveAttribute(
      "data-project-fallback",
      "https://cdn.example.com/project-backend.webp"
    );
    expect(container.querySelector("[data-article-fallback]")).toHaveAttribute(
      "data-article-fallback",
      "https://cdn.example.com/article-system-design.webp"
    );
  });
});
