import "dotenv/config";
import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import { createArticle } from "../src/app/api/articles/article.service.ts";
import { createArticleCategory } from "../src/app/api/article-categories/article-category.service.ts";
import { FAQService } from "../src/app/api/faqs/faq.service.ts";
import { LegalDocumentService } from "../src/app/api/legal-documents/legal-document.service.ts";
import { getAdminPage, publishPage, updatePageDraft } from "../src/app/api/pages/page.service.ts";
import { createProjectCategory } from "../src/app/api/project-categories/project-category.service.ts";
import { createProject } from "../src/app/api/projects/project.service.ts";
import { ServiceService } from "../src/app/api/services/service.service.ts";
import { getAdminSite, publishSite, updateSiteDraft } from "../src/app/api/site/site.service.ts";
import connectDB from "../src/lib/db.ts";
import {
  LAUNCH_ARTICLES,
  LAUNCH_PILLAR_COPY,
  LAUNCH_PROJECTS,
} from "../src/lib/seed/launch-content.ts";

const SITE_URL = "https://www.foysalahmedmin.com";
const PAGES = ["home", "about", "projects", "articles", "contact", "privacy", "terms"] as const;

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
  collection: "project_categories" | "article_categories",
  create: (payload: { name: string; slug: string; sequence: number; description: string }) => Promise<{ _id: unknown }>,
  name: string,
  slug: string,
  description: string
): Promise<string> => {
  const existing = await db.collection(collection).findOne({ slug, is_deleted: { $ne: true } });
  if (existing) return existing._id.toString();
  const created = await create({ name, slug, sequence: 1, description });
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
    const page = await getAdminPage(route);
    let revision = page.revision;
    const draft = structuredClone(page.draft) as {
      seo?: Record<string, unknown>;
      sections: { key: string }[];
    };
    draft.seo = { ...(draft.seo ?? {}), noindex: false };
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
