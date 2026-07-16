import {
  mergeRepeatableAdminQuery,
  parseRepeatableAdminQuery,
} from "@/hooks/ui/use-repeatable-admin-query-state";
import {
  buildRepeatableFormValues,
  buildRepeatablePayload,
  validateRepeatableForm,
} from "@/lib/admin/repeatable-form";
import {
  REPEATABLE_ADMIN_WORKSPACE_KEYS,
  REPEATABLE_ADMIN_WORKSPACES,
} from "@/lib/admin/repeatable-workspaces";
import { testimonialDefinition } from "@/app/api/testimonials/testimonial.definition";
import { parseRecordListQuery } from "@/app/api/repeatable-content/record.validation";
import { describe, expect, it } from "vitest";

const actorId = "507f1f77bcf86cd799439011";

describe("repeatable admin workspace contracts", () => {
  it("covers only the independently managed repeatable domains", () => {
    expect(REPEATABLE_ADMIN_WORKSPACE_KEYS).toEqual([
      "services",
      "skill-groups",
      "skills",
      "timeline",
      "credentials",
      "faqs",
      "testimonials",
      "legal-documents",
    ]);
    expect(REPEATABLE_ADMIN_WORKSPACE_KEYS).not.toContain("process");
    expect(REPEATABLE_ADMIN_WORKSPACE_KEYS).not.toContain("metrics");
    expect(REPEATABLE_ADMIN_WORKSPACE_KEYS).not.toContain("social");
  });

  it("exposes private consent and verification queue filters", () => {
    const workspace = REPEATABLE_ADMIN_WORKSPACES.testimonials;
    expect(workspace.filters.map(({ id }) => id)).toEqual(
      expect.arrayContaining(["consent", "verification", "deleted_scope"])
    );
    expect(testimonialDefinition.filter_rules.consent).toMatchObject({
      field: "consent_status",
      public: false,
    });
    expect(testimonialDefinition.filter_rules.verification).toMatchObject({
      field: "claim_verification",
      public: false,
    });
    expect(
      parseRecordListQuery(
        new URLSearchParams("consent=pending&verification=unverified"),
        testimonialDefinition,
        "admin"
      ).filters
    ).toEqual({ consent: "pending", verification: "unverified" });
    expect(() =>
      parseRecordListQuery(
        new URLSearchParams("consent=pending"),
        testimonialDefinition,
        "public"
      )
    ).toThrow();
  });

  it("round-trips a bounded URL table state and preserves unrelated params", () => {
    const workspace = REPEATABLE_ADMIN_WORKSPACES.testimonials;
    const contract = {
      defaultSort: workspace.defaultSort,
      filters: workspace.filters,
      allowedSortKeys: ["title", "updated_at"],
    };
    const state = parseRepeatableAdminQuery(
      "?search=consent&sort=title&page=2&limit=20&consent=pending&verification=unknown",
      contract
    );

    expect(state).toEqual({
      search: "consent",
      sort: "title",
      page: 2,
      limit: 20,
      filters: { consent: "pending" },
    });
    expect(
      mergeRepeatableAdminQuery("?utm_source=admin", state, contract)
    ).toBe(
      "?utm_source=admin&search=consent&sort=title&page=2&limit=20&consent=pending"
    );
  });

  it("normalizes service list fields without inventing claims", () => {
    const workspace = REPEATABLE_ADMIN_WORKSPACES.services;
    const values = {
      ...buildRepeatableFormValues(workspace),
      title: "Secure platform engineering",
      summary: "Bounded delivery support",
      primary_pillar: "backend",
      capabilities: "API design\nThreat modeling",
      deliverables: "Architecture decision record",
      technologies: "Node.js\nMongoDB",
      outcome: "A maintainable delivery boundary",
    };
    expect(validateRepeatableForm(workspace, values, true)).toEqual({});
    expect(buildRepeatablePayload(workspace, values, "create")).toMatchObject({
      title: "Secure platform engineering",
      primary_pillar: "backend",
      capabilities: ["API design", "Threat modeling"],
      deliverables: ["Architecture decision record"],
      technologies: ["Node.js", "MongoDB"],
      claim_verification: "not_applicable",
      status: "draft",
    });
  });

  it("enforces testimonial consent and preserves optimistic versioning", () => {
    const workspace = REPEATABLE_ADMIN_WORKSPACES.testimonials;
    const values = {
      ...buildRepeatableFormValues(workspace),
      title: "Engagement feedback",
      quote: "A bounded, approved statement.",
      person_name: "Client reviewer",
      relationship: "client",
      source_type: "direct",
      consent_status: "granted",
      consent_scopes: [],
    };

    expect(validateRepeatableForm(workspace, values, true)).toMatchObject({
      consented_at: expect.any(String),
      consent_scopes: expect.any(String),
    });

    const validValues = {
      ...values,
      consented_at: "2026-07-15T10:30",
      consent_scopes: ["public_site"],
      verified_by: actorId,
    };
    expect(
      buildRepeatablePayload(workspace, validValues, "edit", 7)
    ).toMatchObject({
      expected_version: 7,
      consent_status: "granted",
      consent_scopes: ["public_site"],
      consented_at: expect.stringMatching(/^2026-07-15T/),
      verified_by: actorId,
    });
  });

  it("requires structured, unique, versioned legal sections", () => {
    const workspace = REPEATABLE_ADMIN_WORKSPACES["legal-documents"];
    const invalid = {
      ...buildRepeatableFormValues(workspace),
      title: "Privacy policy",
      type: "privacy",
      document_version: "v1",
      effective_at: "2026-07-15T10:30",
      sections: [
        { key: "data", heading: "Data", body: "Bounded policy text." },
        { key: "data", heading: "Retention", body: "Bounded retention text." },
      ],
    };
    expect(validateRepeatableForm(workspace, invalid, true)).toMatchObject({
      document_version: expect.any(String),
      sections: expect.any(String),
    });

    const valid = {
      ...invalid,
      document_version: "1.0",
      sections: [
        { key: "data", heading: "Data", body: "Bounded policy text." },
        {
          key: "retention",
          heading: "Retention",
          body: "Bounded retention text.",
        },
      ],
    };
    expect(validateRepeatableForm(workspace, valid, true)).toEqual({});
    expect(buildRepeatablePayload(workspace, valid, "create")).toMatchObject({
      document_version: "1.0",
      sections: valid.sections,
    });
  });
});
