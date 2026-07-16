import { isAllowedPublicProjectUrl } from "@/lib/content/portfolio-contract";
import {
  PILLAR_ACCENTS,
  PILLAR_ICON_KEYS,
  PILLAR_KEYS,
} from "@/lib/content/pillars";
import { z } from "zod";
import { getPillarInvariantIssues, SiteDomainError } from "./site.policy";
import {
  SITE_SNAPSHOT_MAX_BYTES,
  type TSiteDraftSnapshot,
  type TSiteLink,
} from "./site.type";

export const siteObjectIdSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-f0-9]{24}$/, "Invalid File ID");

const safeKeySchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1)
  .max(64)
  .regex(/^[a-z][a-z0-9]*(?:[-_][a-z0-9]+)*$/);

const requiredText = (minimum: number, maximum: number) =>
  z.string().trim().min(minimum).max(maximum);

const optionalText = (minimum: number, maximum: number) =>
  z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().trim().min(minimum).max(maximum).optional()
  );

const isSafeInternalPath = (value: string): boolean => {
  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    return false;
  }
  try {
    const decoded = decodeURIComponent(value);
    if (
      decoded.startsWith("//") ||
      decoded.includes("\\") ||
      /[\u0000-\u001f\u007f]/.test(decoded)
    ) {
      return false;
    }
    const pathname = new URL(decoded, "https://portfolio.invalid").pathname;
    return (
      pathname !== "/admin" &&
      !pathname.startsWith("/admin/") &&
      pathname !== "/api" &&
      !pathname.startsWith("/api/")
    );
  } catch {
    return false;
  }
};

const httpsUrlSchema = z
  .string()
  .trim()
  .max(2048)
  .refine(isAllowedPublicProjectUrl, "Use a public HTTPS URL");

const canonicalUrlSchema = httpsUrlSchema.transform((value) => {
  const url = new URL(value);
  url.hash = "";
  return url.toString().replace(/\/$/, "");
});

export const siteLinkSchema: z.ZodType<TSiteLink> = z
  .object({
    key: safeKeySchema,
    label: requiredText(1, 80),
    kind: z.enum(["internal", "external", "email", "phone", "resume"]),
    href: z.string().trim().max(2048).optional(),
    enabled: z.boolean(),
    open_in_new_tab: z.boolean().optional(),
  })
  .strict()
  .superRefine((link, context) => {
    if (link.kind === "internal") {
      if (!link.href || !isSafeInternalPath(link.href)) {
        context.addIssue({
          code: "custom",
          path: ["href"],
          message: "Use a safe public path",
        });
      }
    } else if (link.kind === "external") {
      if (!link.href || !isAllowedPublicProjectUrl(link.href)) {
        context.addIssue({
          code: "custom",
          path: ["href"],
          message: "Use a public HTTPS URL",
        });
      }
    } else if (link.href !== undefined) {
      context.addIssue({
        code: "custom",
        path: ["href"],
        message: "This link kind derives its destination from Site settings",
      });
    }

    if (link.open_in_new_tab && link.kind !== "external") {
      context.addIssue({
        code: "custom",
        path: ["open_in_new_tab"],
        message: "Only external links can open a new tab",
      });
    }
  });

const uniqueKeys = <T extends { key: string }>(values: readonly T[]): boolean =>
  new Set(values.map((value) => value.key)).size === values.length;

const linkList = (maximum: number) =>
  z
    .array(siteLinkSchema)
    .max(maximum)
    .refine(uniqueKeys, "Link keys must be unique");

