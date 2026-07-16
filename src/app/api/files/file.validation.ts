import { z } from "zod";
import { FILE_PURPOSES } from "./file.type";

const idSchema = z.string().refine((val) => /^[0-9a-fA-F]{24}$/.test(val), {
  message: "Invalid ID format",
});

const statusSchema = z.enum(["active", "inactive", "archived"]);
export const purposeSchema = z.enum(FILE_PURPOSES);
const sourceSchema = z.enum(["uploaded", "generated"]);
const licenseSchema = z.enum([
  "owned",
  "client-provided",
  "cc0",
  "cc-by-4.0",
  "cc-by-sa-4.0",
  "unsplash",
  "other",
]);

const optionalHttpsUrlSchema = z
  .string()
  .trim()
  .max(2048)
  .url()
  .refine((value) => {
    const parsed = new URL(value);
    return (
      parsed.protocol === "https:" &&
      !parsed.username &&
      !parsed.password &&
      !parsed.hash
    );
  }, "URL must be a public HTTPS URL without credentials or fragments")
  .optional();

const checksumSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-f0-9]{64}$/, "Checksum must be a SHA-256 hex digest");

const focalPointSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});

const provenanceSchema = z
  .object({
    generator: z.string().trim().min(1).max(160).optional(),
    model: z.string().trim().min(1).max(160).optional(),
    prompt: z.string().trim().min(1).max(8000).optional(),
    version: z.string().trim().min(1).max(120).optional(),
    seed: z.string().trim().min(1).max(256).optional(),
    generated_at: z.string().datetime({ offset: true }).optional(),
    source_checksum: checksumSchema.optional(),
  })
  .strict();

const attributionSchema = z
  .object({
    creator_name: z.string().trim().min(1).max(200).optional(),
    creator_url: optionalHttpsUrlSchema,
    source_url: optionalHttpsUrlSchema,
    credit_text: z.string().trim().min(1).max(500).optional(),
    license: licenseSchema.optional(),
    license_url: optionalHttpsUrlSchema,
  })
  .strict();

const dominantColorSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^#[a-f0-9]{6}$/, "Use a six-digit hex color");

