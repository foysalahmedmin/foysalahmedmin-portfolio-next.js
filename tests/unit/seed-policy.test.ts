import {
  assertSeedOperationAllowed,
  resolveSeedEnvironment,
  SEED_PRODUCTION_CONFIRMATION,
  SEED_RESET_CONFIRMATION,
} from "@/lib/seed/policy";
import type { SeedError } from "@/lib/seed/errors";
import { describe, expect, it } from "vitest";

describe("seed environment policy", () => {
  it("allows a read-only production dry run without a confirmation phrase", () => {
    expect(() =>
      assertSeedOperationAllowed({
        environment: "production",
        mode: "foundation",
        operation: "dry_run",
        force: false,
      })
    ).not.toThrow();
  });

  it("requires deliberate confirmation for a production foundation apply", () => {
    expect(() =>
      assertSeedOperationAllowed({
        environment: "production",
        mode: "foundation",
        operation: "apply",
        force: false,
      })
    ).toThrowError(
      expect.objectContaining<Partial<SeedError>>({
        code: "SEED_PRODUCTION_CONFIRMATION_REQUIRED",
      })
    );

    expect(() =>
      assertSeedOperationAllowed({
        environment: "production",
        mode: "foundation",
        operation: "apply",
        force: false,
        production_confirmation: SEED_PRODUCTION_CONFIRMATION,
      })
    ).not.toThrow();
  });

  it.each([
    { mode: "demo" as const, operation: "apply" as const },
    { mode: "foundation" as const, operation: "reset" as const },
  ])("permanently forbids $mode/$operation in production", (input) => {
    expect(() =>
      assertSeedOperationAllowed({
        environment: "production",
        force: false,
        ...input,
      })
    ).toThrowError(
      expect.objectContaining<Partial<SeedError>>({
        code: "SEED_PRODUCTION_OPERATION_FORBIDDEN",
      })
    );
  });

  it("permanently forbids force in production", () => {
    expect(() =>
      assertSeedOperationAllowed({
        environment: "production",
        mode: "foundation",
        operation: "dry_run",
        force: true,
      })
    ).toThrowError(
      expect.objectContaining<Partial<SeedError>>({
        code: "SEED_FORCE_FORBIDDEN",
      })
    );
  });

  it("guards non-production reset and permits its exact confirmation", () => {
    expect(() =>
      assertSeedOperationAllowed({
        environment: "test",
        mode: "foundation",
        operation: "reset",
        force: false,
      })
    ).toThrowError(
      expect.objectContaining<Partial<SeedError>>({
        code: "SEED_RESET_CONFIRMATION_REQUIRED",
      })
    );
    expect(() =>
      assertSeedOperationAllowed({
        environment: "test",
        mode: "foundation",
        operation: "reset",
        force: false,
        reset_confirmation: SEED_RESET_CONFIRMATION,
      })
    ).not.toThrow();
  });

  it("rejects an environment declaration that differs from NODE_ENV", () => {
    expect(() => resolveSeedEnvironment("production", "development")).toThrow(
      expect.objectContaining<Partial<SeedError>>({
        code: "SEED_ENVIRONMENT_INVALID",
      })
    );
  });
});
