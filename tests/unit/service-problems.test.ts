import { serviceDefinition } from "@/app/api/services/service.definition";
import "@/app/api/services/service.model";
import {
  createServiceSchema,
  updateServiceSchema,
} from "@/app/api/services/service.validation";
import mongoose from "mongoose";
import { describe, expect, it } from "vitest";

const problem = {
  key: "slow-checkout",
  pain: "Checkout takes too long",
  approach: "Profile first, then remove the slowest step",
  deliverable: "A written profile",
  outcome: "A faster checkout",
  case_slug: "checkout-case",
};
const base = { title: "Service", outcome: "Outcome", capabilities: ["API"] };
const parse = (problems: unknown) =>
  createServiceSchema.safeParse({ ...base, problems });
const many = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    ...problem,
    key: `p${index}`,
  }));

describe("Service.problems validation", () => {
  it("defaults to an empty list so existing records and payloads keep validating", () => {
    const result = createServiceSchema.parse(base);
    expect(result.problems).toEqual([]);
    expect(updateServiceSchema.safeParse({ expected_version: 1 }).success).toBe(
      true
    );
  });

  it.each([
    ["a full problem", [problem]],
    ["a minimal problem", [{ key: "a", pain: "Pain", approach: "How" }]],
    ["exactly five problems", many(5)],
  ])("accepts %s", (_name, problems) => {
    expect(parse(problems).success).toBe(true);
    expect(
      updateServiceSchema.safeParse({ expected_version: 1, problems }).success
    ).toBe(true);
  });

  it.each([
    ["an unknown key", [{ ...problem, extra: 1 }], [0]],
    ["more than five", many(6), []],
    ["a duplicate key", [problem, { ...problem }], [1, "key"]],
    ["an uppercase key", [{ ...problem, key: "Slow" }], [0, "key"]],
    ["a pain that is too short", [{ ...problem, pain: "x" }], [0, "pain"]],
    ["markup", [{ ...problem, pain: "<b>bold</b> pain" }], [0, "pain"]],
    [
      "a script scheme",
      [{ ...problem, outcome: "javascript:alert(1)" }],
      [0, "outcome"],
    ],
    [
      "a control character",
      [{ ...problem, approach: "a\nb" }],
      [0, "approach"],
    ],
    [
      "an invalid slug",
      [{ ...problem, case_slug: "Not A Slug" }],
      [0, "case_slug"],
    ],
  ])("rejects %s", (_name, problems, path) => {
    const result = parse(problems);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]!.path).toEqual(["problems", ...path]);
    }
  });
});

describe("Service.problems model and DTOs", () => {
  const record = {
    _id: new mongoose.Types.ObjectId(),
    slug: "svc",
    title: "Service",
    outcome: "Outcome",
    capabilities: ["API"],
    sequence: 0,
    problems: [{ ...problem, _id: new mongoose.Types.ObjectId(), junk: "x" }],
  };

  it("stores problems as id-less subdocuments, defaulting to []", () => {
    const Service = mongoose.models.Service!;
    // Required audit fields are absent here, so only the problems paths are inspected.
    const problemErrors = (problems: unknown[]) =>
      Object.keys(
        new Service({ ...base, problems }).validateSync()?.errors ?? {}
      ).filter((path) => path.startsWith("problems"));
    const doc = new Service({ ...base, problems: [problem] });
    expect(problemErrors([problem])).toEqual([]);
    expect(Object.keys(doc.toObject().problems[0])).not.toContain("_id");
    expect(new Service(base).toObject().problems).toEqual([]);
    expect(problemErrors(many(6))).toEqual(["problems"]);
    expect(problemErrors([{ ...problem, key: "Bad Key" }])).toEqual([
      "problems.0.key",
    ]);
  });

  it("copies exactly the declared problem fields into the public and admin DTOs", () => {
    for (const dto of [
      serviceDefinition.to_public_dto(record),
      serviceDefinition.to_admin_dto(record),
    ]) {
      expect(dto.problems).toEqual([problem]);
    }
    expect(serviceDefinition.public_fields).toContain("problems");
  });

  it("returns an empty list for a record stored before problems existed", () => {
    const { problems: _omitted, ...legacy } = record;
    expect(serviceDefinition.to_public_dto(legacy).problems).toEqual([]);
    expect(serviceDefinition.to_admin_dto(legacy).problems).toEqual([]);
  });
});
