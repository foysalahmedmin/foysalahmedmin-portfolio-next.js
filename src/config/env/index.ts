export const ENV = {
  base_url: process.env.NEXT_PUBLIC_VITE_BASE_URL as string,
  media_url: process.env.NEXT_PUBLIC_VITE_MEDIA_URL as string,
  environment: process.env.NODE_ENV as "development" | "production",
};
