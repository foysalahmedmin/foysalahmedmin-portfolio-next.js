import type { NextConfig } from "next";
import { buildBrowserSecurityHeaders } from "./src/lib/security/browser-policy";

const cloudinaryCloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
const gcpPublicBucket = (
  process.env.GCP_PUBLIC_BUCKET_NAME || process.env.GCP_BUCKET_NAME
)?.trim();

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
        headers: buildBrowserSecurityHeaders({
          production: process.env.NODE_ENV === "production",
          cloudinaryEnabled: Boolean(cloudinaryCloudName),
          gcpEnabled: Boolean(gcpPublicBucket),
        }),
      },
      {
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, max-age=0" },
          { key: "Pragma", value: "no-cache" },
        ],
      },
    ];
  },
};

export default nextConfig;
