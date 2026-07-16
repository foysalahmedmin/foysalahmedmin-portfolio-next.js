import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  connectDB: vi.fn(),
  revalidateTag: vi.fn(),
  createIntent: vi.fn(),
  markDelivered: vi.fn(),
  markFailed: vi.fn(),
  findPending: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ default: mocks.connectDB }));
vi.mock("next/cache", () => ({ revalidateTag: mocks.revalidateTag }));
vi.mock("@/app/api/public-content-cache/cache-invalidation.repository", () => ({
  createIntent: mocks.createIntent,
  markDelivered: mocks.markDelivered,
  markFailed: mocks.markFailed,
  findPending: mocks.findPending,
}));

import {
  invalidatePublicContentAfterCommit,
  retryPendingPublicContentInvalidations,
} from "@/app/api/public-content-cache/cache-invalidation.service";

describe("Article and Project composition cache invalidation", () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
    mocks.connectDB.mockResolvedValue(undefined);
    mocks.createIntent.mockResolvedValue("intent-1");
    mocks.markDelivered.mockResolvedValue(undefined);
    mocks.markFailed.mockResolvedValue(undefined);
    mocks.findPending.mockResolvedValue([]);
  });

  it.each([
    ["article", "portfolio:v1:articles"],
    ["project", "portfolio:v1:projects"],
  ] as const)(
    "creates and delivers a durable %s intent",
    async (domain, tag) => {
      const delivered = await invalidatePublicContentAfterCommit(domain);

      expect(delivered).toBe(true);
      expect(mocks.createIntent).toHaveBeenCalledWith({
        event_key: expect.stringMatching(/^[0-9a-f-]{36}$/),
        domain,
        tag,
      });
      expect(mocks.revalidateTag).toHaveBeenCalledWith(tag, "max");
      expect(mocks.markDelivered).toHaveBeenCalledWith("intent-1");
      expect(mocks.markFailed).not.toHaveBeenCalled();
    }
  );

  it("keeps the committed intent pending when framework invalidation fails", async () => {
    mocks.revalidateTag.mockImplementationOnce(() => {
      throw new Error("framework cache unavailable");
    });

    const delivered = await invalidatePublicContentAfterCommit("article");

    expect(delivered).toBe(false);
    expect(mocks.createIntent).toHaveBeenCalledOnce();
    expect(mocks.markFailed).toHaveBeenCalledWith("intent-1");
    expect(mocks.markDelivered).not.toHaveBeenCalled();
  });

  it("retries pending intents independently and redacts delivery failures", async () => {
    mocks.findPending.mockResolvedValue([
      { id: "intent-1", tag: "portfolio:v1:articles" },
      { id: "intent-2", tag: "portfolio:v1:projects" },
    ]);
    mocks.revalidateTag
      .mockImplementationOnce(() => undefined)
      .mockImplementationOnce(() => {
        throw new Error("secret framework detail");
      });

    const result = await retryPendingPublicContentInvalidations(999);

    expect(result).toEqual({ attempted: 2, delivered: 1 });
    expect(mocks.findPending).toHaveBeenCalledWith(expect.any(Date), 25);
    expect(mocks.markDelivered).toHaveBeenCalledWith("intent-1");
    expect(mocks.markFailed).toHaveBeenCalledWith("intent-2");
  });

  it("clamps invalid retry batch sizes before repository access", async () => {
    await retryPendingPublicContentInvalidations(Number.NaN);
    expect(mocks.findPending).toHaveBeenLastCalledWith(expect.any(Date), 1);

    await retryPendingPublicContentInvalidations(-40);
    expect(mocks.findPending).toHaveBeenLastCalledWith(expect.any(Date), 1);
  });
});
