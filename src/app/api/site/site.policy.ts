import {
  PILLAR_CONTRACT,
  PILLAR_CONTRACT_VERSION,
} from "@/lib/content/pillars";
import type { TFile } from "@/app/api/files/file.type";
import {
  SITE_KEY,
  SITE_SCHEMA_VERSION,
  SITE_SNAPSHOT_MAX_BYTES,
  type TPublicSiteDto,
  type TPublicSiteMediaDto,
  type TSiteDraftSnapshot,
  type TSiteFileReferenceDescriptor,
  type TSitePillar,
} from "./site.type";

export class SiteDomainError extends Error {
  readonly status: number;
  readonly code: string;
  readonly sources: string[];
  readonly current_revision?: number;

  constructor(input: {
    status: number;
    code: string;
    message: string;
    sources?: string[];
    current_revision?: number;
  }) {
    super(input.message);
    this.name = "SiteDomainError";
    this.status = input.status;
    this.code = input.code;
    this.sources = [
      ...new Set(
        (input.sources ?? [])
          .map((source) => source.trim())
          .filter(
            (source) =>
              source.length <= 96 &&
              /^[a-z][a-z0-9_-]*(?:\.(?:[a-z][a-z0-9_-]*|\d+))*$/.test(source)
          )
      ),
    ].slice(0, 50);
    this.current_revision = input.current_revision;
  }
}

export const createNeutralSitePillars = (): TSitePillar[] =>
  PILLAR_CONTRACT.map((pillar) => ({
    key: pillar.key,
    label: pillar.label,
    order: pillar.order,
    enabled: false,
    capabilities: [],
    technologies: [],
    icon_key: pillar.default_icon_key,
    accent: pillar.default_accent,
    fallback_visual_key: pillar.fallback_visual_key,
  }));

export const createNeutralSiteDraft = (): TSiteDraftSnapshot => ({
  identity: { locale: "en" },
  positioning: {},
  pillars: createNeutralSitePillars(),
  brand: {},
  contact: {
    email_visibility: "hidden",
    phone_visibility: "hidden",
    availability: "unknown",
    map_policy: "hidden",
  },
  navigation: { header: [], footer: [], legal: [] },
  social_links: [],
  primary_ctas: [],
  footer: {},
  seo: { allow_indexing: false },
  experience: {
    theme: "system",
    motion: "reduced",
    accent: "cyan",
    feature_flags: {
      show_availability: false,
      show_metrics: false,
      show_testimonials: false,
    },
  },
  fallbacks: { emergency_visual_key: "abstract-grid-v1" },
  metrics: [],
});

export const getPillarInvariantIssues = (
  pillars: readonly TSitePillar[]
): string[] => {
  const issues: string[] = [];
  if (pillars.length !== PILLAR_CONTRACT.length) issues.push("pillars.length");

  PILLAR_CONTRACT.forEach((contract, index) => {
    const pillar = pillars[index];
    if (!pillar) {
      issues.push(`pillars.${index}`);
      return;
    }
    if (pillar.key !== contract.key) issues.push(`pillars.${index}.key`);
    if (pillar.label !== contract.label) issues.push(`pillars.${index}.label`);
    if (pillar.order !== contract.order) issues.push(`pillars.${index}.order`);
    if (pillar.fallback_visual_key !== contract.fallback_visual_key) {
      issues.push(`pillars.${index}.fallback_visual_key`);
    }
  });

  if (new Set(pillars.map((pillar) => pillar.key)).size !== pillars.length) {
    issues.push("pillars.key");
  }
  return [...new Set(issues)];
};

const isPresent = (value: string | undefined): boolean =>
  Boolean(value && value.trim());

export const getSitePublishIssues = (draft: TSiteDraftSnapshot): string[] => {
  const issues = getPillarInvariantIssues(draft.pillars);

  for (const field of ["public_name", "canonical_url"] as const) {
    if (!isPresent(draft.identity[field])) issues.push(`identity.${field}`);
  }
  for (const field of [
    "canonical",
    "compact",
    "mobile",
    "long",
    "short_bio",
    "client_promise",
  ] as const) {
    if (!isPresent(draft.positioning[field])) {
      issues.push(`positioning.${field}`);
    }
  }
  for (const field of [
    "default_title",
    "title_template",
    "default_description",
    "canonical_url",
  ] as const) {
    if (!isPresent(draft.seo[field])) issues.push(`seo.${field}`);
  }
  if (
    draft.identity.canonical_url &&
    draft.seo.canonical_url &&
    draft.identity.canonical_url !== draft.seo.canonical_url
  ) {
    issues.push("seo.canonical_url");
  }

  draft.pillars.forEach((pillar, index) => {
    const path = `pillars.${index}`;
    if (!pillar.enabled) issues.push(`${path}.enabled`);
    for (const field of [
      "headline",
      "summary",
      "client_outcome",
      "seo_summary",
    ] as const) {
      if (!isPresent(pillar[field])) issues.push(`${path}.${field}`);
    }
    if (!pillar.capabilities.length) issues.push(`${path}.capabilities`);
    if (!pillar.technologies.length) issues.push(`${path}.technologies`);
    if (!pillar.cta?.enabled) issues.push(`${path}.cta`);
    if (
      pillar.visual_file &&
      !pillar.visual_is_decorative &&
      !isPresent(pillar.visual_alt_text)
    ) {
      issues.push(`${path}.visual_alt_text`);
    }
  });

  const links = [
    ...draft.navigation.header,
    ...draft.navigation.footer,
    ...draft.navigation.legal,
    ...draft.primary_ctas,
    ...draft.pillars.flatMap((pillar) => (pillar.cta ? [pillar.cta] : [])),
  ];
  if (
    links.some((link) => link.enabled && link.kind === "email") &&
    (draft.contact.email_visibility !== "public" ||
      !isPresent(draft.contact.public_email))
  ) {
    issues.push("contact.public_email");
  }
  if (
    links.some((link) => link.enabled && link.kind === "phone") &&
    (draft.contact.phone_visibility !== "public" ||
      !isPresent(draft.contact.public_phone))
  ) {
    issues.push("contact.public_phone");
  }
  if (
    links.some((link) => link.enabled && link.kind === "resume") &&
    !draft.brand.resume_file
  ) {
    issues.push("brand.resume_file");
  }
  if (
    draft.contact.email_visibility === "public" &&
    !isPresent(draft.contact.public_email)
  ) {
    issues.push("contact.public_email");
  }
  if (
    draft.contact.phone_visibility === "public" &&
    !isPresent(draft.contact.public_phone)
  ) {
    issues.push("contact.public_phone");
  }
  draft.metrics.forEach((metric, index) => {
    if (
      metric.enabled &&
      (!isPresent(metric.value) || metric.verification === "unverified")
    ) {
      issues.push(`metrics.${index}`);
    }
  });
  if (
    draft.experience.feature_flags.show_metrics &&
    !draft.metrics.some(
      (metric) => metric.enabled && metric.verification !== "unverified"
    )
  ) {
    issues.push("metrics");
  }
  if (
    draft.experience.feature_flags.show_availability &&
    draft.contact.availability === "unknown"
  ) {
    issues.push("contact.availability");
  }

  const size = Buffer.byteLength(JSON.stringify(draft), "utf8");
  if (size > SITE_SNAPSHOT_MAX_BYTES) issues.push("snapshot.size");
  return [...new Set(issues)];
};

