import { SeedError } from "./errors.ts";
import type { SeedEnvironment, SeedMode } from "./types.ts";

export const SEED_PRODUCTION_CONFIRMATION =
  "APPLY_TRUTHFUL_PORTFOLIO_FOUNDATION" as const;
export const SEED_RESET_CONFIRMATION =
  "RESET_NON_PRODUCTION_SEED_DATA" as const;

export const resolveSeedEnvironment = (
  nodeEnvironment: string | undefined,
  declaredEnvironment: string | undefined
): SeedEnvironment => {
  const resolved = nodeEnvironment?.trim() || "development";
  if (!["development", "test", "production"].includes(resolved)) {
    throw new SeedError(
      "SEED_ENVIRONMENT_INVALID",
      "NODE_ENV must be development, test, or production for seed operations."
    );
  }
  if (declaredEnvironment && declaredEnvironment.trim() !== resolved) {
    throw new SeedError(
      "SEED_ENVIRONMENT_INVALID",
      "SEED_ENVIRONMENT must exactly match NODE_ENV."
    );
  }
  return resolved as SeedEnvironment;
};

export const assertSeedOperationAllowed = (input: {
  environment: SeedEnvironment;
  mode: SeedMode;
  operation: "apply" | "dry_run" | "reset";
  force: boolean;
  production_confirmation?: string;
  reset_confirmation?: string;
}): void => {
  if (input.environment === "production" && input.force) {
    throw new SeedError(
      "SEED_FORCE_FORBIDDEN",
      "Forced seed writes are permanently disabled in production."
    );
  }

  if (
    input.environment === "production" &&
    (input.mode === "demo" || input.operation === "reset")
  ) {
    throw new SeedError(
      "SEED_PRODUCTION_OPERATION_FORBIDDEN",
      "Demo and reset seed operations are permanently disabled in production."
    );
  }

  if (
    input.environment === "production" &&
    input.operation === "apply" &&
    input.production_confirmation !== SEED_PRODUCTION_CONFIRMATION
  ) {
    throw new SeedError(
      "SEED_PRODUCTION_CONFIRMATION_REQUIRED",
      `SEED_PRODUCTION_CONFIRM must equal ${SEED_PRODUCTION_CONFIRMATION}.`
    );
  }

  if (
    input.operation === "reset" &&
    input.reset_confirmation !== SEED_RESET_CONFIRMATION
  ) {
    throw new SeedError(
      "SEED_RESET_CONFIRMATION_REQUIRED",
      `SEED_RESET_CONFIRM must equal ${SEED_RESET_CONFIRMATION}.`
    );
  }
};
