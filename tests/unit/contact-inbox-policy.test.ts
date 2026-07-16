import {
  isContactStatusTransitionAllowed,
  toContactInboxDetailDto,
  toContactInboxListDto,
} from "@/app/api/contacts/contact-inbox.policy";
import { parseContactInboxQuery } from "@/app/api/contacts/contact.validation";
import { describe, expect, it } from "vitest";

const contact = {
  _id: "507f1f77bcf86cd799439011",
  name: "Ada Lovelace",
  email: "ada@example.com",
  subject: "Architecture review",
  message: "This complete message must never appear in an inbox list row.",
  status: "new" as const,
  delivery_status: "dead_letter" as const,
  revision: 4,
  retention_expires_at: new Date("2027-01-01T00:00:00.000Z"),
  anonymized_at: null,
  created_at: new Date("2026-07-15T00:00:00.000Z"),
  updated_at: new Date("2026-07-15T01:00:00.000Z"),
};

const operations = {
  idempotency: {
    active: true,
    expires_at: new Date("2027-01-01T00:00:00.000Z"),
  },
  outbox: {
    event_id: "507f1f77bcf86cd799439012",
    status: "dead_letter" as const,
    attempts: 5,
    next_attempt_at: new Date("2026-07-15T02:00:00.000Z"),
    last_error_code: "provider_failure" as const,
  },
};

describe("contact inbox policy", () => {
  it("enforces explicit status transitions", () => {
    expect(isContactStatusTransitionAllowed("new", "read")).toBe(true);
    expect(isContactStatusTransitionAllowed("new", "replied")).toBe(false);
    expect(isContactStatusTransitionAllowed("spam", "qualified")).toBe(false);
    expect(isContactStatusTransitionAllowed("archived", "read")).toBe(true);
    expect(isContactStatusTransitionAllowed("read", "read")).toBe(true);
  });

  it("redacts list rows while keeping safe operational visibility", () => {
    const dto = toContactInboxListDto(
      contact,
      operations,
      new Date("2026-07-15T03:00:00.000Z")
    );
    const serialized = JSON.stringify(dto);
    expect(dto.email_masked).toBe("ad***@example.com");
    expect(dto.operations.delivery).toMatchObject({
      status: "dead_letter",
      attempts: 5,
      retryable: true,
      last_error_code: "provider_failure",
    });
    expect(serialized).not.toContain(contact.message);
    expect(serialized).not.toContain(contact.email);
    expect(serialized).not.toContain("key_hash");
    expect(serialized).not.toContain("lock_token");
  });

  it("returns the full message only in the detail DTO", () => {
    const dto = toContactInboxDetailDto(contact, operations);
    expect(dto.email).toBe(contact.email);
    expect(dto.message).toBe(contact.message);
    expect(dto.allowed_statuses).toEqual([
      "read",
      "qualified",
      "spam",
      "archived",
    ]);
  });

  it("rejects arbitrary query projection and caps pagination", () => {
    expect(() => parseContactInboxQuery({ fields: "message" })).toThrow();
    expect(() => parseContactInboxQuery({ limit: "101" })).toThrow();
    expect(parseContactInboxQuery({ status: "new" })).toMatchObject({
      page: 1,
      limit: 25,
      status: "new",
    });
  });
});
