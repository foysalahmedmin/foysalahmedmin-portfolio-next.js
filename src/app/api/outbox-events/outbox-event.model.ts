import mongoose, {
  Schema,
  type Document,
  type Model,
  type Types,
} from "mongoose";

export const OUTBOX_STATUSES = [
  "pending",
  "processing",
  "delivered",
  "dead_letter",
  "cancelled",
] as const;

export type TOutboxStatus = (typeof OUTBOX_STATUSES)[number];

export type TOutboxEventDocument = Document & {
  _id: Types.ObjectId;
  event_type: "contact.notification.requested";
  aggregate_type: "contact";
  aggregate_id: Types.ObjectId;
  status: TOutboxStatus;
  attempts: number;
  next_attempt_at: Date;
  locked_at?: Date | null;
  lock_expires_at?: Date | null;
  lock_token?: string | null;
  last_error_code?: "provider_failure" | "contact_unavailable" | null;
  delivered_at?: Date | null;
  dead_lettered_at?: Date | null;
  created_at: Date;
  updated_at: Date;
};

const outboxEventSchema = new Schema<TOutboxEventDocument>(
  {
    event_type: { type: String, required: true, immutable: true },
    aggregate_type: { type: String, required: true, immutable: true },
    aggregate_id: {
      type: Schema.Types.ObjectId,
      required: true,
      immutable: true,
      index: true,
    },
    status: {
      type: String,
      enum: OUTBOX_STATUSES,
      required: true,
      default: "pending",
    },
    attempts: { type: Number, required: true, default: 0, min: 0 },
    next_attempt_at: { type: Date, required: true, default: Date.now },
    locked_at: { type: Date, default: null, select: false },
    lock_expires_at: { type: Date, default: null, select: false },
    lock_token: { type: String, default: null, select: false },
    last_error_code: {
      type: String,
      enum: ["provider_failure", "contact_unavailable", null],
      default: null,
    },
    delivered_at: { type: Date, default: null },
    dead_lettered_at: { type: Date, default: null },
  },
  {
    collection: "outbox_events",
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    versionKey: false,
  }
);

outboxEventSchema.index({ status: 1, next_attempt_at: 1, created_at: 1 });
outboxEventSchema.index(
  { event_type: 1, aggregate_id: 1 },
  {
    name: "one_contact_notification_outbox_event",
    unique: true,
    partialFilterExpression: {
      event_type: "contact.notification.requested",
    },
  }
);

const OutboxEvent =
  (mongoose.models.OutboxEvent as Model<TOutboxEventDocument>) ||
  mongoose.model<TOutboxEventDocument>("OutboxEvent", outboxEventSchema);

export default OutboxEvent;
