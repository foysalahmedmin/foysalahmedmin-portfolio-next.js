import { Types } from "mongoose";
import { describe, expect, it, vi } from "vitest";
import AuditEvent, {
  deleteCompensatedContactAuditEvents,
} from "@/app/api/audit-events/audit-event.model";
import {
  assertAuditActionTarget,
  hashAuditIdentifier,
  sanitizeAuditMetadata,
  sanitizeChangedFields,
} from "@/app/api/audit-events/audit-event.policy";
import { parseAuditEventQuery } from "@/app/api/audit-events/audit-event.validation";

describe("audit event redaction policy", () => {
  it("keeps only allowlisted bounded metadata and redacts sensitive values", () => {
    const metadata = sanitizeAuditMetadata({
      http_method: "patch",
      request_channel: "browser",
      previous_state: "draft",
      next_state: "published",
      security_signal: "Bearer eyJ-secret-token",
      previous_role: "admin",
      next_role: "owner",
      result_count: 4,
      batch_size: 2_000_000,
      transactional: true,
      email: "private@example.com",
      before: { password: "unsafe" },
    });

    expect(metadata).toEqual({
      http_method: "PATCH",
      request_channel: "browser",
      previous_state: "draft",
      next_state: "published",
      security_signal: "redacted",
      previous_role: "admin",
      next_role: "redacted",
      result_count: 4,
      transactional: true,
    });
    expect(JSON.stringify(metadata)).not.toContain("private@example.com");
    expect(metadata).not.toHaveProperty("before");
    expect(metadata).not.toHaveProperty("batch_size");
  });

  it("redacts forbidden changed paths, drops malformed paths, and deduplicates", () => {
    expect(
      sanitizeChangedFields([
        "status",
        "profile.email",
        "message",
        "status",
        "$where",
        "body.raw",
      ])
    ).toEqual(["status", "[redacted]"]);
  });

  it("domain-separates deterministic HMAC identifiers without retaining input", () => {
    const secret = "unit-test-audit-secret-at-least-32-characters";
    const correlation = hashAuditIdentifier(
      "correlation",
      "request-correlation-123",
      secret
    );
    const session = hashAuditIdentifier(
      "session",
      "request-correlation-123",
      secret
    );

    expect(correlation).toMatch(/^[a-f0-9]{64}$/);
    expect(session).toMatch(/^[a-f0-9]{64}$/);
    expect(correlation).not.toBe(session);
    expect(correlation).not.toContain("request-correlation");
  });

  it("rejects incompatible action and target pairs", () => {
    expect(() =>
      assertAuditActionTarget("content.published", "project")
    ).not.toThrow();
    expect(() => assertAuditActionTarget("content.published", "user")).toThrow(
      "incompatible"
    );
  });
});

describe("audit query bounds", () => {
  const now = new Date("2026-07-15T12:00:00.000Z");

  it("applies a 30-day default window and fixed pagination defaults", () => {
    const query = parseAuditEventQuery({}, now);
    expect(query).toMatchObject({ page: 1, limit: 25, to: now });
    expect(query.to.getTime() - query.from.getTime()).toBe(
      30 * 24 * 60 * 60 * 1_000
    );
  });

  it("accepts allowlisted filters and rejects overbroad or arbitrary queries", () => {
    expect(
      parseAuditEventQuery(
        {
          action: "file.permanently_deleted",
          target_type: "file",
          target_id: "507f1f77bcf86cd799439011",
          limit: "100",
          from: "2026-06-01T00:00:00.000Z",
          to: "2026-07-15T00:00:00.000Z",
        },
        now
      )
    ).toMatchObject({ limit: 100, target_type: "file" });
    expect(() => parseAuditEventQuery({ fields: "session_hash" }, now)).toThrow(
      "Invalid audit query"
    );
    expect(() => parseAuditEventQuery({ limit: "101" }, now)).toThrow(
      "Invalid audit query"
    );
    expect(() =>
      parseAuditEventQuery(
        {
          from: "2026-01-01T00:00:00.000Z",
          to: "2026-07-15T00:00:00.000Z",
        },
        now
      )
    ).toThrow("90 days");
  });
});

