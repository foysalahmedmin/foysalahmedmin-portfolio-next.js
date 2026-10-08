import { readMp4Metadata } from "@/lib/media/video-metadata";
import { describe, expect, it } from "vitest";
import { readMediaFixture } from "../helpers/media-fixtures";

describe("MP4 metadata reader", () => {
  it("reads the size and duration of a landscape clip", () => {
    expect(readMp4Metadata(readMediaFixture("landscape.mp4"))).toEqual({
      width: 64,
      height: 36,
      duration_seconds: 1,
    });
  });

  it("reads the size of a portrait clip", () => {
    expect(readMp4Metadata(readMediaFixture("portrait.mp4"))).toMatchObject({
      width: 36,
      height: 64,
    });
  });

  it("reports the displayed size of a clip stored sideways", () => {
    // Phones record portrait video as landscape pixels plus a 90° matrix.
    expect(readMp4Metadata(readMediaFixture("rotated.mp4"))).toMatchObject({
      width: 36,
      height: 64,
    });
  });

  it("returns nothing for WebM, which carries no ISO boxes", () => {
    expect(readMp4Metadata(readMediaFixture("clip.webm"))).toEqual({});
  });

  it("never throws on hostile or truncated input", () => {
    const full = readMediaFixture("landscape.mp4");
    expect(readMp4Metadata(Buffer.alloc(0))).toEqual({});
    expect(readMp4Metadata(Buffer.from("not a video at all"))).toEqual({});
    for (const length of [4, 8, 16, 40, 200, full.length - 1]) {
      expect(() => readMp4Metadata(full.subarray(0, length))).not.toThrow();
    }
    // A box that claims to be larger than the file must be ignored.
    const lying = Buffer.from(full);
    lying.writeUInt32BE(0x7fffffff, 0);
    expect(() => readMp4Metadata(lying)).not.toThrow();
    // A zero-sized (to-end-of-file) box and a 64-bit size must not loop.
    const endless = Buffer.alloc(16);
    endless.write("free", 4, "latin1");
    expect(readMp4Metadata(endless)).toEqual({});
  });
});
