import { Types } from "mongoose";
import { describe, expect, it } from "vitest";
import { assertAuditActionTarget } from "@/app/api/audit-events/audit-event.policy";
import { credentialDefinition } from "@/app/api/credentials/credential.definition";
import Credential from "@/app/api/credentials/credential.model";
import { createLegalDocumentSchema } from "@/app/api/legal-documents/legal-document.validation";
import { legalDocumentDefinition } from "@/app/api/legal-documents/legal-document.definition";
import { serviceDefinition } from "@/app/api/services/service.definition";
import Skill from "@/app/api/skills/skill.model";
import { createSkillSchema } from "@/app/api/skills/skill.validation";
import Testimonial from "@/app/api/testimonials/testimonial.model";
import { testimonialDefinition } from "@/app/api/testimonials/testimonial.definition";
import { createTestimonialSchema } from "@/app/api/testimonials/testimonial.validation";
import TimelineEntry from "@/app/api/timeline/timeline-entry.model";
import { parseRecordListQuery } from "@/app/api/repeatable-content/record.validation";
import { getReferencePurposes } from "@/app/api/files/file.service";
import {
  REPEATABLE_CONTENT_DOMAINS,
  type TRepeatableContentDomain,
} from "@/app/api/repeatable-content/record.type";
import { REPEATABLE_CONTENT_REGISTRY } from "@/app/api/repeatable-content/registry";
import { toAdminBaseDto } from "@/app/api/repeatable-content/record.dto";
import { readAdminJson } from "@/app/api/repeatable-content/record.controller";
import { buildRepeatableSearchText } from "@/app/api/repeatable-content/record.model";

const actor = new Types.ObjectId();
const common = {
  contract_version: 1,
  slug: "stable-record",
  locale: "en",
  title: "Stable record",
  secondary_pillars: [],
  sequence: 0,
  status: "published",
  published_at: new Date("2026-07-15T00:00:00.000Z"),
  is_featured: false,
  enabled: true,
  version: 1,
  created_by: actor,
  updated_by: actor,
  is_deleted: false,
  created_at: new Date("2026-07-15T00:00:00.000Z"),
  updated_at: new Date("2026-07-15T00:00:00.000Z"),
};

describe("repeatable-content query contract", () => {
  it("registers every repeatable domain exactly once", () => {
    expect(Object.keys(REPEATABLE_CONTENT_REGISTRY).sort()).toEqual(
      [...REPEATABLE_CONTENT_DOMAINS].sort()
    );
    for (const domain of REPEATABLE_CONTENT_DOMAINS) {
      expect(
        REPEATABLE_CONTENT_REGISTRY[domain as TRepeatableContentDomain].domain
      ).toBe(domain);
    }
  });

  it("bounds pagination and rejects unknown or admin-only public filters", () => {
    expect(
      parseRecordListQuery(
        new URLSearchParams("page=2&limit=50&pillar=frontend&sort=-sequence"),
        serviceDefinition,
        "public"
      )
    ).toMatchObject({
      page: 2,
      limit: 50,
      sort: "sequence",
      direction: -1,
      filters: { pillar: "frontend" },
    });
    expect(() =>
      parseRecordListQuery(
        new URLSearchParams("status=draft"),
        serviceDefinition,
        "public"
      )
    ).toThrow("unsupported or repeated");
    expect(() =>
      parseRecordListQuery(
        new URLSearchParams("limit=51"),
        serviceDefinition,
        "public"
      )
    ).toThrow("query budget");
    expect(() =>
      parseRecordListQuery(
        new URLSearchParams("fields=created_by"),
        serviceDefinition,
        "admin"
      )
    ).toThrow("unsupported or repeated");
  });

  it("normalizes bounded search without allowing text operators", () => {
    const parsed = parseRecordListQuery(
      new URLSearchParams("search=%22backend%22+-%24where+secure"),
      serviceDefinition,
      "public"
    );
    expect(parsed.search).toBe("backend where secure");
  });

  it("indexes every declared domain through the generated search field", () => {
    for (const definition of Object.values(REPEATABLE_CONTENT_REGISTRY)) {
      const textIndex = definition.model.schema
        .indexes()
        .find(([, options]) => options.name?.endsWith("_search_text"));
      expect(textIndex?.[0]).toEqual({ search_text: "text" });
      expect(textIndex?.[1]).toMatchObject({
        default_language: "none",
        weights: { search_text: 1 },
      });
    }
    expect(
      buildRepeatableSearchText(
        {
          title: "Privacy",
          sections: [{ body: "Safe retention details." }],
        },
        ["title", "sections.body"]
      )
    ).toBe("privacy safe retention details");
  });
});

describe("repeatable-content DTO and File contracts", () => {
  it("does not serialize an empty publication timestamp for admin drafts", () => {
    const dto = toAdminBaseDto({
      ...common,
      status: "draft",
      published_at: null,
      claim_verification: "not_applicable",
    });
    expect(dto).not.toHaveProperty("published_at");
  });

  it("classifies compound proof/document fields as document-compatible", () => {
    expect(getReferencePurposes("Testimonial", "proof_file")).toEqual([
      "testimonial",
      "document",
    ]);
    expect(getReferencePurposes("LegalDocument", "document_file")).toEqual([
      "document",
    ]);
  });
});

