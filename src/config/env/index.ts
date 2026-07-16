export const ENV = {
  // Server
  port: process.env.PORT!,

  // App Environment
  environment: process.env.NODE_ENV as "development" | "production" | "test",

  // URLs
  url:
    process.env.NEXT_PUBLIC_URL && process.env.NEXT_PUBLIC_URL !== "undefined"
      ? process.env.NEXT_PUBLIC_URL
      : "",

  // UI Redirect Links
  reset_password_ui_link: process.env.NEXT_PUBLIC_RESET_PASSWORD_UI_LINK!,
  email_verification_ui_link:
    process.env.NEXT_PUBLIC_EMAIL_VERIFICATION_UI_LINK!,

  // Database
  database_url: process.env.DATABASE_URL!,

  // Bcrypt
  bcrypt_salt_rounds: process.env.BCRYPT_SALT_ROUNDS!,

  // JWT
  jwt_access_secret: process.env.JWT_ACCESS_SECRET!,
  jwt_refresh_secret: process.env.JWT_REFRESH_SECRET!,
  jwt_reset_password_secret: process.env.JWT_RESET_PASSWORD_SECRET!,
  jwt_reset_password_secret_expires_in:
    process.env.JWT_RESET_PASSWORD_SECRET_EXPIRES_IN!,
  jwt_email_verification_secret: process.env.JWT_EMAIL_VERIFICATION_SECRET!,
  jwt_email_verification_secret_expires_in:
    process.env.JWT_EMAIL_VERIFICATION_SECRET_EXPIRES_IN!,

  // Session
  session_secret: process.env.SESSION_SECRET!,
  auth_abuse_secret: process.env.AUTH_ABUSE_SECRET,
  auth_client_ip_header: process.env.AUTH_CLIENT_IP_HEADER,
  auth_trusted_proxy_hops: process.env.AUTH_TRUSTED_PROXY_HOPS,
  auth_public_signup_enabled: process.env.AUTH_PUBLIC_SIGNUP_ENABLED,
  auth_admin_mfa_mode: process.env.AUTH_ADMIN_MFA_MODE,

  // Administrative audit integrity
  audit_hmac_secret: process.env.AUDIT_HMAC_SECRET,
  page_preview_secret: process.env.PAGE_PREVIEW_SECRET,
  page_preview_ttl_seconds: process.env.PAGE_PREVIEW_TTL_SECONDS,

  // Email Auth
  auth_user_email: process.env.AUTH_USER_EMAIL!,
  auth_user_email_password: process.env.AUTH_USER_EMAIL_PASSWORD!,

  // Contact intake, abuse prevention, outbox and retention
  contact_allowed_origins: process.env.CONTACT_ALLOWED_ORIGINS,
  contact_abuse_secret: process.env.CONTACT_ABUSE_SECRET,
  contact_client_ip_header: process.env.CONTACT_CLIENT_IP_HEADER,
  contact_trusted_proxy_hops: process.env.CONTACT_TRUSTED_PROXY_HOPS,
  contact_max_body_bytes: process.env.CONTACT_MAX_BODY_BYTES,
  contact_min_fill_time_ms: process.env.CONTACT_MIN_FILL_TIME_MS,
  contact_max_fill_time_ms: process.env.CONTACT_MAX_FILL_TIME_MS,
  contact_rate_limit: process.env.CONTACT_RATE_LIMIT,
  contact_rate_window_seconds: process.env.CONTACT_RATE_WINDOW_SECONDS,
  contact_retention_days: process.env.CONTACT_RETENTION_DAYS,
  contact_require_transactions: process.env.CONTACT_REQUIRE_TRANSACTIONS,
  contact_worker_batch_size: process.env.CONTACT_WORKER_BATCH_SIZE,
  contact_worker_max_attempts: process.env.CONTACT_WORKER_MAX_ATTEMPTS,
  contact_worker_secret: process.env.CONTACT_WORKER_SECRET,
  upstash_redis_rest_url: process.env.UPSTASH_REDIS_REST_URL,
  upstash_redis_rest_token: process.env.UPSTASH_REDIS_REST_TOKEN,

  // Cloud Storage
  storage_provider: (process.env.STORAGE_PROVIDER?.trim().toLowerCase() ||
    "cloudinary") as "cloudinary" | "gcp",

  // Cloudinary
  cloudinary_cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  cloudinary_api_key: process.env.CLOUDINARY_API_KEY,
  cloudinary_api_secret: process.env.CLOUDINARY_API_SECRET,
  cloudinary_folder: process.env.CLOUDINARY_FOLDER?.trim() || "min",

  // Google Cloud Storage
  gcp_project_id: process.env.GCP_PROJECT_ID,
  gcp_credentials_path: process.env.GCP_CREDENTIALS_PATH,
  gcp_bucket_name: process.env.GCP_BUCKET_NAME,
  gcp_public_bucket_name:
    process.env.GCP_PUBLIC_BUCKET_NAME || process.env.GCP_BUCKET_NAME,
  gcp_private_bucket_name: process.env.GCP_PRIVATE_BUCKET_NAME,
};
