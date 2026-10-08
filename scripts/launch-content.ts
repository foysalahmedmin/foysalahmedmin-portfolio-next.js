import "dotenv/config";
import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import { createArticle } from "../src/app/api/articles/article.service.ts";
import { createArticleCategory } from "../src/app/api/article-categories/article-category.service.ts";
import { createCaseStudy } from "../src/app/api/case-studies/case-study.service.ts";
import { createCaseStudyCategory } from "../src/app/api/case-study-categories/case-study-category.service.ts";
import { FAQService } from "../src/app/api/faqs/faq.service.ts";
import { LegalDocumentService } from "../src/app/api/legal-documents/legal-document.service.ts";
import {
  createPage,
  getAdminPage,
  publishPage,
  updatePageDraft,
} from "../src/app/api/pages/page.service.ts";
import { createProjectCategory } from "../src/app/api/project-categories/project-category.service.ts";
import { createProject } from "../src/app/api/projects/project.service.ts";
import { ServiceService } from "../src/app/api/services/service.service.ts";
import { createVideo } from "../src/app/api/videos/video.service.ts";
import { createVideoCategory } from "../src/app/api/video-categories/video-category.service.ts";
import { getAdminSite, publishSite, updateSiteDraft } from "../src/app/api/site/site.service.ts";
import connectDB from "../src/lib/db.ts";
import { getFoundationPageDraft } from "../src/lib/seed/foundation.ts";
import {
  LAUNCH_ARTICLES,
  LAUNCH_PILLAR_COPY,
  LAUNCH_PROJECTS,
} from "../src/lib/seed/launch-content.ts";
import {
  LAUNCH_CASE_STUDIES,
  LAUNCH_CASE_STUDY_CATEGORIES,
  LAUNCH_VIDEOS,
  LAUNCH_VIDEO_CATEGORIES,
} from "../src/lib/seed/launch-library-content.ts";

const SITE_URL = "https://www.foysalahmedmin.com";
const PAGES = [
  "home",
  "about",
  "projects",
  "case-studies",
  "articles",
  "videos",
  "contact",
  "privacy",
  "terms",
] as const;

type NavLink = {
  key: string;
  label: string;
  kind: "internal";
  href: string;
  enabled: boolean;
};
const navLink = (key: string, label: string, href: string): NavLink => ({
  key,
  label,
  kind: "internal",
  href,
  enabled: true,
});
// Adds a link next to the one it belongs after, once.
const withNavLink = <T extends { key: string; href?: string }>(
  links: T[],
  link: NavLink,
  after: string
): T[] => {
  if (links.some((entry) => entry.key === link.key || entry.href === link.href)) {
    return links;
  }
  const next = [...links];
  const index = next.findIndex((entry) => entry.key === after);
  next.splice(index === -1 ? next.length : index + 1, 0, link as unknown as T);
  return next;
};

const explain = (error: unknown): string => {
  const e = error as { message?: string; sources?: unknown; code?: string };
  return `${e.code ?? ""} ${e.message ?? String(error)} ${e.sources ? JSON.stringify(e.sources) : ""}`.trim();
};

const step = async <T>(label: string, run: () => Promise<T>): Promise<T | undefined> => {
  try {
    const value = await run();
    console.log(`OK    ${label}`);
    return value;
  } catch (error) {
    console.log(`FAIL  ${label}: ${explain(error)}`);
    return undefined;
  }
};

await connectDB();
const db = mongoose.connection;
const admin = await db.collection("users").findOne({ role: "super-admin" });
if (!admin) throw new Error("Run the super-admin bootstrap first.");

const actorId = admin._id.toString();
const sessionId = new mongoose.Types.ObjectId().toString();
const actor = {
  _id: actorId,
  name: admin.name as string,
  email: admin.email as string,
  role: "super-admin" as const,
  is_verified: true,
  session_id: sessionId,
};
const context = {
  actor: { id: actorId, role: "super-admin" as const, session_id: sessionId },
  request_id: randomUUID(),
};