const pillarSchema = z
  .object({
    key: z.enum(PILLAR_KEYS),
    label: requiredText(1, 80),
    order: z.number().int().min(1).max(5),
    enabled: z.boolean(),
    headline: optionalText(2, 140),
    summary: optionalText(2, 600),
    client_outcome: optionalText(2, 400),
    capabilities: z.array(requiredText(1, 100)).max(12).default([]),
    technologies: z.array(requiredText(1, 80)).max(20).default([]),
    cta: siteLinkSchema.optional(),
    icon_key: z.enum(PILLAR_ICON_KEYS),
    accent: z.enum(PILLAR_ACCENTS),
    fallback_visual_key: requiredText(1, 64).regex(
      /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/
    ),
    visual_file: siteObjectIdSchema.optional(),
    visual_alt_text: z.string().trim().max(300).optional(),
    visual_is_decorative: z.boolean().optional(),
    seo_summary: optionalText(2, 300),
  })
  .strict()
  .superRefine((pillar, context) => {
    if (new Set(pillar.capabilities).size !== pillar.capabilities.length) {
      context.addIssue({
        code: "custom",
        path: ["capabilities"],
        message: "Capabilities must be unique",
      });
    }
    if (new Set(pillar.technologies).size !== pillar.technologies.length) {
      context.addIssue({
        code: "custom",
        path: ["technologies"],
        message: "Technologies must be unique",
      });
    }
    if (
      pillar.visual_is_decorative &&
      Boolean(pillar.visual_alt_text?.trim())
    ) {
      context.addIssue({
        code: "custom",
        path: ["visual_alt_text"],
        message: "Decorative visuals must not include alternative text",
      });
    }
    if (
      !pillar.visual_file &&
      (pillar.visual_alt_text !== undefined ||
        pillar.visual_is_decorative !== undefined)
    ) {
      context.addIssue({
        code: "custom",
        path: ["visual_file"],
        message: "Visual accessibility settings require a visual File",
      });
    }
  });