export const assertSitePublishable = (draft: TSiteDraftSnapshot): void => {
  const issues = getSitePublishIssues(draft);
  if (issues.length) {
    throw new SiteDomainError({
      status: 422,
      code: "SITE_NOT_PUBLISHABLE",
      message: "The Site draft is incomplete or invalid for publication.",
      sources: issues,
    });
  }
};

export const collectSiteFileReferences = (
  snapshot: TSiteDraftSnapshot
): TSiteFileReferenceDescriptor[] => {
  const refs: TSiteFileReferenceDescriptor[] = [];
  const add = (
    id: string | undefined,
    field: string,
    purposes: TSiteFileReferenceDescriptor["purposes"]
  ) => {
    if (id) refs.push({ id, field, purposes });
  };

  add(snapshot.brand.logo_light_file, "brand.logo_light_file", ["logo"]);
  add(snapshot.brand.logo_dark_file, "brand.logo_dark_file", ["logo"]);
  add(snapshot.brand.favicon_file, "brand.favicon_file", ["logo"]);
  add(snapshot.brand.profile_file, "brand.profile_file", ["profile"]);
  add(snapshot.brand.resume_file, "brand.resume_file", ["resume"]);
  add(snapshot.seo.default_og_file, "seo.default_og_file", ["social"]);
  add(snapshot.fallbacks.project_file, "fallbacks.project_file", ["project"]);
  add(snapshot.fallbacks.article_file, "fallbacks.article_file", ["article"]);
  add(snapshot.fallbacks.profile_file, "fallbacks.profile_file", ["profile"]);
  for (const pillar of snapshot.pillars) {
    add(pillar.visual_file, `pillars.${pillar.key}.visual_file`, ["hero"]);
  }
  return refs;
};

export const uniqueSiteFileIds = (snapshot: TSiteDraftSnapshot): string[] => [
  ...new Set(
    collectSiteFileReferences(snapshot).map((reference) => reference.id)
  ),
];

export const toPublicSiteMedia = (
  file: TFile | undefined
): TPublicSiteMediaDto | undefined => {
  if (!file?._id || !file.url || file.access !== "public") return undefined;
  return {
    id: file._id.toString(),
    url: file.url,
    ...(file.alt_text ? { alt_text: file.alt_text } : {}),
    ...(file.is_decorative !== undefined
      ? { is_decorative: file.is_decorative }
      : {}),
    ...(file.metadata?.width ? { width: file.metadata.width } : {}),
    ...(file.metadata?.height ? { height: file.metadata.height } : {}),
    ...(file.focal_point ? { focal_point: file.focal_point } : {}),
    ...(file.dominant_color ? { dominant_color: file.dominant_color } : {}),
    ...(file.blur_data_url ? { blur_data_url: file.blur_data_url } : {}),
  };
};

export const createEmergencyPublicSite = (): TPublicSiteDto => ({
  content_source: "emergency",
  site_key: SITE_KEY,
  schema_version: SITE_SCHEMA_VERSION,
  contract_version: PILLAR_CONTRACT_VERSION,
  identity: { locale: "en" },
  positioning: {
    canonical: PILLAR_CONTRACT.map(({ label }) => label).join(" · "),
  },
  pillars: PILLAR_CONTRACT.map((pillar) => ({
    key: pillar.key,
    label: pillar.label,
    order: pillar.order,
    enabled: true,
    capabilities: [],
    technologies: [],
    icon_key: pillar.default_icon_key,
    accent: pillar.default_accent,
    fallback_visual_key: pillar.fallback_visual_key,
  })),
  brand: {},
  contact: {
    availability: "unknown",
    map_policy: "hidden",
  },
  navigation: { header: [], footer: [], legal: [] },
  social_links: [],
  primary_ctas: [],
  footer: {},
  seo: { allow_indexing: false },
  experience: {
    theme: "system",
    motion: "reduced",
    accent: "cyan",
    feature_flags: {
      show_availability: false,
      show_metrics: false,
      show_testimonials: false,
    },
  },
  fallbacks: { emergency_visual_key: "abstract-grid-v1" },
  metrics: [],
});