// ---- Site -------------------------------------------------------------------
await step("site draft", async () => {
  const current = await getAdminSite();
  const draft = structuredClone(current.draft);
  draft.identity = {
    ...draft.identity,
    public_name: "Foysal Ahmed",
    short_name: "Foysal",
    canonical_url: SITE_URL,
  };
  draft.positioning = {
    ...draft.positioning,
    short_bio:
      "Web developer with a growing focus on system solution architecture, building maintainable applications and intuitive user experiences.",
    long_bio:
      "I am a web developer with a strong foundation in modern web technologies and a growing focus on system solution architecture. I enjoy designing scalable, maintainable applications and building intuitive user experiences. I work closely with teams and clients, approaching every project with a thoughtful mindset and a collaborative spirit.",
  };
  draft.pillars = draft.pillars.map((pillar) => ({
    ...pillar,
    enabled: true,
    client_outcome: LAUNCH_PILLAR_COPY[pillar.key].client_outcome,
    seo_summary: LAUNCH_PILLAR_COPY[pillar.key].seo_summary,
    cta: {
      key: `${pillar.key}-cta`,
      label: `Discuss ${pillar.label.toLowerCase()} work`,
      kind: "internal",
      href: "/contact",
      enabled: true,
    },
  }));
  draft.contact = {
    ...draft.contact,
    public_email: "foysalahmedmin@gmail.com",
    email_visibility: "public",
  };
  draft.social_links = [
    { key: "github", platform: "github", label: "GitHub", url: "https://github.com/foysalahmedmin", enabled: true },
    { key: "linkedin", platform: "linkedin", label: "LinkedIn", url: "https://www.linkedin.com/in/foysalahmedmin/", enabled: true },
  ];
  draft.footer = { ...draft.footer, copyright_name: "Foysal Ahmed" };
  const caseStudiesLink = navLink("case-studies", "Case studies", "/case-studies");
  const videosLink = navLink("videos", "Videos", "/videos");
  draft.navigation = {
    ...draft.navigation,
    header: withNavLink(
      withNavLink(draft.navigation.header, caseStudiesLink, "projects"),
      videosLink,
      "articles"
    ),
    footer: withNavLink(
      withNavLink(draft.navigation.footer, caseStudiesLink, "projects"),
      videosLink,
      "articles"
    ),
  };
  draft.seo = {
    ...draft.seo,
    default_title: "Foysal Ahmed | Architecture, Software & Automation",
    title_template: "%s | Foysal Ahmed",
    canonical_url: SITE_URL,
    allow_indexing: true,
  };
  await updateSiteDraft({ expected_revision: current.revision, draft }, context);
});
await step("site publish", async () => {
  const current = await getAdminSite();
  await publishSite({ expected_revision: current.revision }, context);
});

// ---- Categories, projects, articles -----------------------------------------
const ensureCategory = async (
  collection:
    | "project_categories"
    | "article_categories"
    | "case_study_categories"
    | "video_categories",
  create: (payload: { name: string; slug: string; sequence: number; description: string }) => Promise<{ _id: unknown }>,
  name: string,
  slug: string,
  description: string,
  sequence = 1
): Promise<string> => {
  const existing = await db.collection(collection).findOne({ slug, is_deleted: { $ne: true } });
  if (existing) return existing._id.toString();
  const created = await create({ name, slug, sequence, description });
  return String(created._id);
};

const projectCategory = await step("project category", () =>
  ensureCategory("project_categories", createProjectCategory as never, "Case Studies", "case-studies", "Problems solved, with the approach and the result.")
);
const articleCategory = await step("article category", () =>
  ensureCategory("article_categories", createArticleCategory as never, "Engineering Notes", "engineering-notes", "Practical notes on solving real problems.")
);

