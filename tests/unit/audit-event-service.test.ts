import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  append: vi.fn(),
  findBounded: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ default: vi.fn(async () => undefined) }));
vi.mock("@/app/api/audit-events/audit-event.repository", () => ({
  append: mocks.append,
  findBounded: mocks.findBounded,
}));

import {
  appendAuditEvent,
  queryAuditEvents,
} from "@/app/api/audit-events/audit-event.service";

const now = new Date("2026-07-15T12:00:00.000Z");

describe("audit event service", () => {
  beforeEach(() => {
    mocks.append.mockReset();
    mocks.findBounded.mockReset();
    mocks.append.mockImplementation(async (value) => ({
      event_id: "b65dd44b-bb30-4c0e-862e-68cc0a941083",
      created_at: now,
      ...value,
    }));
  });

  it("appends a redacted, hashed event and never returns a session hash", async () => {
    const result = await appendAuditEvent(
      {
        action: "user.role.changed",
        actor: {
          type: "user",
          id: "507f1f77bcf86cd799439011",
          role: "super-admin",
          session_id: "private-session-token",
        },
        target: {
          type: "user",
          id: "507f1f77bcf86cd799439012",
          revision: 3,
        },
        source: "admin",
        summary_code: "user_role_changed",
        changed_fields: ["role", "email"],
        metadata: {
          previous_role: "admin",
          next_role: "editor",
          email: "private@example.com",
        },
        correlation_id: "request-correlation-123",
      },
      { now }
    );

    expect(mocks.append).toHaveBeenCalledWith(
      expect.objectContaining({
        actor_id: "507f1f77bcf86cd799439011",
        session_hash: expect.stringMatching(/^[a-f0-9]{64}$/),
        correlation_hash: expect.stringMatching(/^[a-f0-9]{64}$/),
        changed_fields: ["role", "[redacted]"],
        metadata: { previous_role: "admin", next_role: "editor" },
        retain_until: new Date("2027-07-15T12:00:00.000Z"),
      }),
      undefined
    );
    expect(result).not.toHaveProperty("session_hash");
    expect(JSON.stringify(result)).not.toContain("private-session-token");
    expect(JSON.stringify(result)).not.toContain("private@example.com");
  });

  it("requires identity snapshots only for user actors", async () => {
    await expect(
      appendAuditEvent({
        action: "file.permanently_deleted",
        actor: { type: "user", id: "507f1f77bcf86cd799439011" },
        target: { type: "file", id: "507f1f77bcf86cd799439012" },
        source: "admin",
        summary_code: "file_permanently_deleted",
      })
    ).rejects.toMatchObject({ status: 400 });
    expect(mocks.append).not.toHaveBeenCalled();
  });

  it("builds only fixed filters and maps fixed safe output", async () => {
    mocks.findBounded.mockResolvedValue({
      total: 1,
      events: [
        {
          event_id: "b65dd44b-bb30-4c0e-862e-68cc0a941083",
          schema_version: 1,
          action: "contact.anonymized",
          actor_type: "system",
          target_type: "contact",
          target_id: "507f1f77bcf86cd799439012",
          outcome: "success",
          source: "job",
          summary_code: "contact_anonymized",
          changed_fields: [],
          metadata: {},
          correlation_hash: undefined,
          session_hash: "must-not-leak",
          created_at: now,
          retain_until: new Date("2027-07-15T12:00:00.000Z"),
        },
      ],
    });

    const result = await queryAuditEvents({
      page: 1,
      limit: 25,
      from: new Date("2026-07-01T00:00:00.000Z"),
      to: now,
      action: "contact.anonymized",
      target_type: "contact",
      correlation_id: "request-correlation-456",
    });

    expect(mocks.findBounded).toHaveBeenCalledWith({
      filter: {
        created_at: {
          $gte: new Date("2026-07-01T00:00:00.000Z"),
          $lte: now,
        },
        action: "contact.anonymized",
        target_type: "contact",
        correlation_hash: expect.stringMatching(/^[a-f0-9]{64}$/),
      },
      page: 1,
      limit: 25,
    });
    expect(JSON.stringify(mocks.findBounded.mock.calls[0]?.[0])).not.toContain(
      "request-correlation-456"
    );
    expect(result.data[0]).not.toHaveProperty("session_hash");
    expect(result.meta).toEqual({ total: 1, page: 1, limit: 25 });
  });
});
