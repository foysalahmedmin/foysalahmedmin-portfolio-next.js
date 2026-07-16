import mongoose, { Schema } from "mongoose";
import { applySoftDeletePlugin } from "@/lib/db/soft-delete";
import type { TContactDocument, TContactModel } from "./contact.type";
import {
  CONTACT_DELIVERY_STATUSES as deliveryStatuses,
  CONTACT_RETENTION_HOLD_REASONS as retentionHoldReasons,
  CONTACT_STATUSES as contactStatuses,
} from "./contact.type";

const retentionHoldSchema = new Schema(
  {
    reason_code: {
      type: String,
      enum: retentionHoldReasons,
      required: true,
    },
    expires_at: { type: Date, required: true },
    placed_at: { type: Date, required: true },
    placed_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { _id: false, id: false }
);

const contactSchema = new Schema<TContactDocument>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },
    subject: {
      type: String,
      required: [true, "Subject is required"],
      trim: true,
      minlength: [2, "Subject must be at least 2 characters"],
      maxlength: [200, "Subject cannot exceed 200 characters"],
    },
    message: {
      type: String,
      required: [true, "Message is required"],
      trim: true,
      minlength: [10, "Message must be at least 10 characters"],
      maxlength: [2000, "Message cannot exceed 2000 characters"],
    },
    status: {
      type: String,
      enum: contactStatuses,
      default: "new",
      required: true,
      index: true,
    },
    delivery_status: {
      type: String,
      enum: deliveryStatuses,
      default: "queued",
      required: true,
      index: true,
    },
    revision: {
      type: Number,
      default: 0,
      min: 0,
      max: 1_000_000_000,
      required: true,
      validate: Number.isSafeInteger,
    },
    status_changed_at: {
      type: Date,
      default: Date.now,
      required: true,
    },
    status_changed_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    retention_expires_at: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      index: true,
    },
    retention_hold: {
      type: retentionHoldSchema,
      default: null,
    },
    anonymized_at: {
      type: Date,
      default: null,
    },
    purge_after: {
      type: Date,
      default: null,
      index: true,
    },
    is_deleted: { type: Boolean, default: false, select: false },
    deleted_at: { type: Date, default: null, select: false },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

contactSchema.methods.toJSON = function () {
  const contact = this.toObject();
  return contact;
};

applySoftDeletePlugin(contactSchema);

contactSchema.index(
  { status: 1, delivery_status: 1, created_at: -1 },
  { name: "contact_inbox_status_delivery_created" }
);
contactSchema.index(
  { "retention_hold.expires_at": 1, retention_expires_at: 1 },
  { name: "contact_retention_hold_expiry" }
);

// Static methods
contactSchema.statics.isContactExist = async function (_id: string) {
  return await this.findById(_id);
};

contactSchema.statics.isContactExistByEmail = async function (email: string) {
  return await this.findOne({ email: email });
};

export const Contact =
  (mongoose.models.Contact as TContactModel) ||
  mongoose.model<TContactDocument, TContactModel>("Contact", contactSchema);

export default Contact;