export const siteDraftSnapshotSchema: z.ZodType<TSiteDraftSnapshot> = z
  .object({
    identity: z
      .object({
        public_name: optionalText(2, 120),
        short_name: optionalText(1, 60),
        canonical_url: canonicalUrlSchema.optional(),
        locale: z.literal("en"),
        timezone: z
          .string()
          .trim()
          .max(80)
          .refine((value) => {
            try {
              new Intl.DateTimeFormat("en", { timeZone: value }).format();
              return true;
            } catch {
              return false;
            }
          }, "Use an IANA timezone")
          .optional(),
      })
      .strict(),
    positioning: z
      .object({
        canonical: optionalText(2, 240),
        compact: optionalText(2, 160),
        mobile: optionalText(2, 120),
        long: optionalText(2, 500),
        short_bio: optionalText(2, 600),
        long_bio: optionalText(2, 4_000),
        client_promise: optionalText(2, 400),
      })
      .strict(),
    pillars: z
      .array(pillarSchema)
      .length(5)
      .superRefine((pillars, context) => {
        for (const issue of getPillarInvariantIssues(pillars)) {
          context.addIssue({
            code: "custom",
            path: issue.split(".").slice(1),
            message: "Pillar contract fields are immutable",
          });
        }
      }),
    brand: z
      .object({
        logo_light_file: siteObjectIdSchema.optional(),
        logo_dark_file: siteObjectIdSchema.optional(),
        favicon_file: siteObjectIdSchema.optional(),
        profile_file: siteObjectIdSchema.optional(),
        resume_file: siteObjectIdSchema.optional(),
      })
      .strict(),
    contact: z
      .object({
        public_email: z
          .string()
          .trim()
          .toLowerCase()
          .email()
          .max(254)
          .optional(),
        email_visibility: z.enum(["hidden", "public"]),
        public_phone: z
          .string()
          .trim()
          .regex(/^\+[1-9]\d{7,14}$/)
          .optional(),
        phone_visibility: z.enum(["hidden", "public"]),
        location: optionalText(2, 160),
        availability: z.enum([
          "unknown",
          "available",
          "limited",
          "unavailable",
        ]),
        availability_label: optionalText(2, 160),
        availability_review_at: z
          .string()
          .datetime({ offset: true })
          .optional(),
        response_promise: optionalText(2, 240),
        map_policy: z.enum(["hidden", "city_only"]),
      })
      .strict(),
    navigation: z
      .object({
        header: linkList(12),
        footer: linkList(16),
        legal: linkList(8),
      })
      .strict(),
    social_links: z
      .array(
        z
          .object({
            key: safeKeySchema,
            platform: z.enum([
              "github",
              "linkedin",
              "x",
              "youtube",
              "facebook",
              "instagram",
              "other",
            ]),
            label: requiredText(1, 80),
            url: httpsUrlSchema,
            enabled: z.boolean(),
          })
          .strict()
      )
      .max(12)
      .refine(uniqueKeys, "Social link keys must be unique"),
    primary_ctas: linkList(4),
    footer: z
      .object({
        tagline: optionalText(2, 240),
        copyright_name: optionalText(2, 120),
        legal_notice: optionalText(2, 500),
      })
      .strict(),
    seo: z
      .object({
        default_title: optionalText(2, 120),
        title_template: optionalText(2, 140).refine(
          (value) => !value || value.split("%s").length === 2,
          "Title template must contain exactly one %s placeholder"
        ),
        default_description: optionalText(2, 320),
        canonical_url: canonicalUrlSchema.optional(),
        default_og_file: siteObjectIdSchema.optional(),
        allow_indexing: z.boolean(),
        verification: z
          .object({
            google: z
              .string()
              .trim()
              .max(128)
              .regex(/^[A-Za-z0-9_-]+$/)
              .optional(),
            bing: z
              .string()
              .trim()
              .max(128)
              .regex(/^[A-Za-z0-9_-]+$/)
              .optional(),
          })
          .strict()
          .optional(),
      })
      .strict(),
    experience: z
      .object({
        theme: z.enum(["system", "light", "dark"]),
        motion: z.enum(["full", "reduced", "off"]),
        accent: z.enum(PILLAR_ACCENTS),
        feature_flags: z
          .object({
            show_availability: z.boolean(),
            show_metrics: z.boolean(),
            show_testimonials: z.boolean(),
          })
          .strict(),
      })
      .strict(),
    fallbacks: z
      .object({
        emergency_visual_key: z.literal("abstract-grid-v1"),
        project_file: siteObjectIdSchema.optional(),
        article_file: siteObjectIdSchema.optional(),
        profile_file: siteObjectIdSchema.optional(),
      })
      .strict(),
    metrics: z
      .array(
        z
          .object({
            key: safeKeySchema,
            label: requiredText(1, 80),
            value: optionalText(1, 80),
            verification: z.enum(["unverified", "derived", "verified"]),
            enabled: z.boolean(),
          })
          .strict()
      )
      .max(12)
      .refine(uniqueKeys, "Metric keys must be unique"),
  })
  .strict()
  .superRefine((snapshot, context) => {
    if (
      Buffer.byteLength(JSON.stringify(snapshot), "utf8") >
      SITE_SNAPSHOT_MAX_BYTES
    ) {
      context.addIssue({
        code: "too_big",
        origin: "object",
        maximum: SITE_SNAPSHOT_MAX_BYTES,
        inclusive: true,
        path: [],
        message: "Site snapshot exceeds the size budget",
      });
    }
  });

export const siteCreateBodySchema = z.object({}).strict();

export const siteDraftUpdateBodySchema = z
  .object({
    expected_revision: z.number().int().min(1).max(1_000_000_000),
    draft: siteDraftSnapshotSchema,
  })
  .strict();

export const sitePublishBodySchema = z
  .object({
    expected_revision: z.number().int().min(1).max(1_000_000_000),
  })
  .strict();

export const emptySiteQuerySchema = z.object({}).strict();

export const parseEmptySiteQuery = (input: unknown): Record<string, never> => {
  const parsed = emptySiteQuerySchema.safeParse(input);
  if (!parsed.success) {
    throw new SiteDomainError({
      status: 400,
      code: "SITE_QUERY_INVALID",
      message: "The Site endpoint does not accept query parameters.",
      sources: parsed.error.issues.map((issue) =>
        issue.path.map(String).join(".")
      ),
    });
  }
  return parsed.data;
};
