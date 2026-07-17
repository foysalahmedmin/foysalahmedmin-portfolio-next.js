import type { NextConfig } from "next";
import {
  buildBrowserSecurityHeaders,
  resolveBrowserPublicOrigin,
} from "./src/lib/security/browser-policy";

const cloudinaryCloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
const gcpPublicBucket = (
  process.env.GCP_PUBLIC_BUCKET_NAME || process.env.GCP_BUCKET_NAME
)?.trim();

export const resolveNextPublicOrigin = (
  environment: Readonly<{
    NODE_ENV?: string;
    NEXT_PUBLIC_URL?: string;
    PORT?: string;
  }>
) =>
  resolveBrowserPublicOrigin({
    production: environment.NODE_ENV === "production",
    configured: environment.NEXT_PUBLIC_URL,
    port: environment.PORT,
  });

const browserSecurityInput = {
  production: process.env.NODE_ENV === "production",
  cloudinaryEnabled: Boolean(cloudinaryCloudName),
  gcpEnabled: Boolean(gcpPublicBucket),
  publicOrigin: resolveNextPublicOrigin(process.env),
} as const;
const publicPreviewAssetHeaders = [
  { key: "Access-Control-Allow-Origin", value: "*" },
  { key: "Cross-Origin-Resource-Policy", value: "cross-origin" },
] as const;
const publicPreviewDiscoveryHeaders = [
  ...publicPreviewAssetHeaders,
  { key: "Access-Control-Allow-Methods", value: "GET, HEAD" },
] as const;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      ...(cloudinaryCloudName
        ? [
            {
              protocol: "https" as const,
              hostname: "res.cloudinary.com",
              pathname: `/${cloudinaryCloudName}/image/upload/**`,
            },
          ]
        : []),
      ...(gcpPublicBucket
        ? [
            {
              protocol: "https" as const,
              hostname: "storage.googleapis.com",
              pathname: `/${gcpPublicBucket}/**`,
            },
          ]
        : []),
    ],
  },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: buildBrowserSecurityHeaders(browserSecurityInput),
      },
      {
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, max-age=0" },
          { key: "Pragma", value: "no-cache" },
        ],
      },
      {
        source: "/admin/pages/:path*",
        headers: buildBrowserSecurityHeaders({
          ...browserSecurityInput,
          framePolicy: "preview-parent",
        }),
      },
      {
        source: "/admin/preview/:path*",
        headers: [
          ...buildBrowserSecurityHeaders({
            ...browserSecurityInput,
            framePolicy: "preview-document",
          }),
          {
            key: "Cache-Control",
            value: "private, no-store, max-age=0",
          },
          { key: "Pragma", value: "no-cache" },
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow, noarchive, nosnippet, noimageindex",
          },
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      },
      {
        source: "/_next/static/:path*",
        headers: [...publicPreviewAssetHeaders],
      },
      {
        source: "/_next/image",
        headers: [...publicPreviewAssetHeaders],
      },
      {
        source: "/images/:path*",
        headers: [...publicPreviewAssetHeaders],
      },
      {
        source: "/api/projects",
        headers: [...publicPreviewDiscoveryHeaders],
      },
      {
        source: "/api/articles",
        headers: [...publicPreviewDiscoveryHeaders],
      },
    ];
  },
};

export default nextConfig;
