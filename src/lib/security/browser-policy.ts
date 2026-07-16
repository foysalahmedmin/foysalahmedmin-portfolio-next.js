const normalizeDirective = (value: string): string =>
  value.replace(/\s{2,}/g, " ").trim();

export const buildContentSecurityPolicy = (input: {
  production: boolean;
  cloudinaryEnabled: boolean;
  gcpEnabled: boolean;
}): string => {
  const imageSources = [
    "'self'",
    "data:",
    "blob:",
    ...(input.cloudinaryEnabled ? ["https://res.cloudinary.com"] : []),
    ...(input.gcpEnabled ? ["https://storage.googleapis.com"] : []),
  ];
  const connectSources = [
    "'self'",
    ...(input.cloudinaryEnabled ? ["https://res.cloudinary.com"] : []),
    ...(input.gcpEnabled ? ["https://storage.googleapis.com"] : []),
  ];
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${input.production ? "" : " 'unsafe-eval'"}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src ${imageSources.join(" ")}`,
    `media-src ${imageSources.join(" ")}`,
    "font-src 'self' data:",
    `connect-src ${connectSources.join(" ")}`,
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "frame-src 'none'",
    ...(input.production ? ["upgrade-insecure-requests"] : []),
    "report-uri /api/security/csp-report",
  ];
  return directives.map(normalizeDirective).join("; ");
};

export const buildBrowserSecurityHeaders = (input: {
  production: boolean;
  cloudinaryEnabled: boolean;
  gcpEnabled: boolean;
}): Array<{ key: string; value: string }> => [
  {
    key: "Content-Security-Policy",
    value: buildContentSecurityPolicy(input),
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
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
