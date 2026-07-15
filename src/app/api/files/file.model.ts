import type { Query } from 'mongoose';
import mongoose, { Schema } from 'mongoose';
import type { TFile, TFileDocument, TFileModel } from './file.type';

const fileSchema = new Schema<TFileDocument>(
  {
    filename: {
      type: String,
      required: [true, 'File name is required'],
      trim: true,
    },
    originalname: {
      type: String,
      required: [true, 'Original name is required'],
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Display name is required'],
      trim: true,
    },
    url: {
      type: String,
      required: [true, 'URL is required'],
      trim: true,
    },
    mimetype: {
      type: String,
      required: [true, 'MIME type is required'],
      trim: true,
    },
    size: {
      type: Number,
      required: [true, 'Size is required'],
      min: [0, 'Size must be non-negative'],
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Author is required'],
    },
    provider: {
      type: String,
      enum: ['local', 'gcs', 'cloudinary'],
      required: [true, 'Provider is required'],
    },
    category: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    caption: {
      type: String,
      trim: true,
      maxlength: [500, 'Caption cannot exceed 500 characters'],
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'archived'],
      default: 'active',
    },
    is_deleted: {
      type: Boolean,
      default: false,
      select: false,
    },
    metadata: {
      path: String,
      bucket: String,
      storage_key: String,
      public_id: String,
      asset_id: String,
      cloud_name: String,
      folder: String,
      resource_type: {
        type: String,
        enum: ['image', 'video', 'raw'],
      },
      delivery_type: String,
      format: String,
      version: Number,
      etag: String,
      width: Number,
      height: Number,
      duration: Number,
      extension: String,
      file_type: String,
    },
    references: {
      type: [
        {
          model: {
            type: String,
            enum: [
              'Article',
              'Project',
              'User',
              'ArticleCategory',
              'ProjectCategory',
              'Review',
              'Contact',
              'ProjectResource',
            ],
            required: true,
          },
          entity: {
            type: Schema.Types.ObjectId,
            required: true,
            refPath: 'references.model',
          },
          field: { type: String, required: true, trim: true },
          attached_at: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    id: false,
  },
);

fileSchema.index({ author: 1 });
fileSchema.index({ category: 1 });
fileSchema.index({ provider: 1 });
fileSchema.index({ status: 1 });
fileSchema.index({ created_at: -1 });
fileSchema.index({ 'references.model': 1, 'references.entity': 1 });

fileSchema.methods.toJSON = function () {
  const file = this.toObject();
  delete file.is_deleted;
  return file;
};

fileSchema.pre(/^find/, function (next) {
  const query = this as unknown as Query<TFile, TFile>;
  const opts = query.getOptions();

  if (!opts?.bypassDeleted && query.getQuery().is_deleted === undefined) {
    query.setQuery({
      ...query.getQuery(),
      is_deleted: { $ne: true },
    });
  }

  next();
});

fileSchema.pre('aggregate', function (next) {
  this.pipeline().unshift({ $match: { is_deleted: { $ne: true } } });
  next();
});

fileSchema.statics.isFileExist = async function (_id: string) {
  return await this.findById(_id);
};

fileSchema.methods.softDelete = async function () {
  this.is_deleted = true;
  return await this.save();
};

export const File =
  (mongoose.models.File as TFileModel) ||
  mongoose.model<TFileDocument, TFileModel>('File', fileSchema);

export default File;
