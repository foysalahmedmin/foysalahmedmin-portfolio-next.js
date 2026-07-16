import type AuditEventModel from "@/app/api/audit-events/audit-event.model";
import type OutboxEventModel from "@/app/api/outbox-events/outbox-event.model";
import type { submitContact as submitContactFunction } from "@/app/api/contacts/contact-intake.service";
import type ContactModel from "@/app/api/contacts/contact.model";
import type { processContactOutbox as processContactOutboxFunction } from "@/app/api/contacts/contact-outbox.service";
import type { anonymizeExpiredContacts as anonymizeExpiredContactsFunction } from "@/app/api/contacts/contact-retention.service";
import type ContactSubmissionKeyModel from "@/app/api/contacts/contact-submission-key.model";
import { ENV } from "@/config";
import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  assertReplicaSetTestDatabaseUrl,
  assertSafeTestDatabaseName,
  assertSafeTestDatabaseUrl,
} from "../helpers/test-database";

const TEST_MONGODB_URI = process.env.TEST_MONGODB_URI?.trim();
const SUITE_NAME = TEST_MONGODB_URI
  ? "contact intake against real transaction-capable MongoDB"
  : "contact intake against real MongoDB (skipped: set TEST_MONGODB_URI)";

if (!TEST_MONGODB_URI) {
  console.warn(
    "[integration] Skipping contact intake coverage: set TEST_MONGODB_URI to an isolated replica-set test database."
  );
}

describe.skipIf(!TEST_MONGODB_URI)(SUITE_NAME, () => {
  let Contact: typeof ContactModel;
  let ContactSubmissionKey: typeof ContactSubmissionKeyModel;
  let AuditEvent: typeof AuditEventModel;
  let OutboxEvent: typeof OutboxEventModel;
  let submitContact: typeof submitContactFunction;
  let processContactOutbox: typeof processContactOutboxFunction;
  let anonymizeExpiredContacts: typeof anonymizeExpiredContactsFunction;

  beforeAll(async () => {
    const databaseUri = assertReplicaSetTestDatabaseUrl(
      assertSafeTestDatabaseUrl(TEST_MONGODB_URI as string)
    );
    ENV.database_url = databaseUri;
    process.env.DATABASE_URL = databaseUri;

    const connectDB = (await import("@/lib/db")).default;
    await connectDB();
    assertSafeTestDatabaseName(mongoose.connection.name);

    [
      { default: Contact },
      { default: ContactSubmissionKey },
      { default: AuditEvent },
      { default: OutboxEvent },
      { submitContact },
      { processContactOutbox },
      { anonymizeExpiredContacts },
    ] = await Promise.all([
      import("@/app/api/contacts/contact.model"),
      import("@/app/api/contacts/contact-submission-key.model"),
      import("@/app/api/audit-events/audit-event.model"),
      import("@/app/api/outbox-events/outbox-event.model"),
      import("@/app/api/contacts/contact-intake.service"),
      import("@/app/api/contacts/contact-outbox.service"),
      import("@/app/api/contacts/contact-retention.service"),
    ]);

    await Promise.all([
      Contact.syncIndexes(),
      ContactSubmissionKey.syncIndexes(),
      AuditEvent.syncIndexes(),
      OutboxEvent.syncIndexes(),
    ]);
  }, 60_000);

  beforeEach(async () => {
    assertSafeTestDatabaseName(mongoose.connection.name);
    await Promise.all([
      mongoose.connection.collection("contacts").deleteMany({}),
      mongoose.connection.collection("contactsubmissionkeys").deleteMany({}),
      mongoose.connection.collection("audit_events").deleteMany({}),
      mongoose.connection.collection("outbox_events").deleteMany({}),
    ]);
  });

  afterAll(async () => {
    if (mongoose.connection.readyState === 0) return;
    assertSafeTestDatabaseName(mongoose.connection.name);
    await mongoose.disconnect();
  });

  const submission = () => ({
    name: "Integration Client",
    email: "client@example.test",
    subject: "Transactional inquiry",
    message: "Please help design this production system safely.",
    company_website: "",
    form_started_at: Date.now() - 5_000,
  });

  const request = () =>
    new Request("http://localhost:3000/api/contacts", {
      method: "POST",
      headers: {
        origin: "http://localhost:3000",
        "content-type": "application/json",
        "x-forwarded-for": "203.0.113.22",
        "x-request-id": "integration-request-id",
      },
    });

  it("atomically persists one inquiry and returns the same safe receipt on retry", async () => {
    const first = await submitContact(submission(), {
      idempotencyKey: "67e55044-10b1-426f-9247-bb680e5fe0c8",
      request: request(),
    });
    const duplicate = await submitContact(submission(), {
      idempotencyKey: "67e55044-10b1-426f-9247-bb680e5fe0c8",
      request: request(),
    });

    expect(first).toMatchObject({ duplicate: false });
    expect(first).not.toHaveProperty("email");
    expect(first).not.toHaveProperty("contactId");
    expect(duplicate).toEqual({ ...first, duplicate: true });
    await expect(Contact.countDocuments()).resolves.toBe(1);
    await expect(ContactSubmissionKey.countDocuments()).resolves.toBe(1);
    await expect(AuditEvent.countDocuments()).resolves.toBe(1);
    await expect(OutboxEvent.countDocuments()).resolves.toBe(1);

    const audit = await AuditEvent.findOne().lean();
    expect(audit?.correlation_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(audit).not.toHaveProperty("actor_key_hash");
  });

  it("keeps the inquiry and schedules a safe retry when email delivery fails", async () => {
    await submitContact(submission(), {
      idempotencyKey: "e7e55044-10b1-426f-9247-bb680e5fe0c9",
      request: request(),
    });

    const result = await processContactOutbox(async () => {
      throw new Error("provider response must not be persisted");
    });

    expect(result).toEqual({
      claimed: 1,
      delivered: 0,
      retrying: 1,
      dead_letter: 0,
      cancelled: 0,
    });
    const contact = await Contact.findOne().lean();
    const outbox = await OutboxEvent.findOne().lean();
    expect(contact?.delivery_status).toBe("retrying");
    expect(contact?.message).toContain("production system");
    expect(outbox).toMatchObject({
      status: "pending",
      attempts: 1,
      last_error_code: "provider_failure",
    });
    expect(outbox).not.toHaveProperty("payload");
  });

  it("anonymizes expired PII and cancels pending delivery", async () => {
    await submitContact(submission(), {
      idempotencyKey: "a7e55044-10b1-426f-9247-bb680e5fe0ca",
      request: request(),
    });
    await Contact.updateOne({}, { retention_expires_at: new Date(0) });

    await expect(anonymizeExpiredContacts()).resolves.toMatchObject({
      examined: 1,
      anonymized: 1,
    });
    const contact = await Contact.findOne().lean();
    const outbox = await OutboxEvent.findOne().lean();
    expect(contact).toMatchObject({
      name: "[anonymized]",
      email: "redacted@invalid.example",
      message: "[redacted]",
      delivery_status: "cancelled",
    });
    await expect(ContactSubmissionKey.countDocuments()).resolves.toBe(0);
    expect(outbox?.status).toBe("cancelled");
  });
});
