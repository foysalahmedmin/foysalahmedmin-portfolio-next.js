import AppError from "@/builder/app-error";
import { ENV } from "@/config";
import type { UploadApiResponse } from "cloudinary";
import httpStatus from "http-status";
import path from "node:path";
import type {
  TCloudinaryResourceType,
  TCloudStorageProvider,
  TStorageAdapter,
  TStorageDeleteInput,
  TStorageDeliveryInput,
  TStorageListInput,
  TStoredObject,
} from "./storage.type";

const getRequiredEnv = (value: string | undefined, name: string): string => {
  const normalized = value?.trim();
  if (!normalized) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      `${name} is required for the selected storage provider`
    );
  }
  return normalized;
};

export const getConfiguredStorageProvider = (): TCloudStorageProvider => {
  const provider = ENV.storage_provider || "cloudinary";
  if (provider !== "cloudinary" && provider !== "gcp") {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'STORAGE_PROVIDER must be either "cloudinary" or "gcp"'
    );
  }
  return provider;
};

const normalizeFolder = (value?: string): string | undefined => {
  const folder = value?.trim().replace(/^\/+|\/+$/g, "");
  if (!folder) return undefined;
  if (folder.split("/").some((segment) => segment === "..")) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Storage folder cannot contain parent-directory segments"
    );
  }
  return folder;
};

const createGcsClient = async () => {
  const { Storage } = await import("@google-cloud/storage");
  return new Storage({
    ...(ENV.gcp_credentials_path && {
      keyFilename: ENV.gcp_credentials_path,
    }),
    ...(ENV.gcp_project_id && { projectId: ENV.gcp_project_id }),
  });
};

let gcsClientPromise: ReturnType<typeof createGcsClient> | undefined;
const lazyGcsClient = () => {
  gcsClientPromise ??= createGcsClient();
  return gcsClientPromise;
};

const createCloudinaryClient = async () => {
  const cloudName = getRequiredEnv(
    ENV.cloudinary_cloud_name,
    "CLOUDINARY_CLOUD_NAME"
  );
  const apiKey = getRequiredEnv(ENV.cloudinary_api_key, "CLOUDINARY_API_KEY");
  const apiSecret = getRequiredEnv(
    ENV.cloudinary_api_secret,
    "CLOUDINARY_API_SECRET"
  );
  const { v2: cloudinary } = await import("cloudinary");
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
  return cloudinary;
};

let cloudinaryClientPromise:
  | ReturnType<typeof createCloudinaryClient>
  | undefined;
const lazyCloudinaryClient = () => {
  cloudinaryClientPromise ??= createCloudinaryClient();
  return cloudinaryClientPromise;
};

const getCloudinaryFilename = (result: {
  public_id: string;
  resource_type: string;
  format?: string;
}): string => {
  const baseName = path.posix.basename(result.public_id);
  if (
    result.resource_type === "raw" ||
    !result.format ||
    baseName.toLowerCase().endsWith(`.${result.format.toLowerCase()}`)
  ) {
    return baseName;
  }
  return `${baseName}.${result.format}`;
};

const encodeStoragePath = (value: string): string =>
  value.split("/").map(encodeURIComponent).join("/");

const createGcpPublicUrl = (bucket: string, filename: string): string =>
  `https://storage.googleapis.com/${encodeURIComponent(bucket)}/${encodeStoragePath(filename)}`;

const assertGcpObjectIsPublic = async (publicUrl: string): Promise<void> => {
  let response: Response;
  try {
    response = await fetch(publicUrl, { method: "HEAD", cache: "no-store" });
  } catch {
    throw new AppError(
      httpStatus.BAD_GATEWAY,
      "GCP object public access could not be verified"
    );
  }

  if (!response.ok) {
    throw new AppError(
      httpStatus.BAD_GATEWAY,
      "GCP bucket uses uniform access but is not publicly readable. Grant allUsers the Storage Object Viewer role or disable public uploads."
    );
  }
};

const assertGcpObjectIsPrivate = async (publicUrl: string): Promise<void> => {
  let response: Response;
  try {
    response = await fetch(publicUrl, { method: "HEAD", cache: "no-store" });
  } catch {
    throw new AppError(
      httpStatus.BAD_GATEWAY,
      "GCP private object access could not be verified"
    );
  }
  if (response.ok) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "GCP private media bucket is publicly readable"
    );
  }
};

