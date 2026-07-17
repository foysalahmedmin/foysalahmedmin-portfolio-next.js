import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const select = vi.fn();
  return {
    select,
    findOneAndUpdate: vi.fn(),
  };
});

vi.mock("@/app/api/users/user.model", () => ({
  default: {
    findOneAndUpdate: mocks.findOneAndUpdate,
  },
}));
vi.mock("@/app/api/auth/mfa-challenge.model", () => ({
  default: {},
}));
vi.mock("@/app/api/auth/mfa-credential.model", () => ({
  default: {},
}));

import { incrementUserMfaVersion } from "@/app/api/auth/mfa.repository";

const userId = "507f1f77bcf86cd799439011";
const baseState = {
  role: "admin" as const,
  status: "in-progress" as const,
  is_deleted: false,
  password_changed_at: new Date("2026-07-01T00:00:00.000Z"),
};

describe("MFA user-state compare-and-swap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.select.mockResolvedValue({ mfa_version: 1 });
    mocks.findOneAndUpdate.mockReturnValue({ select: mocks.select });
  });

  it("enrolls a pre-MFA user whose version field is still absent", async () => {
    await incrementUserMfaVersion(userId, baseState as never);

    expect(mocks.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        $and: expect.arrayContaining([
          {
            $or: [{ mfa_version: 0 }, { mfa_version: { $exists: false } }],
          },
        ]),
      }),
      { $inc: { mfa_version: 1 } },
      expect.objectContaining({ new: true })
    );
  });

  it("requires an exact positive version after enrollment", async () => {
    await incrementUserMfaVersion(userId, {
      ...baseState,
      mfa_version: 3,
    } as never);

    expect(mocks.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        $and: expect.arrayContaining([{ mfa_version: 3 }]),
      }),
      { $inc: { mfa_version: 1 } },
      expect.objectContaining({ new: true })
    );
  });
});
