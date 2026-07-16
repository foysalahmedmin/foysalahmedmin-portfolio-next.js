export type SeedErrorCode =
  | "SEED_ARGUMENT_INVALID"
  | "SEED_DATABASE_URL_INVALID"
  | "SEED_ENVIRONMENT_INVALID"
  | "SEED_PRODUCTION_CONFIRMATION_REQUIRED"
  | "SEED_PRODUCTION_OPERATION_FORBIDDEN"
  | "SEED_RESET_CONFIRMATION_REQUIRED"
  | "SEED_FORCE_FORBIDDEN"
  | "SEED_ADMIN_REQUIRED"
  | "SEED_ADMIN_AMBIGUOUS"
  | "SEED_MANIFEST_INVALID"
  | "SEED_CHECKSUM_DRIFT"
  | "SEED_VERSION_DOWNGRADE"
  | "SEED_LOCKED"
  | "SEED_CONFLICT"
  | "SEED_TRANSACTION_REQUIRED"
  | "SEED_MEDIA_GATEWAY_REQUIRED"
  | "SEED_MEDIA_STAGE_FAILED"
  | "SEED_MEDIA_REFERENCE_INVALID"
  | "SEED_RESET_CONFLICT";

export class SeedError extends Error {
  readonly code: SeedErrorCode;
  readonly details: readonly string[];

  constructor(
    code: SeedErrorCode,
    message: string,
    details: readonly string[] = []
  ) {
    super(message);
    this.name = "SeedError";
    this.code = code;
    this.details = [...new Set(details)].slice(0, 100);
  }
}
