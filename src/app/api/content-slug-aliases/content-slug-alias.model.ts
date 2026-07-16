import mongoose, { Schema, type Model, type Types } from "mongoose";

export const CONTENT_SLUG_SCOPES = [
  "project",
  "article",
  "project_category",
  "article_category",
] as const;

export type ContentSlugScope = (typeof CONTENT_SLUG_SCOPES)[number];

export type ContentSlugAlias = {
  scope: ContentSlugScope;
  slug: string;
  target: Types.ObjectId;
  created_at?: Date;
};

const contentSlugAliasSchema = new Schema<ContentSlugAlias>(
  {
    scope: { type: String, enum: CONTENT_SLUG_SCOPES, required: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    target: { type: Schema.Types.ObjectId, required: true },
  },
  {
    collection: "content_slug_aliases",
    timestamps: { createdAt: "created_at", updatedAt: false },
    versionKey: false,
  }
);

contentSlugAliasSchema.index(
  { scope: 1, slug: 1 },
  { unique: true, name: "unique_content_slug_alias" }
);
contentSlugAliasSchema.index(
  { scope: 1, target: 1 },
  { name: "content_slug_alias_target" }
);

export const ContentSlugAliasModel =
  (mongoose.models.ContentSlugAlias as Model<ContentSlugAlias> | undefined) ??
  mongoose.model<ContentSlugAlias>("ContentSlugAlias", contentSlugAliasSchema);

export default ContentSlugAliasModel;
