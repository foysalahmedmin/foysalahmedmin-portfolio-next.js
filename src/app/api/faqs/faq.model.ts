import mongoose, { Schema, type Model } from "mongoose";
import {
  commonRecordFields,
  configureRepeatableRecordSchema,
} from "../repeatable-content/record.model";
import { FAQ_CATEGORIES, type TFAQ } from "./faq.type";

const schema = new Schema<TFAQ>({
  ...commonRecordFields,
  answer: { type: String, required: true, trim: true, maxlength: 5_000 },
  category: {
    type: String,
    enum: FAQ_CATEGORIES,
    default: "general",
    required: true,
  },
  keywords: { type: [String], default: [] },
  visual_file: { type: Schema.Types.ObjectId, ref: "File", default: null },
});

configureRepeatableRecordSchema(schema, {
  index_prefix: "faq",
  search_fields: ["title", "summary", "answer", "keywords"],
  additional_indexes: [
    [
      { category: 1, status: 1, sequence: 1, _id: 1 },
      {
        partialFilterExpression: { is_deleted: false },
        name: "faq_public_category_sequence",
      },
    ],
  ],
});

const FAQ =
  (mongoose.models.FAQ as Model<TFAQ>) || mongoose.model<TFAQ>("FAQ", schema);

export default FAQ;