const gcpAdapter: TStorageAdapter = {
  provider: "gcp",
  async upload(input, config) {
    const bucketName = getRequiredEnv(
      input.access === "private"
        ? ENV.gcp_private_bucket_name
        : config.bucket || ENV.gcp_public_bucket_name,
      input.access === "private"
        ? "GCP_PRIVATE_BUCKET_NAME"
        : "GCP_PUBLIC_BUCKET_NAME"
    );
    if (
      input.access === "private" &&
      bucketName === ENV.gcp_public_bucket_name
    ) {
      throw new AppError(
        httpStatus.INTERNAL_SERVER_ERROR,
        "GCP public and private media must use different buckets"
      );
    }
    const client = await lazyGcsClient();
    const bucket = client.bucket(bucketName);
    const extension = path.extname(input.filename).toLowerCase();
    const filename = `${input.immutable_key}${extension}`;
    const bucketFile = bucket.file(filename);
    const publicUrl = createGcpPublicUrl(bucketName, filename);
    let saved = false;

    try {
      await bucketFile.save(input.buffer, {
        resumable: input.buffer.byteLength > 5_000_000,
        preconditionOpts: { ifGenerationMatch: 0 },
        metadata: {
          contentType: input.mimetype,
          cacheControl:
            input.access === "public"
              ? "public,max-age=31536000,immutable"
              : "private,no-store",
          contentDisposition: "inline",
          metadata: {
            checksum: input.checksum,
            fieldName: config.name,
          },
        },
      });
      saved = true;

      if (input.access === "public") {
        try {
          await bucketFile.makePublic();
        } catch (error: unknown) {
          const message = ((error as Error)?.message || "").toLowerCase();
          if (!message.includes("uniform bucket-level access")) throw error;
          await assertGcpObjectIsPublic(publicUrl);
        }
      } else {
        await bucketFile
          .makePrivate({ strict: true })
          .catch((error: unknown) => {
            const message = ((error as Error)?.message || "").toLowerCase();
            if (!message.includes("uniform bucket-level access")) throw error;
          });
        await assertGcpObjectIsPrivate(publicUrl);
      }

      return {
        provider: "gcp",
        field_name: config.name,
        original_name: input.original_name,
        filename,
        storage_key: filename,
        bucket: bucketName,
        ...(input.access === "public" && { public_url: publicUrl }),
        size: input.buffer.byteLength,
        mimetype: input.mimetype,
        uploaded_at: new Date(),
      };
    } catch (error) {
      if (saved) await bucketFile.delete().catch(() => undefined);
      throw error;
    }
  },
  async remove(input) {
    const bucketName = getRequiredEnv(
      input.bucket || ENV.gcp_bucket_name,
      "GCP_BUCKET_NAME"
    );
    const client = await lazyGcsClient();
    try {
      await client.bucket(bucketName).file(input.storage_key).delete();
    } catch (error: unknown) {
      if ((error as { code?: number }).code !== 404) throw error;
    }
  },
  async getDeliveryUrl(input) {
    const bucketName = getRequiredEnv(
      input.bucket || ENV.gcp_bucket_name,
      "GCP_BUCKET_NAME"
    );
    if (input.access === "public") {
      return (
        input.public_url || createGcpPublicUrl(bucketName, input.storage_key)
      );
    }
    const client = await lazyGcsClient();
    const [signedUrl] = await client
      .bucket(bucketName)
      .file(input.storage_key)
      .getSignedUrl({
        version: "v4",
        action: "read",
        expires: Date.now() + input.expires_in_seconds * 1000,
        responseDisposition: `${input.disposition}; filename="${input.filename.replace(/["\\\r\n]/g, "_")}"`,
        responseType: undefined,
      });
    return signedUrl;
  },
  async listManagedObjects(input) {
    const bucketName = getRequiredEnv(input.bucket, "GCP media bucket");
    const client = await lazyGcsClient();
    const [files] = await client.bucket(bucketName).getFiles({
      prefix: input.prefix,
      maxResults: input.limit,
      autoPaginate: false,
    });
    return files
      .map((file): TStoredObject | null => {
        const createdAt = new Date(file.metadata.timeCreated || 0);
        if (
          !Number.isFinite(createdAt.getTime()) ||
          createdAt > input.older_than
        ) {
          return null;
        }
        return {
          provider: "gcp",
          storage_key: file.name,
          bucket: bucketName,
          created_at: createdAt,
        };
      })
      .filter((value): value is TStoredObject => Boolean(value));
  },
};

