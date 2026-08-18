import { SEED_ALLOWED_TARGET_COLLECTIONS } from "@/lib/seed/types";
import mongoose from "mongoose";
import { describe, expect, it } from "vitest";

import "@/app/api/article-categories/article-category.model";
import "@/app/api/articles/article.model";
import "@/app/api/credentials/credential.model";
import "@/app/api/faqs/faq.model";
import "@/app/api/legal-documents/legal-document.model";
import "@/app/api/project-categories/project-category.model";
import "@/app/api/project-resources/project-resource.model";
import "@/app/api/projects/project.model";
import "@/app/api/services/service.model";
import "@/app/api/site/site.model";
import "@/app/api/skill-groups/skill-group.model";
import "@/app/api/skills/skill.model";
import "@/app/api/testimonials/testimonial.model";
import "@/app/api/timeline/timeline-entry.model";

// Every model the seed writes to must read the collection the seed and the
// schema migrations actually target, otherwise seeded content is invisible and
// the migration-owned indexes are built on collections nobody queries.
const SEEDABLE_MODELS: Readonly<Record<string, string>> = {
  ArticleCategory: "article_categories",
  Article: "articles",
  Credential: "credentials",
  FAQ: "faqs",
  LegalDocument: "legal_documents",
  ProjectCategory: "project_categories",
  ProjectResource: "project_resources",
  Project: "projects",
  Service: "services",
  Site: "sites",
  SkillGroup: "skill_groups",
  Skill: "skills",
  Testimonial: "testimonials",
  TimelineEntry: "timeline_entries",
};

describe("model collection names", () => {
  it("matches the collections the seed writes to", () => {
    const mismatches = Object.entries(SEEDABLE_MODELS)
      .filter(([name]) => mongoose.models[name])
      .map(([name, expected]) => ({
        model: name,
        expected,
        actual: mongoose.models[name].collection.name,
      }))
      .filter(({ actual, expected }) => actual !== expected);

    expect(mismatches).toEqual([]);
  });

  it("only targets collections the seed allowlist knows", () => {
    for (const collection of Object.values(SEEDABLE_MODELS)) {
      expect(SEED_ALLOWED_TARGET_COLLECTIONS).toContain(collection);
    }
  });
});
