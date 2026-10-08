import { z } from "zod";
import {
  MAX_VIDEO_KEYWORDS,
  MAX_VIDEO_KEYWORD_LENGTH,
  VIDEO_ASPECT_RATIOS,
  VIDEO_SOURCE_TYPES,
  parseYouTubeVideoId,
} from "@/lib/content/video-contract";

const idSchema = z.string().refine((val) => /^[0-9a-fA-F]{24}$/.test(val), {
  message: "Invalid ID format",
});

const optionalIdSchema = z
  .string()
  .refine((val) => /^[0-9a-fA-F]{24}$/.test(val), {
    message: "Invalid ID format",
  })
  .nullish();

const statusSchema = z.enum(["draft", "pending", "published", "archived"]);
const aspectRatioSchema = z.enum(VIDEO_ASPECT_RATIOS);
const sourceTypeSchema = z.enum(VIDEO_SOURCE_TYPES);

const keywordsSchema = z
  .array(z.string().trim().min(1).max(MAX_VIDEO_KEYWORD_LENGTH))
  .max(MAX_VIDEO_KEYWORDS);

const sourceFields = {
  aspect_ratio: aspectRatioSchema,
  source_type: sourceTypeSchema,
  video_file: optionalIdSchema,
  youtube_url: z.string().trim().max(2_048).nullish(),
  duration_seconds: z.number().min(0).max(86_400).nullish(),
};

const contentFields = {
  slug: z.string().trim().min(1).max(96).optional(),
  description: z.string().trim().max(2_000).optional(),
  keywords: keywordsSchema.optional(),
  thumbnail: optionalIdSchema,
};

type TSourceCandidate = {
  source_type?: (typeof VIDEO_SOURCE_TYPES)[number];
  youtube_url?: string | null;
  video_file?: string | null;
};

const checkSource = (value: TSourceCandidate, context: z.RefinementCtx) => {
  if (value.source_type === "youtube" && value.youtube_url !== undefined) {
    if (!parseYouTubeVideoId(value.youtube_url)) {
      context.addIssue({
        code: "custom",
        path: ["youtube_url"],
        message: "Enter a valid YouTube video link",
      });
    }
  }
};

export const createVideoSchema = z.object({
  body: z
    .object({
      name: z.string().trim().min(2).max(160),
      ...contentFields,
      category: idSchema,
      ...sourceFields,
      aspect_ratio: aspectRatioSchema.default("landscape"),
      status: statusSchema.default("draft"),
      is_featured: z.boolean().default(false),
      published_at: z.string().datetime().optional(),
      expired_at: z.string().datetime().nullish(),
      layout: z.string().default("default"),
    })
    .superRefine((value, context) => {
      checkSource(value, context);
      if (value.source_type === "youtube" && !value.youtube_url) {
        context.addIssue({
          code: "custom",
          path: ["youtube_url"],
          message: "A YouTube link is required",
        });
      }
      if (value.source_type === "upload" && !value.video_file) {
        context.addIssue({
          code: "custom",
          path: ["video_file"],
          message: "An uploaded video file is required",
        });
      }
    }),
});

export const updateVideosSchema = z.object({
  body: z.object({
    ids: z.array(idSchema).min(1, "At least one video ID is required"),
    status: statusSchema.optional(),
    is_featured: z.boolean().optional(),
    category: idSchema.optional(),
  }),
});

export const updateVideoByIdSchema = z.object({
  params: z.object({
    id: idSchema,
  }),
  body: z
    .object({
      name: z.string().trim().min(2).max(160).optional(),
      ...contentFields,
      category: idSchema.optional(),
      aspect_ratio: aspectRatioSchema.optional(),
      source_type: sourceTypeSchema.optional(),
      video_file: optionalIdSchema,
      youtube_url: z.string().trim().max(2_048).nullish(),
      duration_seconds: z.number().min(0).max(86_400).nullish(),
      status: statusSchema.optional(),
      is_featured: z.boolean().optional(),
      published_at: z.string().datetime().optional(),
      expired_at: z.string().datetime().nullish(),
      layout: z.string().optional(),
    })
    .superRefine(checkSource),
});

export const videoByIdOperationValidationSchema = z.object({
  params: z.object({
    id: idSchema,
  }),
});

export const videosOperationValidationSchema = z.object({
  body: z.object({
    ids: z.array(idSchema).nonempty("At least one video ID is required"),
  }),
});