for (const [index, project] of LAUNCH_PROJECTS.entries()) {
  if (!projectCategory) break;
  await step(`project: ${project.name}`, async () => {
    if (await db.collection("projects").findOne({ name: project.name, is_deleted: { $ne: true } })) return;
    await createProject(
      {
        name: project.name,
        description: project.description,
        content: project.body,
        category: projectCategory,
        author: actorId,
        tags: [...project.tags],
        primary_pillar: project.pillar,
        project_type: "internal",
        delivery_status: "completed",
        publication_status: "published",
        status: "completed",
        problem: project.problem,
        constraints: [...project.constraints],
        role: project.role,
        architecture: project.architecture,
        decisions: [...project.decisions],
        implementation: project.implementation,
        security: project.security,
        performance_reliability: project.performance_reliability,
        outcomes: project.outcomes.map((outcome) => ({ ...outcome, verification_state: "derived" as const })),
        learnings: [...project.learnings],
        is_featured: index < 3,
      },
      actor
    );
  });
}

for (const [index, article] of LAUNCH_ARTICLES.entries()) {
  if (!articleCategory) break;
  await step(`article: ${article.name}`, async () => {
    if (await db.collection("articles").findOne({ name: article.name, is_deleted: { $ne: true } })) return;
    await createArticle(
      {
        name: article.name,
        excerpt: article.excerpt,
        content: article.body,
        category: articleCategory,
        author: actorId,
        primary_pillar: article.pillar,
        topics: [...article.topics],
        reading_time_minutes: article.minutes,
        reading_time_source: "manual",
        status: "published",
        published_at: new Date(Date.now() - (LAUNCH_ARTICLES.length - index) * 86_400_000),
        is_featured: index < 3,
      },
      actor
    );
  });
}

// ---- Case studies and videos -------------------------------------------------
const caseStudyCategories = new Map<string, string>();
for (const category of LAUNCH_CASE_STUDY_CATEGORIES) {
  const id = await step(`case study category: ${category.name}`, () =>
    ensureCategory(
      "case_study_categories",
      createCaseStudyCategory as never,
      category.name,
      category.slug,
      category.description,
      category.sequence
    )
  );
  if (id) caseStudyCategories.set(category.slug, id);
}
const videoCategories = new Map<string, string>();
for (const category of LAUNCH_VIDEO_CATEGORIES) {
  const id = await step(`video category: ${category.name}`, () =>
    ensureCategory(
      "video_categories",
      createVideoCategory as never,
      category.name,
      category.slug,
      category.description,
      category.sequence
    )
  );
  if (id) videoCategories.set(category.slug, id);
}

for (const [index, study] of LAUNCH_CASE_STUDIES.entries()) {
  const categoryId = caseStudyCategories.get(study.category);
  if (!categoryId) continue;
  await step(`case study: ${study.name}`, async () => {
    if (await db.collection("case_studies").findOne({ name: study.name, is_deleted: { $ne: true } })) return;
    await createCaseStudy(
      {
        name: study.name,
        category: categoryId,
        author: actorId,
        description: study.description,
        overview: study.overview,
        client_industry: study.industry,
        engagement_type: "internal",
        primary_pillar: study.pillar,
        role: study.role,
        team_size: 1,
        duration_label: study.duration,
        challenge: study.challenge,
        approach: study.approach,
        key_decisions: [...study.decisions],
        solution: study.solution,
        results_summary: study.results,
        outcomes: study.outcomes.map((outcome) => ({
          ...outcome,
          verification_state: "derived" as const,
        })),
        tech_stack: [...study.tools],
        services: [...study.services],
        learnings: [...study.learnings],
        keywords: [...study.keywords],
        status: "published",
        published_at: new Date(Date.now() - (LAUNCH_CASE_STUDIES.length - index) * 86_400_000),
        is_featured: index < 3,
      },
      actor
    );
  });
}

