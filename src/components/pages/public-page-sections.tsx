import type { TPublicCredentialDto } from "@/app/api/credentials/credential.type";
import type { TPublicFAQDto } from "@/app/api/faqs/faq.type";
import type {
  TResolvedPageSection,
  TResolvedPublishedPagePayload,
} from "@/app/api/pages/page-resolver.type";
import type { TPageSectionKind } from "@/app/api/pages/page.type";
import type { TPublicServiceDto } from "@/app/api/services/service.type";
import type { TPublicTestimonialDto } from "@/app/api/testimonials/testimonial.type";
import type { TPublicTimelineEntryDto } from "@/app/api/timeline/timeline-entry.type";
import type { TPublicLegalDocumentDto } from "@/app/api/legal-documents/legal-document.type";
import AboutDetailsSection from "@/components/(common)/about-page/about-details-section";
import {
  LegalDocumentUnavailable,
  LegalDocumentView,
} from "@/components/content/legal-document-view";
import ContactContentSection from "@/components/(common)/contact-page/contact-content-section";
import AboutSection from "@/components/(common)/home-page/about-section";
import ArticlesSection from "@/components/(common)/home-page/articles-section";
import CaseStudiesSection from "@/components/(common)/home-page/case-studies-section";
import SiteHeroSection from "@/components/sections/site-hero-section";
import { isScene3dEnabled } from "@/lib/motion/scene";
import ProjectsSection from "@/components/(common)/home-page/projects-section";
import VideosSection from "@/components/(common)/home-page/videos-section";
import ArchitectureWorkflowSection from "@/components/sections/architecture-workflow-section";
import ContactCTASection from "@/components/sections/contact-cta-section";
import GithubProfileSection from "@/components/sections/github-profile-section/live";
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
import type { TCaseStudyListItem } from "@/types/case-study.type";
import type { TVideoListItem } from "@/types/video.type";
import type { TProjectListItem } from "@/types/project.type";
import { Fragment, type ReactNode } from "react";

type Props = Readonly<{
  payload: TResolvedPublishedPagePayload;
  sectionOverrides?: TPublicPageSectionOverrides;
}>;

export type TPublicPageSectionOverride = (
  input: Readonly<{
    payload: TResolvedPublishedPagePayload;
    section: TResolvedPageSection;
  }>
) => ReactNode;

export type TPublicPageSectionOverrides = Readonly<
  Partial<Record<TPageSectionKind, TPublicPageSectionOverride>>
>;

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

/**
 * The open-code section is the last chapter of a page, whatever order the page document lists it in. The
 * contact band still closes the page (every page ends on it before the footer), so it sits just above it.
 */
export const withGithubLast = (
  sections: TResolvedPublishedPagePayload["sections"]
) => {
  const github = sections.filter(
    (section) => section.kind === "github-profile"
  );
  const rest = sections.filter((section) => section.kind !== "github-profile");
  if (github.length === 0) return rest;
  const closing = rest.reduce(
    (found, section, index) => (section.kind === "contact-cta" ? index : found),
    -1
  );
  return closing === -1
    ? [...rest, ...github]
    : [...rest.slice(0, closing), ...github, ...rest.slice(closing)];
};

/**
 * Evidence sections with nothing to show are left out of a public page: "no testimonials are published
 * yet" is a note for the owner (the admin has it), not something a visitor should read. A section whose
 * data could not be read keeps its notice.
 */
const EMPTY_HIDDEN_KINDS: ReadonlySet<TPageSectionKind> = new Set([
  "timeline",
  "credential-collection",
  "testimonial-collection",
  "faq-list",
]);

export const PublicPageSections = ({ payload, sectionOverrides }: Props) => (
  <>
    {withGithubLast(payload.sections).map((section) => {
      const unavailable = section.health.status === "unavailable";
      let content: ReactNode = null;
      const override = sectionOverrides?.[section.kind];

      if (
        !override &&
        !unavailable &&
        EMPTY_HIDDEN_KINDS.has(section.kind) &&
        section.items.length === 0
      ) {
        return null;
      }

      if (override) {
        content = override({ payload, section });
      } else
        switch (section.kind) {
          case "site-hero":
            content = (
              <SiteHeroSection
                site={payload.site}
                scene3d={isScene3dEnabled(
                  { PUBLIC_3D_ENABLED: process.env.PUBLIC_3D_ENABLED },
                  payload.site.experience.motion
                )}
                {...(payload.sections.some(
                  (item) => item.kind === "process-steps"
                )
                  ? { processHref: "#working-process" }
                  : {})}
              />
            );
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
                layout={section.layout}
              />
            );
            break;
          case "github-profile":
            content = (
              <GithubProfileSection
                site={payload.site}
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
          case "case-study-collection":
            content = (
              <CaseStudiesSection
                caseStudies={asItems<TCaseStudyListItem>(section.items)}
                fallbacks={payload.site.fallbacks}
                unavailable={unavailable}
                heading={section.heading}
              />
            );
            break;
          case "video-collection": {
            const videos = asItems<TVideoListItem>(section.items);
            const shape = section.source_filter?.aspect_ratio;
            // One section per shape keeps landscape films and reels in
            // separate frames; a section with no shape filter shows both.
            content =
              shape === "landscape" || shape === "reel" ? (
                <VideosSection
                  videos={videos}
                  lane={shape}
                  unavailable={unavailable}
                  heading={section.heading}
                />
              ) : (
                <>
                  <VideosSection
                    videos={videos}
                    lane="landscape"
                    unavailable={unavailable}
                    heading={section.heading}
                  />
                  {videos.some((video) => video.aspect_ratio === "reel") ? (
                    <VideosSection videos={videos} lane="reel" />
                  ) : null}
                </>
              );
            break;
          }
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
                layout={section.layout}
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
          case "legal-document": {
            const document = asItems<TPublicLegalDocumentDto>(section.items)[0];
            const type =
              payload.page.route_key === "terms" ? "terms" : "privacy";
            content = document ? (
              <LegalDocumentView document={document} site={payload.site} />
            ) : (
              <LegalDocumentUnavailable type={type} />
            );
            break;
          }
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
