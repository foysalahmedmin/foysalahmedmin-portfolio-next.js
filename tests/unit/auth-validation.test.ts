import {
  changePasswordValidationSchema,
  signupValidationSchema,
} from "@/app/api/auth/auth.validation";
import { updateSelfValidationSchema } from "@/app/api/users/user.validation";
import { describe, expect, it } from "vitest";

describe("authentication payload boundaries", () => {
  it("rejects an elevated or unknown signup field", () => {
    expect(() =>
      signupValidationSchema.parse({
        body: {
          name: "Attempted Admin",
          email: "admin@example.test",
          password: "LongPassword123",
          role: "super-admin",
        },
      })
    ).toThrow();
  });

  it("rejects role changes through the self-profile payload", () => {
    expect(() =>
      updateSelfValidationSchema.parse({
        body: { name: "User Name", role: "admin" },
      })
    ).toThrow();
  });

  it.each([
    "shortA1",
    "alllowercase123",
    "ALLUPPERCASE123",
    "NoNumberPassword",
  ])("rejects the weak password %s", (newPassword) => {
    expect(() =>
      changePasswordValidationSchema.parse({
        body: {
          current_password: "CurrentPassword123",
          new_password: newPassword,
        },
      })
    ).toThrow();
  });
});
