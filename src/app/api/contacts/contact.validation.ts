import { z } from "zod";
import { contactSubmissionSchema } from "./contact-public.contract";
import {
  CONTACT_DELIVERY_STATUSES,
  CONTACT_RETENTION_HOLD_REASONS,
  CONTACT_STATUSES,
} from "./contact.type";

export const contactIdSchema = z
  .string()
  .regex(/^[0-9a-f]{24}$/i, "Invalid ID format");

const expectedRevisionSchema = z.number().int().min(0).max(1_000_000_000);

const contactIdsSchema = z
  .array(contactIdSchema)
  .min(1, "At least one contact ID is required")
  .max(100, "At most 100 contacts can be changed at once")
  .refine((values) => new Set(values).size === values.length, {
    message: "Contact IDs must be unique",
  });

export const createContactSchema = z.object({
  body: contactSubmissionSchema,
});

export const contactInboxQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(10_000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    search: z.string().trim().max(120).optional(),
    status: z.enum(CONTACT_STATUSES).optional(),
    delivery_status: z.enum(CONTACT_DELIVERY_STATUSES).optional(),
    deleted_scope: z
      .enum(["active", "with_deleted", "only_deleted"])
      .default("active"),
    retention: z.enum(["all", "due", "held", "anonymized"]).default("all"),
    sort: z
      .enum([
        "created_at",
        "-created_at",
        "updated_at",
        "-updated_at",
        "status",
        "-status",
      ])
      .default("-created_at"),
  })
  .strict();

export type TContactInboxQuery = z.infer<typeof contactInboxQuerySchema>;

export const parseContactInboxQuery = (
  value: Record<string, string>
): TContactInboxQuery => contactInboxQuerySchema.parse(value);

export const updateContactByIdSchema = z.object({
  params: z.object({ id: contactIdSchema }),
  body: z
    .object({
      status: z.enum(CONTACT_STATUSES),
      expected_revision: expectedRevisionSchema,
    })
    .strict(),
});

export const updateContactsSchema = z.object({
  body: z
    .object({
      ids: contactIdsSchema,
      status: z.enum(CONTACT_STATUSES),
    })
    .strict(),
});

export const contactByIdOperationValidationSchema = z.object({
  params: z.object({ id: contactIdSchema }),
});

export const contactsOperationValidationSchema = z.object({
  body: z.object({ ids: contactIdsSchema }).strict(),
});

export const retryContactDeliverySchema = z.object({
  params: z.object({ id: contactIdSchema }),
  body: z.object({ expected_revision: expectedRevisionSchema }).strict(),
});

export const placeContactRetentionHoldSchema = z.object({
  params: z.object({ id: contactIdSchema }),
  body: z
    .object({
      reason_code: z.enum(CONTACT_RETENTION_HOLD_REASONS),
      expires_at: z.iso.datetime({ offset: true }),
      expected_revision: expectedRevisionSchema,
    })
    .strict(),
});

export const releaseContactRetentionHoldSchema = z.object({
  params: z.object({ id: contactIdSchema }),
  body: z.object({ expected_revision: expectedRevisionSchema }).strict(),
});

export const anonymizeContactSchema = z.object({
  params: z.object({ id: contactIdSchema }),
  body: z.object({ expected_revision: expectedRevisionSchema }).strict(),
});

export const CONTACT_PRIVACY_ACTIONS = ["access", "delete"] as const;

export const contactPrivacyRequestSchema = z
  .object({
    email: z.string().trim().toLowerCase().email().max(254),
    action: z.enum(CONTACT_PRIVACY_ACTIONS),
  })
  .strict();

export const contactPrivacyConfirmSchema = z
  .object({
    request_id: z.uuid(),
    email: z.string().trim().toLowerCase().email().max(254),
    code: z.string().regex(/^\d{6}$/, "Use the six-digit verification code"),
  })
  .strict();
