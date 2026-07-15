import { beforeEach, describe, expect, it } from "vitest";
import {
  createFixture,
  createFixtureObjectId,
  resetFixtureSequence,
} from "../fixtures/factory";

describe("fixture factory", () => {
  beforeEach(() => resetFixtureSequence());

  it("creates deterministic valid-length ObjectId strings", () => {
    expect(createFixtureObjectId()).toBe("000000000000000000000001");
    expect(createFixtureObjectId()).toBe("000000000000000000000002");
  });

  it("applies explicit overrides without mutating defaults", () => {
    const defaults = { status: "draft", title: "Default" };
    const result = createFixture(defaults, { status: "published" });

    expect(result).toEqual({ status: "published", title: "Default" });
    expect(defaults).toEqual({ status: "draft", title: "Default" });
  });
});
