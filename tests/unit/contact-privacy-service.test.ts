import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  deleteOne: vi.fn(),
  sendEmail: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ default: vi.fn(async () => undefined) }));
vi.mock("@/app/api/contacts/contact-privacy.model", () => ({
  default: {
    create: mocks.create,
    deleteOne: mocks.deleteOne,
  },
}));
vi.mock("@/app/api/contacts/contact.repository", () => ({}));
vi.mock("@/app/api/contacts/contact-retention.service", () => ({
  anonymizeContacts: vi.fn(),
}));
vi.mock("@/app/api/contacts/contact-security", () => ({
  hmacContactValue: (namespace: string) =>
    namespace.replaceAll("-", "").padEnd(64, "a").slice(0, 64),
}));
vi.mock("@/utils/send-email", () => ({ sendEmail: mocks.sendEmail }));

import { requestContactPrivacyAction } from "@/app/api/contacts/contact-privacy.service";

describe("contact privacy request service", () => {
  beforeEach(() => {
    mocks.create.mockReset().mockResolvedValue({});
    mocks.deleteOne.mockReset().mockResolvedValue({ deletedCount: 1 });
    mocks.sendEmail.mockReset().mockResolvedValue(undefined);
  });

  it("persists only hashes and always sends the same one-time verification flow", async () => {
    const result = await requestContactPrivacyAction({
      email: "owner@example.com",
      action: "access",
    });

    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "access",
        email_hash: expect.not.stringContaining("owner@example.com"),
        verification_hash: expect.any(String),
      })
    );
    expect(mocks.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "owner@example.com" })
    );
    expect(JSON.stringify(result)).not.toContain("owner@example.com");
    expect(JSON.stringify(result)).not.toMatch(/\b\d{6}\b/);
  });

  it("removes the unusable request when verification delivery fails", async () => {
    mocks.sendEmail.mockRejectedValueOnce(new Error("smtp detail"));
    await expect(
      requestContactPrivacyAction({
        email: "owner@example.com",
        action: "delete",
      })
    ).rejects.toMatchObject({ status: 503 });
    expect(mocks.deleteOne).toHaveBeenCalledOnce();
  });
});
