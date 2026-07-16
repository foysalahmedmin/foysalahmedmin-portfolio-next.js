import type { IndexDescriptionInfo } from "mongodb";
import { describe, expect, it } from "vitest";
import auditEventFoundation, {
  AUDIT_EVENT_INDEX_TARGETS,
  isAuditEventIndexReady,
} from "@/lib/db/migrations/202607150005-audit-event-foundation";
import { MIGRATION_REGISTRY } from "@/lib/db/migrations/registry";

describe("audit event migration contract", () => {
  it("registers the migration after contact intake", () => {
    const ids = MIGRATION_REGISTRY.map((migration) => migration.id);
    expect(ids).toContain("202607150005-audit-event-foundation");
    expect(ids.indexOf("202607150005-audit-event-foundation")).toBeGreaterThan(
      ids.indexOf("202607150004-contact-intake-foundation")
    );
  });

  it("declares event identity, bounded timelines, and retention indexes", () => {
    expect(
      AUDIT_EVENT_INDEX_TARGETS.map((target) => target.options.name)
    ).toEqual([
      "event_id_1",
      "audit_created_at_desc",
      "action_1_created_at_-1",
      "audit_target_timeline",
      "audit_actor_timeline",
      "audit_retention_ttl",
    ]);
    const eventId = AUDIT_EVENT_INDEX_TARGETS.find(
      (target) => target.options.name === "event_id_1"
    )!;
    const retention = AUDIT_EVENT_INDEX_TARGETS.find(
      (target) => target.options.name === "audit_retention_ttl"
    )!;
    expect("unique" in eventId.options && eventId.options.unique).toBe(true);
    expect(
      "expireAfterSeconds" in retention.options &&
        retention.options.expireAfterSeconds
    ).toBe(0);
  });

  it("requires the destructive backup gate and quiesced audit writers", async () => {
    expect(auditEventFoundation.behavior.destructive).toBe(true);
    await expect(
      auditEventFoundation.up({
        destructive: { writes_quiesced: false },
      } as never)
    ).rejects.toMatchObject({ code: "AUDIT_EVENT_WRITES_NOT_QUIESCED" });
  });

  it("does not accept an index with a matching name but weaker options", () => {
    const target = AUDIT_EVENT_INDEX_TARGETS.find(
      (candidate) => candidate.options.name === "event_id_1"
    )!;
    const weak: IndexDescriptionInfo = {
      name: "event_id_1",
      key: { event_id: 1 },
    };
    const exact: IndexDescriptionInfo = { ...weak, unique: true };
    expect(isAuditEventIndexReady(weak, target)).toBe(false);
    expect(isAuditEventIndexReady(exact, target)).toBe(true);
  });
});
