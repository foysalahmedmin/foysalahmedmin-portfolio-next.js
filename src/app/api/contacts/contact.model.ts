import type { Query} from 'mongoose';
import mongoose, { Schema } from 'mongoose';
import type {
  TContact,
  TContactDocument,
  TContactModel,
} from './contact.type';

const contactSchema = new Schema<TContactDocument>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
      minlength: [2, 'Subject must be at least 2 characters'],
      maxlength: [200, 'Subject cannot exceed 200 characters'],
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
      minlength: [10, 'Message must be at least 10 characters'],
      maxlength: [2000, 'Message cannot exceed 2000 characters'],
    },
    is_deleted: { type: Boolean, default: false, select: false },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

contactSchema.methods.toJSON = function () {
  const contact = this.toObject();
  delete contact.is_deleted;
  return contact;
};

// Query middleware to exclude deleted contacts
contactSchema.pre(
  /^find/,
  function (this: Query<TContact, TContact>, next) {
    const query = this as unknown as Query<TContact, TContact>;
    const opts = query.getOptions();

    if (!opts?.bypassDeleted && query.getQuery().is_deleted === undefined) {
      query.setQuery({
        ...query.getQuery(),
        is_deleted: { $ne: true },
      });
    }

    next();
  },
);

contactSchema.pre(
  /^update/,
  function (this: Query<TContact, TContact>, next) {
    const query = this as unknown as Query<TContact, TContact>;
    const opts = query.getOptions();

    if (!opts?.bypassDeleted && query.getQuery().is_deleted === undefined) {
      query.setQuery({
        ...query.getQuery(),
        is_deleted: { $ne: true },
      });
    }

    next();
  },
);

// Aggregation pipeline
contactSchema.pre('aggregate', function (next) {
  this.pipeline().unshift({ $match: { is_deleted: { $ne: true } } });
  next();
});

// Static methods
contactSchema.statics.isContactExist = async function (_id: string) {
  return await this.findById(_id);
};

contactSchema.statics.isContactExistByEmail = async function (email: string) {
  return await this.findOne({ email: email });
};

// Instance methods
contactSchema.methods.softDelete = async function () {
  this.is_deleted = true;
  return await this.save();
};

export const Contact =
  (mongoose.models.Contact as TContactModel) ||
  mongoose.model<TContactDocument, TContactModel>(
    'Contact',
    contactSchema,
  );

export default Contact;