describe("repeatable-content admin body contract", () => {
  const jsonRequest = (body: string) =>
    new Request("http://localhost:3000/api/services/admin", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    });

  it("parses strict JSON without trusting a declared content length", async () => {
    await expect(
      readAdminJson(jsonRequest('{"title":"Safe"}'))
    ).resolves.toEqual({ title: "Safe" });
    await expect(readAdminJson(jsonRequest("{"))).rejects.toMatchObject({
      code: "INVALID_JSON",
      status: 400,
    });
  });

  it("rejects an actually streamed body over the 256 KiB budget", async () => {
    await expect(
      readAdminJson(jsonRequest(JSON.stringify({ value: "x".repeat(262_144) })))
    ).rejects.toMatchObject({ code: "REQUEST_TOO_LARGE", status: 413 });
  });
});

describe("repeatable-content verification rules", () => {
  it("requires bounded evidence for proficiency claims", () => {
    const input = {
      title: "TypeScript",
      group: new Types.ObjectId().toString(),
      primary_pillar: "frontend",
      proficiency_level: "advanced",
      claim_verification: "verified",
    };
    expect(createSkillSchema.safeParse(input).success).toBe(false);
    expect(
      createSkillSchema.safeParse({
        ...input,
        evidence_source: "project",
        evidence_reference: "project:portfolio-platform",
        evidence_verified_at: "2026-07-15T00:00:00.000Z",
        evidence_verified_by: actor.toString(),
      }).success
    ).toBe(true);
  });

  it("requires explicit consent metadata before a testimonial can be granted", () => {
    const input = {
      title: "Delivery endorsement",
      quote: "A concise approved statement.",
      person_name: "Approved reviewer",
      relationship: "client",
      source_type: "direct",
      consent_status: "granted",
      consent_scopes: ["public_site"],
    };
    expect(createTestimonialSchema.safeParse(input).success).toBe(false);
    expect(
      createTestimonialSchema.safeParse({
        ...input,
        consented_at: "2026-07-15T00:00:00.000Z",
      }).success
    ).toBe(true);
  });

  it("rejects duplicate typed legal section keys", () => {
    const result = createLegalDocumentSchema.safeParse({
      title: "Privacy policy",
      type: "privacy",
      document_version: "1.0",
      effective_at: "2026-07-15T00:00:00.000Z",
      sections: [
        { key: "scope", heading: "Scope", body: "First scope." },
        { key: "scope", heading: "Scope again", body: "Second scope." },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a self-referential legal supersession graph", async () => {
    const id = new Types.ObjectId().toString();
    await expect(
      legalDocumentDefinition.get_async_publish_issues({
        _id: id,
        supersedes: id,
        document_version: "2.0",
        type: "privacy",
      })
    ).resolves.toEqual(["supersedes"]);
  });

  it("redacts proof, consent internals, actor IDs and versions from public DTOs", () => {
    const dto = testimonialDefinition.to_public_dto({
      ...common,
      claim_verification: "verified",
      quote: "Approved quote",
      person_name: "Reviewer",
      relationship: "client",
      source_type: "email",
      source_reference: "private-source-reference",
      consent_status: "granted",
      consent_scopes: ["public_site"],
      consented_at: new Date(),
      verified_at: new Date(),
      verified_by: actor,
      proof_file: new Types.ObjectId(),
    });
    expect(dto).toMatchObject({ verified: true, quote: "Approved quote" });
    const serialized = JSON.stringify(dto);
    for (const forbidden of [
      "source_reference",
      "consent_status",
      "consented_at",
      "verified_by",
      "proof_file",
      "created_by",
      "updated_by",
      "version",
      "is_deleted",
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });
});

describe("model-level publish invariants", () => {
  it("rejects internally contradictory consent even while drafting", async () => {
    const record = new Testimonial({
      ...common,
      status: "draft",
      published_at: null,
      claim_verification: "unverified",
      quote: "Unconfirmed quote",
      person_name: "Reviewer",
      relationship: "client",
      source_type: "direct",
      consent_status: "granted",
      consent_scopes: [],
    });
    await expect(record.validate()).rejects.toThrow("explicit public consent");
  });

  it("fails closed for unverified or unconsented testimonials", async () => {
    const record = new Testimonial({
      ...common,
      claim_verification: "verified",
      quote: "Unconsented quote",
      person_name: "Reviewer",
      relationship: "client",
      source_type: "direct",
      source_reference: "source:1",
      consent_status: "pending",
      consent_scopes: [],
      verified_at: new Date(),
      verified_by: actor,
    });
    await expect(record.validate()).rejects.toThrow("explicit public consent");
  });

  it("fails closed for skill, timeline and credential claims without evidence", async () => {
    const skill = new Skill({
      ...common,
      claim_verification: "derived",
      group: new Types.ObjectId(),
      proficiency_level: "advanced",
      primary_pillar: "frontend",
    });
    await expect(skill.validate()).rejects.toThrow("evidence metadata");

    const timeline = new TimelineEntry({
      ...common,
      claim_verification: "derived",
      type: "experience",
      organization: "Verified organization",
      position: "Engineer",
      started_at: new Date("2025-01-01T00:00:00.000Z"),
    });
    await expect(timeline.validate()).rejects.toThrow("evidence metadata");

    const credential = new Credential({
      ...common,
      claim_verification: "unverified",
      type: "certification",
      issuer: "Issuer",
      issued_at: new Date("2025-01-01T00:00:00.000Z"),
    });
    await expect(credential.validate()).rejects.toThrow("must be verified");
  });
});

describe("repeatable AuditEvent compatibility", () => {
  it("allows repeatable lifecycle targets and rejects unrelated targets", () => {
    expect(() =>
      assertAuditActionTarget("content.created", "service")
    ).not.toThrow();
    expect(() =>
      assertAuditActionTarget("content.archived", "legal-document")
    ).not.toThrow();
    expect(() => assertAuditActionTarget("content.updated", "user")).toThrow(
      "incompatible"
    );
  });
});
