import { randomInt, randomUUID } from "node:crypto";
import { appendAuditEvent } from "@/app/api/audit-events/audit-event.service";
import AppError from "@/builder/app-error";
import connectDB from "@/lib/db";
import { sendEmail } from "@/utils/send-email";
import httpStatus from "http-status";
import ContactPrivacyRequest from "./contact-privacy.model";
import * as ContactRepository from "./contact.repository";
import { anonymizeContacts } from "./contact-retention.service";
import { hmacContactValue } from "./contact-security";

const PRIVACY_CODE_TTL_MS = 15 * 60 * 1_000;
const MAX_SUBJECT_EXPORT_RECORDS = 1_000;

const privacyCodeHash = (requestId: string, code: string): string =>
  hmacContactValue("contact-privacy-code", `${requestId}:${code}`);

const emailHash = (email: string): string =>
  hmacContactValue("contact-privacy-email", email);

const buildPrivacyVerificationEmail = (
  action: "access" | "delete",
  code: string
) => ({
  subject:
    action === "access"
      ? "Verify your contact data access request"
      : "Verify your contact data deletion request",
  text: `Your verification code is ${code}. It expires in 15 minutes. If you did not make this request, ignore this email.`,
  html: `<p>Your verification code is <strong>${code}</strong>.</p><p>It expires in 15 minutes. If you did not make this request, ignore this email.</p>`,
});

export const requestContactPrivacyAction = async (input: {
  email: string;
  action: "access" | "delete";
}) => {
  await connectDB();
  const requestId = randomUUID();
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const expiresAt = new Date(Date.now() + PRIVACY_CODE_TTL_MS);
  await ContactPrivacyRequest.create({
    request_id: requestId,
    action: input.action,
    email_hash: emailHash(input.email),
    verification_hash: privacyCodeHash(requestId, code),
    status: "active",
    attempts: 0,
    expires_at: expiresAt,
  });

  try {
    // Send the same verification flow even when no record exists. Besides
    // avoiding account enumeration, this lets the verified owner receive an
    // authoritative empty export instead of inferring state from email delivery.
    const email = buildPrivacyVerificationEmail(input.action, code);
    await sendEmail({
      to: input.email,
      subject: email.subject,
      text: email.text,
      html: email.html,
      messageId: `<contact-privacy.${requestId}@portfolio.local>`,
    });
  } catch {
    await ContactPrivacyRequest.deleteOne({ request_id: requestId });
    throw new AppError(
      httpStatus.SERVICE_UNAVAILABLE,
      "The privacy request service is temporarily unavailable"
    );
  }

  return {
    accepted: true as const,
    request_id: requestId,
    expires_at: expiresAt.toISOString(),
  };
};

const claimPrivacyRequest = async (input: {
  request_id: string;
  email: string;
  code: string;
}) => {
  const now = new Date();
  const claimed = await ContactPrivacyRequest.findOneAndUpdate(
    {
      request_id: input.request_id,
      email_hash: emailHash(input.email),
      verification_hash: privacyCodeHash(input.request_id, input.code),
      status: "active",
      attempts: { $lt: 5 },
      expires_at: { $gt: now },
    },
    {
      $set: { status: "processing", claimed_at: now },
      $inc: { attempts: 1 },
    },
    { new: true }
  ).select("request_id action status expires_at");
  if (claimed) return claimed;

  await ContactPrivacyRequest.updateOne(
    {
      request_id: input.request_id,
      email_hash: emailHash(input.email),
      status: "active",
      attempts: { $lt: 5 },
      expires_at: { $gt: now },
    },
    { $inc: { attempts: 1 } }
  );
  throw new AppError(
    httpStatus.BAD_REQUEST,
    "Verification failed or the request expired"
  );
};

const completeRequest = async (requestId: string, count: number) => {
  await ContactPrivacyRequest.updateOne(
    { request_id: requestId, status: "processing" },
    {
      $set: {
        status: "fulfilled",
        fulfilled_at: new Date(),
        result_count: count,
      },
    }
  );
};

const releaseClaim = async (requestId: string) => {
  await ContactPrivacyRequest.updateOne(
    { request_id: requestId, status: "processing" },
    { $set: { status: "active", claimed_at: null } }
  );
};

export const confirmContactPrivacyAction = async (input: {
  request_id: string;
  email: string;
  code: string;
}) => {
  await connectDB();
  const request = await claimPrivacyRequest(input);
  try {
    const contacts = await ContactRepository.findPrivacyContactsByEmail(
      input.email,
      MAX_SUBJECT_EXPORT_RECORDS + 1
    );
    if (contacts.length > MAX_SUBJECT_EXPORT_RECORDS) {
      throw new AppError(
        httpStatus.CONFLICT,
        "This request requires assisted privacy support"
      );
    }

    if (request.action === "delete") {
      const result = await anonymizeContacts({
        ids: contacts.map((contact) => String(contact._id)),
        actor: { type: "anonymous" },
        source: "api",
        reason_code: "subject_request",
      });
      await completeRequest(request.request_id, result.anonymized);
      return {
        action: "delete" as const,
        completed: result.held === 0 && result.conflicts === 0,
        anonymized: result.anonymized,
        held: result.held,
      };
    }

    const exportedAt = new Date();
    await Promise.all(
      contacts.map((contact) =>
        appendAuditEvent({
          action: "contact.exported",
          actor: { type: "anonymous" },
          target: {
            type: "contact",
            id: String(contact._id),
            revision: contact.revision ?? 0,
          },
          source: "api",
          summary_code: "contact_subject_access_exported",
          metadata: { request_channel: "api", result_count: 1 },
        })
      )
    );
    await completeRequest(request.request_id, contacts.length);
    return {
      action: "access" as const,
      schema_version: 1 as const,
      exported_at: exportedAt.toISOString(),
      records: contacts.map((contact) => ({
        id: String(contact._id),
        name: contact.name,
        email: contact.email,
        subject: contact.subject,
        message: contact.message,
        status: contact.status ?? "new",
        created_at: contact.created_at
          ? new Date(contact.created_at).toISOString()
          : null,
        updated_at: contact.updated_at
          ? new Date(contact.updated_at).toISOString()
          : null,
      })),
    };
  } catch (error) {
    await releaseClaim(request.request_id);
    throw error;
  }
};
