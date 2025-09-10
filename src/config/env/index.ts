export const ENV = {
  // Server
  port: process.env.PORT!,

  // App Environment
  environment: process.env.NODE_ENV as "development" | "production",

  // URLs
  url: process.env.NEXT_PUBLIC_URL!,

  // UI Redirect Links
  resetPasswordUiLink: process.env.NEXT_PUBLIC_RESET_PASSWORD_UI_LINK!,
  emailVerificationUiLink: process.env.NEXT_PUBLIC_EMAIL_VERIFICATION_UI_LINK!,

  // Database
  databaseUrl: process.env.DATABASE_URL!,

  // Bcrypt
  bcryptSaltRounds: process.env.BCRYPT_SALT_ROUNDS!,

  // Default user password
  defaultPassword: process.env.DEFAULT_PASSWORD!,

  // JWT
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET!,
  jwtAccessSecretExpiresIn: process.env.JWT_ACCESS_SECRET_EXPIRES_IN!,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET!,
  jwtRefreshSecretExpiresIn: process.env.JWT_REFRESH_SECRET_EXPIRES_IN!,
  jwtResetPasswordSecret: process.env.JWT_RESET_PASSWORD_SECRET!,
  jwtResetPasswordSecretExpiresIn:
    process.env.JWT_RESET_PASSWORD_SECRET_EXPIRES_IN!,
  jwtEmailVerificationSecret: process.env.JWT_EMAIL_VERIFICATION_SECRET!,
  jwtEmailVerificationSecretExpiresIn:
    process.env.JWT_EMAIL_VERIFICATION_SECRET_EXPIRES_IN!,

  // Session
  sessionSecret: process.env.SESSION_SECRET!,

  // Email Auth
  authUserEmail: process.env.AUTH_USER_EMAIL!,
  authUserEmailPassword: process.env.AUTH_USER_EMAIL_PASSWORD!,
};