const cloudinaryAdapter: TStorageAdapter = {
  provider: "cloudinary",
  async upload(input, config) {
    const cloudinary = await lazyCloudinaryClient();
    const folder = normalizeFolder(config.folder || ENV.cloudinary_folder);
    const storageKey = [folder, input.immutable_key].filter(Boolean).join("/");
    const isRaw = input.mimetype === "application/pdf";
    const publicId = isRaw ? `${storageKey}.pdf` : storageKey;
    const deliveryType =
      input.access === "private" ? "authenticated" : "upload";
    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          resource_type: isRaw ? "raw" : "image",
          type: deliveryType,
          public_id: publicId,
          use_filename: false,
          unique_filename: false,
          overwrite: false,
          filename_override: input.filename,
          context: `checksum=${input.checksum}`,
        },
        (error, uploadResult) => {
          if (error) return reject(error);
          if (!uploadResult) {
            return reject(new Error("Empty Cloudinary upload response"));
          }
          resolve(uploadResult);
        }
      );
      stream.end(input.buffer);
    });

    const resourceType = result.resource_type;
    if (!["image", "video", "raw"].includes(resourceType)) {
      await cloudinary.uploader
        .destroy(result.public_id, { resource_type: resourceType })
        .catch(() => undefined);
      throw new Error(`Unsupported Cloudinary resource type: ${resourceType}`);
    }

    if (result.public_id !== publicId) {
      await cloudinary.uploader
        .destroy(result.public_id, {
          resource_type: resourceType,
          type: result.type || "upload",
          invalidate: true,
        })
        .catch(() => undefined);
      throw new Error("Cloudinary uploaded the asset with an unexpected key");
    }

    return {
      provider: "cloudinary",
      field_name: config.name,
      original_name: input.original_name,
      filename: getCloudinaryFilename(result),
      storage_key: result.public_id,
      ...(input.access === "public" && { public_url: result.secure_url }),
      size: result.bytes,
      mimetype: input.mimetype,
      uploaded_at: new Date(result.created_at),
      folder,
      public_id: result.public_id,
      asset_id:
        typeof result.asset_id === "string" ? result.asset_id : undefined,
      cloud_name: ENV.cloudinary_cloud_name,
      resource_type: resourceType as TCloudinaryResourceType,
      delivery_type: result.type || "upload",
      format: result.format,
      version: result.version,
      etag: result.etag,
      width: result.width,
      height: result.height,
      duration:
        typeof result.duration === "number" ? result.duration : undefined,
    };
  },
  async remove(input) {
    const cloudinary = await lazyCloudinaryClient();
    const result = (await cloudinary.uploader.destroy(input.storage_key, {
      resource_type: input.resource_type || "image",
      type: input.delivery_type || "upload",
      invalidate: true,
    })) as { result?: string };

    if (result.result !== "ok" && result.result !== "not found") {
      throw new Error(
        `Cloudinary returned an unexpected delete result: ${result.result || "unknown"}`
      );
    }
  },
  async getDeliveryUrl(input) {
    if (input.access === "public" && input.public_url) return input.public_url;
    const cloudinary = await lazyCloudinaryClient();
    return cloudinary.url(input.storage_key, {
      secure: true,
      sign_url: true,
      type: input.delivery_type || "authenticated",
      resource_type: input.resource_type || "image",
      expires_at: Math.floor(Date.now() / 1000) + input.expires_in_seconds,
      flags: input.disposition === "attachment" ? "attachment" : undefined,
    });
  },
  async listManagedObjects(input) {
    const cloudinary = await lazyCloudinaryClient();
    const resources: TStoredObject[] = [];
    const combinations = [
      { resource_type: "image", type: "upload" },
      { resource_type: "image", type: "authenticated" },
      { resource_type: "raw", type: "upload" },
      { resource_type: "raw", type: "authenticated" },
    ] as const;
    for (const combination of combinations) {
      if (resources.length >= input.limit) break;
      const response = (await cloudinary.api.resources({
        ...combination,
        prefix: input.prefix,
        max_results: Math.min(500, input.limit - resources.length),
      })) as {
        resources?: Array<{ public_id?: string; created_at?: string }>;
      };
      for (const resource of response.resources || []) {
        if (!resource.public_id || !resource.created_at) continue;
        const createdAt = new Date(resource.created_at);
        if (
          !Number.isFinite(createdAt.getTime()) ||
          createdAt > input.older_than
        ) {
          continue;
        }
        resources.push({
          provider: "cloudinary",
          storage_key: resource.public_id,
          resource_type: combination.resource_type,
          delivery_type: combination.type,
          created_at: createdAt,
        });
      }
    }
    return resources;
  },
};

export const getStorageAdapter = (
  provider: TCloudStorageProvider = getConfiguredStorageProvider()
): TStorageAdapter => (provider === "gcp" ? gcpAdapter : cloudinaryAdapter);

export const deleteCloudStorageObject = async (
  input: TStorageDeleteInput
): Promise<void> => {
  try {
    await getStorageAdapter(input.provider).remove(input);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      httpStatus.BAD_GATEWAY,
      `Failed to delete object from ${input.provider} storage`
    );
  }
};

export const getCloudStorageDeliveryUrl = async (
  input: TStorageDeliveryInput
): Promise<string> => {
  try {
    return await getStorageAdapter(input.provider).getDeliveryUrl(input);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      httpStatus.BAD_GATEWAY,
      "Failed to create storage delivery URL"
    );
  }
};

export const listCloudStorageManagedObjects = async (
  provider: TCloudStorageProvider,
  input: TStorageListInput
): Promise<TStoredObject[]> => {
  try {
    return await getStorageAdapter(provider).listManagedObjects(input);
  } catch {
    throw new AppError(
      httpStatus.BAD_GATEWAY,
      "Failed to list managed storage objects"
    );
  }
};

export type {
  TCloudinaryResourceType,
  TCloudStorageProvider,
  TStorageDeleteInput,
  TStorageFile,
  TStorageResult,
  TStoredObject,
} from "./storage.type";