for (const [index, video] of LAUNCH_VIDEOS.entries()) {
  const categoryId = videoCategories.get(video.category);
  if (!categoryId) continue;
  await step(`video: ${video.name}`, async () => {
    if (await db.collection("videos").findOne({ name: video.name, is_deleted: { $ne: true } })) return;
    await createVideo(
      {
        name: video.name,
        category: categoryId,
        author: actorId,
        aspect_ratio: video.aspect,
        source_type: "youtube",
        youtube_url: video.url,
        description: video.description,
        keywords: [...video.keywords],
        status: "published",
        published_at: new Date(Date.now() - (LAUNCH_VIDEOS.length - index) * 3_600_000),
        is_featured: index < 2,
      },
      actor
    );
  });
}

// ---- Repeatable content -----------------------------------------------------
const publishRecords = async (
  label: string,
  collection: string,
  service: { updateRecord: (id: string, input: unknown, actor: never) => Promise<unknown> },
  extra: Record<string, unknown> = {}
) => {
  const rows = await db
    .collection(collection)
    .find({
      is_deleted: { $ne: true },
      $or: [{ status: "draft" }, ...(extra.is_featured ? [{ is_featured: { $ne: true } }] : [])],
    })
    .toArray();
  for (const row of rows) {
    await step(`${label}: ${row.slug}`, () =>
      service.updateRecord(
        row._id.toString(),
        { expected_version: row.version, status: "published", ...extra },
        actor as never
      )
    );
  }
};

const SERVICE_SUMMARIES: Record<string, string> = {
  "architecture-system-design":
    "Turn unclear requirements into a secure, scalable blueprint before any code is written.",
  "product-software-development":
    "Build the interface, API, and data of a product your team can maintain and extend.",
  "ai-workflow-automation":
    "Replace repetitive manual work with automation you can monitor, review, and switch off.",
};
for (const [slug, summary] of Object.entries(SERVICE_SUMMARIES)) {
  await db.collection("services").updateOne({ slug, status: "draft" }, { $set: { summary } });
}
await publishRecords("service", "services", ServiceService, { is_featured: true });
await publishRecords("faq", "faqs", FAQService, { claim_verification: "not_applicable", is_featured: true });
await publishRecords("legal", "legal_documents", LegalDocumentService, {
  claim_verification: "not_applicable",
  reviewed_at: new Date().toISOString(),
  reviewed_by: actorId,
});

// ---- Pages ------------------------------------------------------------------
for (const route of PAGES) {
  await step(`page ${route}`, async () => {
    // A route added after the first launch has no Page yet; start it from
    // the same draft the foundation seed uses.
    const page = await getAdminPage(route).catch(async (error: unknown) => {
      if ((error as { code?: string }).code !== "PAGE_NOT_FOUND") throw error;
      return await createPage(route, getFoundationPageDraft(route), context);
    });
    let revision = page.revision;
    const draft = structuredClone(page.draft) as {
      seo?: Record<string, unknown>;
      sections: { key: string }[];
    };
    draft.seo = { ...(draft.seo ?? {}), noindex: false };
    if (route === "home") {
      // Existing sites gain the case study and video sections once, ahead of
      // the articles; sections the owner already has are left untouched.
      const additions = getFoundationPageDraft("home").sections.filter(
        (section) =>
          ["case-studies", "videos", "reels"].includes(section.key) &&
          !draft.sections.some((existing) => existing.key === section.key)
      );
      if (additions.length) {
        const at = draft.sections.findIndex((section) => section.key === "articles");
        draft.sections.splice(
          at === -1 ? draft.sections.length : at,
          0,
          ...additions
        );
      }
    }
    // Sections that list content which cannot be public yet (skills need
    // verified evidence; there are no testimonials, timeline or credentials)
    // would make the whole Page unpublishable.
    const EMPTY_SECTIONS = ["skills", "trust", "timeline", "credentials"];
    draft.sections = draft.sections.filter((section) => !EMPTY_SECTIONS.includes(section.key));
    const saved = await updatePageDraft(route, { expected_revision: revision, draft }, context);
    revision = saved.revision;
    await publishPage(route, { expected_revision: revision }, context);
  });
}

await mongoose.disconnect();
