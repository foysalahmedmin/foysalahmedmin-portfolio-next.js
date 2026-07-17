import bcrypt from "bcrypt";
import mongoose, { Schema } from "mongoose";
import { ENV } from "@/config";
import { applySoftDeletePlugin } from "@/lib/db/soft-delete";
import type { TUserDocument, TUserModel } from "./user.type";

const userSchema = new Schema<TUserDocument>(
  {
    image: {
      type: Schema.Types.ObjectId,
      ref: "File",
      default: null,
    },
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: [12, "Password must be at least 12 characters"],
      maxlength: [72, "Password cannot exceed 72 characters"],
      validate: {
        validator: (value: string) => Buffer.byteLength(value, "utf8") <= 72,
        message: "Password cannot exceed 72 UTF-8 bytes",
      },
      select: false,
    },
    password_changed_at: { type: Date, default: Date.now, select: false },
    mfa_version: {
      type: Number,
      min: 0,
      default: 0,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: [
        "super-admin",
        "admin",
        "editor",
        "author",
        "contributor",
        "subscriber",
        "user",
      ],
      required: true,
    },
    status: {
      type: String,
      enum: ["in-progress", "blocked"],
      default: "in-progress",
    },
    is_verified: { type: Boolean, default: false },
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

userSchema.index(
  { email: 1 },
  {
    unique: true,
    partialFilterExpression: { is_deleted: false },
    name: "unique_email_not_deleted",
  }
);

// toJSON override to remove sensitive fields from output
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  delete user.password_changed_at;
  delete user.mfa_version;
  return user;
};

// Post save middleware/ hook
userSchema.post("save", function (document, next) {
  document.password = "";
  next();
});

// Pre save middleware/ hook
userSchema.pre("save", async function (next) {
  // Hash password
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(
      this.password,
      Number(ENV.bcrypt_salt_rounds)
    );
    if (!this.isNew) {
      this.password_changed_at = new Date();
    }
  }

  // Reset is_verified on email change
  if (this.isModified("email")) {
    this.is_verified = false;
  }

  next();
});

applySoftDeletePlugin(userSchema);

// Static methods
userSchema.statics.isUserExist = async function (_id: string) {
  return await this.findById(_id).select("+password +password_changed_at");
};

userSchema.statics.isUserExistByEmail = async function (email: string) {
  return await this.findOne({ email: email }).select(
    "+password +password_changed_at"
  );
};

// Instance methods
userSchema.methods.softDelete = async function () {
  this.is_deleted = true;
  this.deleted_at = new Date();
  return await this.save();
};

export const User =
  (mongoose.models.User as TUserModel) ||
  mongoose.model<TUserDocument, TUserModel>("User", userSchema);

export default User;
