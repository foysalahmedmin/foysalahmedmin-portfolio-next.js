export const ENV = {
  // Server
  port: process.env.PORT!,

  // App Environment
  environment: process.env.NODE_ENV as "development" | "production",

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

  // Default user password
  default_password: process.env.DEFAULT_PASSWORD!,

  // JWT
  jwt_access_secret: process.env.JWT_ACCESS_SECRET!,
  jwt_access_secret_expires_in: process.env.JWT_ACCESS_SECRET_EXPIRES_IN!,
  jwt_refresh_secret: process.env.JWT_REFRESH_SECRET!,
  jwt_refresh_secret_expires_in: process.env.JWT_REFRESH_SECRET_EXPIRES_IN!,
  jwt_reset_password_secret: process.env.JWT_RESET_PASSWORD_SECRET!,
  jwt_reset_password_secret_expires_in:
    process.env.JWT_RESET_PASSWORD_SECRET_EXPIRES_IN!,
  jwt_email_verification_secret: process.env.JWT_EMAIL_VERIFICATION_SECRET!,
  jwt_email_verification_secret_expires_in:
    process.env.JWT_EMAIL_VERIFICATION_SECRET_EXPIRES_IN!,

  // Session
  session_secret: process.env.SESSION_SECRET!,

  // Email Auth
  auth_user_email: process.env.AUTH_USER_EMAIL!,
  auth_user_email_password: process.env.AUTH_USER_EMAIL_PASSWORD!,

  // Google Cloud Storage
  gcp_project_id: process.env.GCP_PROJECT_ID,
  gcp_credentials_path: process.env.GCP_CREDENTIALS_PATH,
  gcp_bucket_name: process.env.GCP_BUCKET_NAME,
};
