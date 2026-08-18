import { PAGE_SECTION_KINDS } from "@/app/api/pages/page.type";
import { createFoundationSeedManifest } from "@/lib/seed/foundation";
import { ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";

type FoundationRecord = {
  collection: string;
  seed_key: string;
  payload: Record<string, unknown>;
  insert_only?: Record<string, unknown>;
  update_only?: Record<string, unknown>;
  validate: (document: Record<string, unknown>) => void;
};

const actor = { _id: new ObjectId(), role: "super-admin" as const };

const records = (): readonly FoundationRecord[] =>
  createFoundationSeedManifest(actor).records as readonly FoundationRecord[];

// Mirrors validateNextTarget in src/lib/seed/engine.ts. An update merges onto
// the document a previous create already stored, so it starts from that state.
const buildDocument = (
  record: FoundationRecord,
  mode: "create" | "update"
): Record<string, unknown> => {
  const now = new Date();
  const created = Object.assign(
    { ...record.payload },
    record.insert_only ?? {},
    { created_at: now, updated_at: now }
  );
  return mode === "create"
    ? created
    : Object.assign(created, { ...record.payload }, record.update_only ?? {}, {
        updated_at: now,
      });
};

const collectFailures = (mode: "create" | "update"): string[] =>
  records().flatMap((record) => {
    try {
      record.validate(buildDocument(record, mode));
      return [];
    } catch (error) {
      const details = (error as { details?: readonly string[] }).details ?? [];
      return [`${record.seed_key} → ${details.join(", ") || "unknown"}`];
    }
  });

describe("foundation seed manifest", () => {
  it("passes its own versioned schema for every inserted record", () => {
    expect(collectFailures("create")).toEqual([]);
  });

  it("passes its own versioned schema for every updated record", () => {
    expect(collectFailures("update")).toEqual([]);
  });

  it("only composes page sections the application can render", () => {
    const kinds = records()
      .filter((record) => record.collection === "pages")
      .flatMap((record) => {
        const draft = record.payload.draft as
          | { sections?: readonly { kind: string }[] }
          | undefined;
        return (draft?.sections ?? []).map((section) => section.kind);
      });

    expect(kinds.length).toBeGreaterThan(0);
    expect([...new Set(kinds)].sort()).toEqual(
      expect.arrayContaining(
        [...new Set(kinds)].filter((kind) =>
          (PAGE_SECTION_KINDS as readonly string[]).includes(kind)
        )
      )
    );
    expect(
      kinds.filter(
        (kind) => !(PAGE_SECTION_KINDS as readonly string[]).includes(kind)
      )
    ).toEqual([]);
  });
});
