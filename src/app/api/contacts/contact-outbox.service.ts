import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import OutboxEvent, {
  type TOutboxEventDocument,
} from "@/app/api/outbox-events/outbox-event.model";
import { ENV } from "@/config";
import connectDB from "@/lib/db";
import { sendEmail } from "@/utils/send-email";
import Contact from "./contact.model";
import { buildContactNotificationEmail } from "./contact-email";

const LOCK_DURATION_MS = 2 * 60 * 1_000;
const BASE_RETRY_DELAY_MS = 60 * 1_000;
const MAX_RETRY_DELAY_MS = 6 * 60 * 60 * 1_000;

const boundedInteger = (
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number
): number => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum
    ? parsed
    : fallback;
};

export const getContactWorkerConfig = () => ({
  batchSize: boundedInteger(ENV.contact_worker_batch_size, 10, 1, 50),
  maxAttempts: boundedInteger(ENV.contact_worker_max_attempts, 5, 1, 12),
});

export const getContactRetryDelayMs = (attempts: number): number =>
  Math.min(
    MAX_RETRY_DELAY_MS,
    BASE_RETRY_DELAY_MS * 2 ** Math.max(0, attempts - 1)
  );

export const getContactFailureState = (
  attempts: number,
  maxAttempts: number
): "retrying" | "dead_letter" =>
  attempts >= maxAttempts ? "dead_letter" : "retrying";

export const isAuthorizedContactWorkerRequest = (request: Request): boolean => {
  const secret = ENV.contact_worker_secret?.trim();
  if (!secret || (ENV.environment === "production" && secret.length < 32)) {
    return false;
  }
  const header = request.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!provided || provided.length > 256) return false;
  const expectedHash = createHash("sha256").update(secret).digest();
  const providedHash = createHash("sha256").update(provided).digest();
  return timingSafeEqual(expectedHash, providedHash);
};

const claimNextEvent = async (
  now: Date
): Promise<TOutboxEventDocument | null> => {
  const token = randomUUID();
  return await OutboxEvent.findOneAndUpdate(
    {
      event_type: "contact.notification.requested",
      next_attempt_at: { $lte: now },
      $or: [
        { status: "pending" },
        {
          status: "processing",
          lock_expires_at: { $lte: now },
        },
      ],
    },
    {
      $set: {
        status: "processing",
        locked_at: now,
        lock_expires_at: new Date(now.getTime() + LOCK_DURATION_MS),
        lock_token: token,
      },
      $inc: { attempts: 1 },
    },
    { new: true, sort: { created_at: 1 } }
  ).select("+lock_token +locked_at +lock_expires_at");
};

const cancelUnavailableContact = async (
  event: TOutboxEventDocument
): Promise<void> => {
  await OutboxEvent.updateOne(
    { _id: event._id, lock_token: event.lock_token, status: "processing" },
    {
      $set: {
        status: "cancelled",
        last_error_code: "contact_unavailable",
      },
      $unset: {
        lock_token: 1,
        locked_at: 1,
        lock_expires_at: 1,
      },
    }
  );
};

const deliverClaimedEvent = async (
  event: TOutboxEventDocument,
  now = new Date(),
  emailSender: typeof sendEmail = sendEmail
): Promise<"delivered" | "retrying" | "dead_letter" | "cancelled"> => {
  const contact = await Contact.findOne({
    _id: event.aggregate_id,
    anonymized_at: null,
    retention_expires_at: { $gt: now },
  })
    .select("name email subject message")
    .lean();
  if (!contact) {
    await cancelUnavailableContact(event);
    return "cancelled";
  }
  await Contact.updateOne(
    { _id: event.aggregate_id },
    { $set: { delivery_status: "processing" } }
  );

  try {
    const email = buildContactNotificationEmail(contact);
    await emailSender({
      to: ENV.auth_user_email,
      subject: email.subject,
      text: email.text,
      html: email.html,
      replyTo: email.replyTo,
      messageId: `<contact.${event._id.toString()}@portfolio.local>`,
    });

    const updated = await OutboxEvent.updateOne(
      { _id: event._id, lock_token: event.lock_token, status: "processing" },
      {
        $set: {
          status: "delivered",
          delivered_at: now,
          last_error_code: null,
        },
        $unset: {
          lock_token: 1,
          locked_at: 1,
          lock_expires_at: 1,
        },
      }
    );
    if (updated.modifiedCount === 1) {
      await Contact.updateOne(
        { _id: event.aggregate_id },
        { $set: { delivery_status: "delivered" } }
      );
    }
    return "delivered";
  } catch {
    const { maxAttempts } = getContactWorkerConfig();
    const failureState = getContactFailureState(event.attempts, maxAttempts);
    const deadLetter = failureState === "dead_letter";
    await OutboxEvent.updateOne(
      { _id: event._id, lock_token: event.lock_token, status: "processing" },
      {
        $set: {
          status: deadLetter ? "dead_letter" : "pending",
          next_attempt_at: new Date(
            now.getTime() + getContactRetryDelayMs(event.attempts)
          ),
          last_error_code: "provider_failure",
          ...(deadLetter ? { dead_lettered_at: now } : {}),
        },
        $unset: {
          lock_token: 1,
          locked_at: 1,
          lock_expires_at: 1,
        },
      }
    );
    await Contact.updateOne(
      { _id: event.aggregate_id },
      {
        $set: {
          delivery_status: deadLetter ? "dead_letter" : "retrying",
        },
      }
    );
    return deadLetter ? "dead_letter" : "retrying";
  }
};

export type ContactOutboxRunResult = {
  claimed: number;
  delivered: number;
  retrying: number;
  dead_letter: number;
  cancelled: number;
};

export const processContactOutbox = async (
  emailSender: typeof sendEmail = sendEmail
): Promise<ContactOutboxRunResult> => {
  await connectDB();
  const result: ContactOutboxRunResult = {
    claimed: 0,
    delivered: 0,
    retrying: 0,
    dead_letter: 0,
    cancelled: 0,
  };
  const { batchSize } = getContactWorkerConfig();
  const events: TOutboxEventDocument[] = [];

  for (let index = 0; index < batchSize; index += 1) {
    const event = await claimNextEvent(new Date());
    if (!event) break;
    result.claimed += 1;
    events.push(event);
  }

  const outcomes = await Promise.all(
    events.map((event) => deliverClaimedEvent(event, new Date(), emailSender))
  );
  for (const outcome of outcomes) {
    result[outcome] += 1;
  }

  return result;
};

export const retryContactOutboxEvent = async (
  eventId: string
): Promise<boolean> => {
  await connectDB();
  const result = await OutboxEvent.updateOne(
    {
      _id: eventId,
      event_type: "contact.notification.requested",
      status: { $in: ["dead_letter", "cancelled"] },
    },
    {
      $set: {
        status: "pending",
        attempts: 0,
        next_attempt_at: new Date(),
        last_error_code: null,
      },
      $unset: { dead_lettered_at: 1, delivered_at: 1 },
    }
  );
  return result.modifiedCount === 1;
};