describe("audit model compatibility and immutability", () => {
  it("normalizes the existing contact-only create shape", async () => {
    const contactId = new Types.ObjectId();
    const event = new AuditEvent({
      action: "contact.submitted",
      entity_type: "contact",
      entity_id: contactId,
      actor_type: "anonymous",
      correlation_hash: "ab".repeat(32),
    });

    await event.validate();
    expect(event.target_type).toBe("contact");
    expect(event.target_id).toBe(contactId.toString());
    expect(event.summary_code).toBe("contact_submitted");
    expect(event.outcome).toBe("success");
    expect(event.source).toBe("api");
    expect(event.retain_until).toBeInstanceOf(Date);
  });

  it("preserves the existing contact create call while storing canonical fields", async () => {
    const contactId = new Types.ObjectId();
    const insertOne = vi
      .spyOn(AuditEvent.collection, "insertOne")
      .mockResolvedValue({
        acknowledged: true,
        insertedId: new Types.ObjectId(),
      });

    const [event] = await AuditEvent.create([
      {
        action: "contact.submitted",
        entity_type: "contact",
        entity_id: contactId,
        actor_type: "anonymous",
        correlation_hash: "ab".repeat(32),
      },
    ]);
    expect(event.target_type).toBe("contact");
    expect(event.target_id).toBe(contactId.toString());
    expect(insertOne).toHaveBeenCalledOnce();
    insertOne.mockRestore();
  });

  it("rejects updates and deletes before reaching the database", async () => {
    await expect(
      AuditEvent.updateOne(
        { event_id: "event" },
        { $set: { summary_code: "changed" } }
      )
    ).rejects.toThrow("append-only");
    await expect(AuditEvent.deleteMany({})).rejects.toThrow("append-only");
    const event = new AuditEvent({
      action: "contact.submitted",
      actor_type: "anonymous",
      target_type: "contact",
      target_id: new Types.ObjectId().toString(),
      summary_code: "contact_submitted",
    });
    await expect(event.deleteOne()).rejects.toThrow("append-only");
    await expect(
      AuditEvent.bulkWrite([{ deleteMany: { filter: {} } }])
    ).rejects.toThrow("append-only");
    await expect(
      AuditEvent.insertMany([
        {
          action: "contact.submitted",
          actor_type: "anonymous",
          target_type: "contact",
          target_id: new Types.ObjectId().toString(),
          summary_code: "contact_submitted",
        },
      ])
    ).rejects.toThrow("audit service");
  });

  it("permits only the explicit contact rollback compensation helper", async () => {
    const contactId = new Types.ObjectId();
    const deleteMany = vi
      .spyOn(AuditEvent.collection, "deleteMany")
      .mockResolvedValue({ acknowledged: true, deletedCount: 1 });

    await expect(
      deleteCompensatedContactAuditEvents({ contact_id: contactId })
    ).resolves.toMatchObject({ deletedCount: 1 });
    expect(deleteMany).toHaveBeenCalledWith(
      {
        action: "contact.submitted",
        target_type: "contact",
        target_id: contactId.toString(),
        entity_type: "contact",
        entity_id: contactId,
      },
      expect.any(Object)
    );
    deleteMany.mockRestore();
  });

  it("rejects unrestricted root fields and drops non-allowlisted metadata", async () => {
    expect(
      () =>
        new AuditEvent({
          action: "contact.submitted",
          actor_type: "anonymous",
          target_type: "contact",
          target_id: new Types.ObjectId().toString(),
          summary_code: "contact_submitted",
          raw_before: { email: "private@example.com" },
        })
    ).toThrow();
    const event = new AuditEvent({
      action: "contact.submitted",
      actor_type: "anonymous",
      target_type: "contact",
      target_id: new Types.ObjectId().toString(),
      summary_code: "contact_submitted",
      metadata: { password: "unsafe" },
    });
    await event.validate();
    expect(event.metadata).not.toHaveProperty("password");
  });
});
