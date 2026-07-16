export class MigrationError extends Error {
  readonly code: string;
  readonly safe_details?: Record<string, unknown>;

  constructor(
    code: string,
    message: string,
    safeDetails?: Record<string, unknown>
  ) {
    super(message);
    this.name = "MigrationError";
    this.code = code;
    this.safe_details = safeDetails;
  }
}

export class MigrationLeaseUnavailableError extends MigrationError {
  constructor() {
    super(
      "MIGRATION_LEASE_UNAVAILABLE",
      "Another migration runner currently owns the migration lease."
    );
    this.name = "MigrationLeaseUnavailableError";
  }
}

export class MigrationLeaseLostError extends MigrationError {
  constructor() {
    super(
      "MIGRATION_LEASE_LOST",
      "The migration runner lost its advisory lease; the run was stopped."
    );
    this.name = "MigrationLeaseLostError";
  }
}

export function toSafeMigrationFailure(error: unknown) {
  if (error instanceof MigrationError) {
    return {
      error_code: error.code,
      message: error.message,
      ...(error.safe_details ? { details: error.safe_details } : {}),
    };
  }

  return {
    error_code: "MIGRATION_EXECUTION_FAILED",
    message:
      "Migration execution failed. Inspect restricted operational logs without persisting raw database values.",
  };
}
