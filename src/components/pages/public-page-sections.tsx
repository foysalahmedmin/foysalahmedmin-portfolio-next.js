import type { TPublicCredentialDto } from "@/app/api/credentials/credential.type";
import type { TPublicFAQDto } from "@/app/api/faqs/faq.type";
import type { TResolvedPublishedPagePayload } from "@/app/api/pages/page-resolver.type";
import type { TPublicServiceDto } from "@/app/api/services/service.type";
import type { TPublicTestimonialDto } from "@/app/api/testimonials/testimonial.type";
import type { TPublicTimelineEntryDto } from "@/app/api/timeline/timeline-entry.type";
import AboutDetailsSection from "@/components/(common)/about-page/about-details-section";
import ContactContentSection from "@/components/(common)/contact-page/contact-content-section";
import AboutSection from "@/components/(common)/home-page/about-section";
import ArticlesSection from "@/components/(common)/home-page/articles-section";
import HeroSection from "@/components/(common)/home-page/hero-section";
import ProjectsSection from "@/components/(common)/home-page/projects-section";
import ArchitectureWorkflowSection from "@/components/sections/architecture-workflow-section";
import ContactCTASection from "@/components/sections/contact-cta-section";
import MetricsStripSection from "@/components/sections/metrics-strip-section";
import PillarShowcaseSection from "@/components/sections/pillar-showcase-section";
import ProcessStepsSection from "@/components/sections/process-steps-section";
import {
  CredentialsSection,
  FAQSection,
  TestimonialsSection,
  TimelineSection,
} from "@/components/sections/evidence-sections";
import ServicesSection from "@/components/sections/services-section";
import SkillsSection, {
  type TPublicSkillGroupWithSkills,
} from "@/components/sections/skills-section";
import type { TArticleListItem } from "@/types/article.type";
import type { TProjectListItem } from "@/types/project.type";
import { Fragment, type ReactNode } from "react";

type Props = Readonly<{
  payload: TResolvedPublishedPagePayload;
}>;

const asItems = <T,>(items: readonly Readonly<Record<string, unknown>>[]) =>
  items as unknown as readonly T[];

const asSkillGroups = (
  items: readonly Readonly<Record<string, unknown>>[]
): readonly TPublicSkillGroupWithSkills[] =>
  items.flatMap((item) =>
    Array.isArray(item.skills)
      ? [
          {
            ...(item as unknown as TPublicSkillGroupWithSkills),
            skills: item.skills as TPublicSkillGroupWithSkills["skills"],
          },
        ]
      : []
  );

export const PublicPageSections = ({ payload }: Props) => (
  <>
    {payload.sections.map((section) => {
      const unavailable = section.health.status === "unavailable";
      let content: ReactNode = null;

      switch (section.kind) {
        case "site-hero":
          content = <HeroSection site={payload.site} />;
          break;
        case "site-introduction":
          content =
            payload.page.route_key === "about" ? (
              <AboutDetailsSection site={payload.site} />
            ) : (
              <AboutSection site={payload.site} />
            );
          break;
        case "pillar-showcase":
          content = (
            <PillarShowcaseSection
              pillars={payload.site.pillars}
              heading={section.heading}
              layout={section.layout}
            />
          );
          break;
        case "architecture-workflow":
          content = (
            <ArchitectureWorkflowSection
              site={payload.site}
              heading={section.heading}
              layout={section.layout}
            />
          );
          break;
        case "process-steps":
          content = (
            <ProcessStepsSection
              steps={payload.site.process}
              heading={section.heading}
            />
          );
          break;
        case "metrics-strip":
          content = payload.site.experience.feature_flags.show_metrics ? (
            <MetricsStripSection
              metrics={payload.site.metrics}
              heading={section.heading}
            />
          ) : null;
          break;
        case "service-collection":
          content = (
            <ServicesSection
              pillars={payload.site.pillars}
              services={asItems<TPublicServiceDto>(section.items)}
              heading={section.heading}
              layout={section.layout}
            />
          );
          break;
        case "skill-group-collection":
          content = (
            <SkillsSection
              pillars={payload.site.pillars}
              groups={asSkillGroups(section.items)}
              heading={section.heading}
              layout={section.layout}
            />
          );
          break;
        case "project-collection":
          content = (
            <ProjectsSection
              projects={asItems<TProjectListItem>(section.items)}
              fallbacks={payload.site.fallbacks}
              unavailable={unavailable}
              heading={section.heading}
            />
          );
          break;
        case "article-collection":
          content = (
            <ArticlesSection
              articles={asItems<TArticleListItem>(section.items)}
              fallbacks={payload.site.fallbacks}
              unavailable={unavailable}
              heading={section.heading}
            />
          );
          break;
        case "timeline":
          content = (
            <TimelineSection
              entries={asItems<TPublicTimelineEntryDto>(section.items)}
              unavailable={unavailable}
              heading={section.heading}
            />
          );
          break;
        case "credential-collection":
          content = (
            <CredentialsSection
              credentials={asItems<TPublicCredentialDto>(section.items)}
              unavailable={unavailable}
              heading={section.heading}
            />
          );
          break;
        case "faq-list":
          content = (
            <FAQSection
              faqs={asItems<TPublicFAQDto>(section.items)}
              unavailable={unavailable}
              heading={section.heading}
            />
          );
          break;
        case "testimonial-collection":
          content = (
            <TestimonialsSection
              testimonials={asItems<TPublicTestimonialDto>(section.items)}
              unavailable={unavailable}
              heading={section.heading}
            />
          );
          break;
        case "contact-form":
          content = <ContactContentSection site={payload.site} />;
          break;
        case "contact-cta":
          content = <ContactCTASection site={payload.site} />;
          break;
        default:
          content = null;
      }

      return content ? <Fragment key={section.key}>{content}</Fragment> : null;
    })}
  </>
);
