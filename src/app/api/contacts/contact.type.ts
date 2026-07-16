import type { Document, Model, Types } from "mongoose";

export const CONTACT_STATUSES = [
  "new",
  "read",
  "replied",
  "qualified",
  "spam",
  "archived",
] as const;

export const CONTACT_DELIVERY_STATUSES = [
  "queued",
  "processing",
  "delivered",
  "retrying",
  "dead_letter",
  "cancelled",
] as const;

export const CONTACT_RETENTION_HOLD_REASONS = [
  "legal_obligation",
  "security_investigation",
  "dispute_preservation",
] as const;

export type TContactStatus = (typeof CONTACT_STATUSES)[number];
export type TContactDeliveryStatus = (typeof CONTACT_DELIVERY_STATUSES)[number];
export type TContactRetentionHoldReason =
  (typeof CONTACT_RETENTION_HOLD_REASONS)[number];

export type TContactRetentionHold = {
  reason_code: TContactRetentionHoldReason;
  expires_at: Date | string;
  placed_at: Date | string;
  placed_by: Types.ObjectId | string;
};

export type TContact = {
  name: string;
  email: string;
  subject: string;
  message: string;
  status?: TContactStatus;
  delivery_status?: TContactDeliveryStatus;
  revision?: number;
  status_changed_at?: Date | string;
  status_changed_by?: Types.ObjectId | string | null;
  retention_expires_at?: Date | string;
  retention_hold?: TContactRetentionHold | null;
  anonymized_at?: Date | string | null;
  purge_after?: Date | string | null;
  is_deleted?: boolean;
  deleted_at?: Date | string | null;
  created_at?: Date | string;
  updated_at?: Date | string;
};

export interface TContactDocument extends TContact, Document {
  _id: Types.ObjectId;
}

export interface TContactModel extends Model<TContactDocument> {
  isContactExist(_id: string): Promise<TContactDocument | null>;
  isContactExistByEmail(email: string): Promise<TContactDocument | null>;
}
