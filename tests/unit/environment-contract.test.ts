import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const example = fs.readFileSync(
  path.join(process.cwd(), ".env.example"),
  "utf8"
);

const variableNames = new Set(
  example
    .split(/\r?\n/)
    .map((line) => line.match(/^([A-Z][A-Z0-9_]*)=/)?.[1])
    .filter((name): name is string => Boolean(name))
);

describe("environment contract", () => {
  it("documents the active authentication and operational settings", () => {
    expect(variableNames.has("JWT_ACCESS_SECRET")).toBe(true);
    expect(variableNames.has("JWT_REFRESH_SECRET")).toBe(true);
    expect(variableNames.has("RESET_PASSWORD_UI_LINK")).toBe(true);
    expect(variableNames.has("AUTH_MFA_ENCRYPTION_KEY")).toBe(true);
    expect(variableNames.has("AUTH_MFA_ISSUER")).toBe(true);
    expect(variableNames.has("MIGRATION_RELEASE")).toBe(true);
    expect(variableNames.has("MIGRATION_BACKUP_REFERENCE")).toBe(true);
  });

  it("does not retain obsolete or framework-owned settings", () => {
    expect(variableNames).not.toContain("NODE_ENV");
    expect(variableNames).not.toContain("NEXT_PUBLIC_RESET_PASSWORD_UI_LINK");
    expect(variableNames).not.toContain(
      "NEXT_PUBLIC_EMAIL_VERIFICATION_UI_LINK"
    );
    expect(variableNames).not.toContain("JWT_RESET_PASSWORD_SECRET");
    expect(variableNames).not.toContain("JWT_EMAIL_VERIFICATION_SECRET");
  });
});
