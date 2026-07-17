const normalizeDirective = (value: string): string =>
  value.replace(/\s{2,}/g, " ").trim();

export type BrowserFramePolicy = "deny" | "preview-parent" | "preview-document";

const normalizeHttpOrigin = (value?: string): string | null => {
  if (!value?.trim()) return null;
  try {
    const parsed = new URL(value);
    if (
      !["http:", "https:"].includes(parsed.protocol) ||
      parsed.username ||
      parsed.password ||
      parsed.pathname !== "/" ||
      parsed.search ||
      parsed.hash
    ) {
      return null;
    }
    return parsed.origin;
  } catch {
    return null;
  }
};

export const resolveBrowserPublicOrigin = (
  input: Readonly<{
    production: boolean;
    configured?: string;
    port?: string;
  }>
): string => {
  const configured = normalizeHttpOrigin(input.configured);
  if (configured) return configured;
  if (input.production) {
    throw new Error(
      "Production requires NEXT_PUBLIC_URL to be an explicit valid HTTP(S) origin."
    );
  }
  const port = /^\d{1,5}$/.test(input.port?.trim() ?? "")
    ? input.port!.trim()
    : "3000";
  return (
    normalizeHttpOrigin(`http://localhost:${port}`) ?? "http://localhost:3000"
  );
};

export const getPreviewAssetSources = (
  publicOrigin?: string
): Readonly<{
  static: string;
  imageOptimizer: string;
  publicImages: string;
  projectsApi: string;
  articlesApi: string;
}> | null => {
  const origin = normalizeHttpOrigin(publicOrigin);
  return origin
    ? {
        static: `${origin}/_next/static/`,
        imageOptimizer: `${origin}/_next/image`,
        publicImages: `${origin}/images/`,
        projectsApi: `${origin}/api/projects`,
        articlesApi: `${origin}/api/articles`,
      }
    : null;
};

export const buildContentSecurityPolicy = (input: {
  production: boolean;
  cloudinaryEnabled: boolean;
  gcpEnabled: boolean;
  framePolicy?: BrowserFramePolicy;
  publicOrigin?: string;
}): string => {
  const framePolicy = input.framePolicy ?? "deny";
  const previewAssets =
    framePolicy === "preview-document"
      ? getPreviewAssetSources(input.publicOrigin)
      : null;
  if (framePolicy === "preview-document" && !previewAssets) {
    throw new Error(
      "A valid NEXT_PUBLIC_URL origin is required for opaque Page previews."
    );
  }
  const imageSources = [
    "'self'",
    "data:",
    "blob:",
    ...(previewAssets
      ? [
          previewAssets.static,
          previewAssets.imageOptimizer,
          previewAssets.publicImages,
        ]
      : []),
    ...(input.cloudinaryEnabled ? ["https://res.cloudinary.com"] : []),
    ...(input.gcpEnabled ? ["https://storage.googleapis.com"] : []),
  ];
  const connectSources = [
    "'self'",
    ...(previewAssets
      ? [previewAssets.projectsApi, previewAssets.articlesApi]
      : []),
    ...(input.cloudinaryEnabled ? ["https://res.cloudinary.com"] : []),
    ...(input.gcpEnabled ? ["https://storage.googleapis.com"] : []),
  ];
  const directives = [
    framePolicy === "preview-document"
      ? "default-src 'none'"
      : "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${input.production ? "" : " 'unsafe-eval'"}${previewAssets ? ` ${previewAssets.static}` : ""}`,
    `style-src 'self' 'unsafe-inline'${previewAssets ? ` ${previewAssets.static}` : ""}`,
    `img-src ${imageSources.join(" ")}`,
    `media-src ${imageSources.join(" ")}`,
    `font-src 'self' data:${previewAssets ? ` ${previewAssets.static}` : ""}`,
    `connect-src ${connectSources.join(" ")}`,
    framePolicy === "preview-document"
      ? "worker-src 'none'"
      : "worker-src 'self' blob:",
    framePolicy === "preview-document"
      ? "manifest-src 'none'"
      : "manifest-src 'self'",
    "object-src 'none'",
    framePolicy === "preview-document" ? "base-uri 'none'" : "base-uri 'self'",
    framePolicy === "preview-document"
      ? "form-action 'none'"
      : "form-action 'self'",
    framePolicy === "preview-document"
      ? "frame-ancestors 'self'"
      : "frame-ancestors 'none'",
    framePolicy === "preview-parent" ? "frame-src 'self'" : "frame-src 'none'",
    ...(input.production ? ["upgrade-insecure-requests"] : []),
    "report-uri /api/security/csp-report",
  ];
  return directives.map(normalizeDirective).join("; ");
};

export const buildBrowserSecurityHeaders = (input: {
  production: boolean;
  cloudinaryEnabled: boolean;
  gcpEnabled: boolean;
  framePolicy?: BrowserFramePolicy;
  publicOrigin?: string;
}): Array<{ key: string; value: string }> => [
  {
    key: "Content-Security-Policy",
    value: buildContentSecurityPolicy(input),
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  {
    key: "X-Frame-Options",
    value: input.framePolicy === "preview-document" ? "SAMEORIGIN" : "DENY",
  },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  {
    key: "Permissions-Policy",
    value:
      "accelerometer=(), autoplay=(), camera=(), display-capture=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()",
  },
  ...(input.production
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains",
        },
      ]
    : []),
];
