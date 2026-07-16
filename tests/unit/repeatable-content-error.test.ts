import { describe, expect, it } from "vitest";
import { versionConflict } from "@/app/api/repeatable-content/record.error";
import { errorHandler } from "@/utils/error-handler";

describe("repeatable-content error contract", () => {
  it("returns a stable optimistic conflict code and current version", async () => {
    const response = errorHandler(versionConflict(7));
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      status: 409,
      code: "VERSION_CONFLICT",
      current_version: 7,
    });
  });

  it("does not expose generic production/test internal errors", async () => {
    const response = errorHandler(
      new Error("database topology and secret details")
    );
    const body = await response.json();
    expect(response.status).toBe(500);
    expect(JSON.stringify(body)).not.toContain("topology");
    expect(body).toMatchObject({
      message: "Something went wrong!",
      error: { name: "InternalServerError" },
    });
  });
});