const blurDataUrlSchema = z
  .string()
  .max(8192)
  .regex(
    /^data:image\/(?:webp|png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/,
    "Blur placeholder must be a supported base64 image data URL"
  );

const assertDecorativeAlt = (
  value: { is_decorative?: boolean; alt_text?: string },
  ctx: z.RefinementCtx
) => {
  if (value.is_decorative === true && value.alt_text?.length) {
    ctx.addIssue({
      code: "custom",
      path: ["alt_text"],
      message: "Decorative media must use empty alt text",
    });
  }
};

const editableMetadataSchema = z
  .object({
    source: sourceSchema.optional(),
    alt_text: z.string().trim().max(300).optional(),
    is_decorative: z.boolean().optional(),
    focal_point: focalPointSchema.optional(),
    dominant_color: dominantColorSchema.optional(),
    blur_data_url: blurDataUrlSchema.optional(),
    provenance: provenanceSchema.optional(),
    attribution: attributionSchema.optional(),
  })
  .superRefine(assertDecorativeAlt);

const multipartBooleanSchema = z
  .enum(["true", "false"])
  .transform((value) => value === "true");
const multipartCoordinateSchema = z.coerce.number().min(0).max(1);

const createBodySchema = z
  .object({
    name: z.string().trim().min(1).max(160).optional(),
    category: z.string().trim().min(1).max(80).optional(),
    description: z.string().trim().max(500).optional(),
    caption: z.string().trim().max(500).optional(),
    status: statusSchema.optional(),
    purpose: purposeSchema.default("generic"),
    source: sourceSchema.default("uploaded"),
    alt_text: z.string().trim().max(300).optional(),
    is_decorative: multipartBooleanSchema.optional(),
    focal_point_x: multipartCoordinateSchema.optional(),
    focal_point_y: multipartCoordinateSchema.optional(),
    dominant_color: dominantColorSchema.optional(),
    blur_data_url: blurDataUrlSchema.optional(),
    provenance_generator: z.string().trim().min(1).max(160).optional(),
    provenance_model: z.string().trim().min(1).max(160).optional(),
    provenance_prompt: z.string().trim().min(1).max(8000).optional(),
    provenance_version: z.string().trim().min(1).max(120).optional(),
    provenance_seed: z.string().trim().min(1).max(256).optional(),
    provenance_generated_at: z.string().datetime({ offset: true }).optional(),
    provenance_source_checksum: checksumSchema.optional(),
    attribution_creator_name: z.string().trim().min(1).max(200).optional(),
    attribution_creator_url: optionalHttpsUrlSchema,
    attribution_source_url: optionalHttpsUrlSchema,
    attribution_credit_text: z.string().trim().min(1).max(500).optional(),
    attribution_license: licenseSchema.optional(),
    attribution_license_url: optionalHttpsUrlSchema,
    idempotency_key: z
      .string()
      .trim()
      .min(8)
      .max(100)
      .regex(/^[a-zA-Z0-9._:-]+$/)
      .optional(),
  })
  .superRefine((value, ctx) => {
    if (
      (value.focal_point_x === undefined) !==
      (value.focal_point_y === undefined)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["focal_point"],
        message: "Both focal point coordinates are required",
      });
    }
    assertDecorativeAlt(value, ctx);
  })
  .transform((value) => {
    const {
      focal_point_x,
      focal_point_y,
      provenance_generator,
      provenance_model,
      provenance_prompt,
      provenance_version,
      provenance_seed,
      provenance_generated_at,
      provenance_source_checksum,
      attribution_creator_name,
      attribution_creator_url,
      attribution_source_url,
      attribution_credit_text,
      attribution_license,
      attribution_license_url,
      ...base
    } = value;

    const hasProvenance = [
      provenance_generator,
      provenance_model,
      provenance_prompt,
      provenance_version,
      provenance_seed,
      provenance_generated_at,
      provenance_source_checksum,
    ].some((item) => item !== undefined);
    const hasAttribution = [
      attribution_creator_name,
      attribution_creator_url,
      attribution_source_url,
      attribution_credit_text,
      attribution_license,
      attribution_license_url,
    ].some((item) => item !== undefined);

    return {
      ...base,
      ...(focal_point_x !== undefined && focal_point_y !== undefined
        ? { focal_point: { x: focal_point_x, y: focal_point_y } }
        : {}),
      ...(hasProvenance
        ? {
            provenance: {
              generator: provenance_generator,
              model: provenance_model,
              prompt: provenance_prompt,
              version: provenance_version,
              seed: provenance_seed,
              generated_at: provenance_generated_at,
              source_checksum: provenance_source_checksum,
            },
          }
        : {}),
      ...(hasAttribution
        ? {
            attribution: {
              creator_name: attribution_creator_name,
              creator_url: attribution_creator_url,
              source_url: attribution_source_url,
              credit_text: attribution_credit_text,
              license: attribution_license,
              license_url: attribution_license_url,
            },
          }
        : {}),
    };
  });

export const createFileValidationSchema = z.object({
  body: createBodySchema,
});

export const updateFileValidationSchema = z.object({
  params: z.object({
    id: idSchema,
  }),
  body: z
    .object({
      name: z.string().trim().min(1).max(160).optional(),
      category: z.string().trim().min(1).max(80).optional(),
      description: z.string().trim().max(500).optional(),
      caption: z.string().trim().max(500).optional(),
      status: statusSchema.optional(),
      ...editableMetadataSchema.shape,
    })
    .superRefine(assertDecorativeAlt),
});

export const updateFilesValidationSchema = z.object({
  body: z.object({
    ids: z.array(idSchema).nonempty("At least one file ID is required"),
    status: statusSchema.optional(),
  }),
});

export const fileOperationValidationSchema = z.object({
  params: z.object({
    id: idSchema,
  }),
});

export const filesOperationValidationSchema = z.object({
  body: z.object({
    ids: z.array(idSchema).nonempty("At least one file ID is required"),
  }),
});
