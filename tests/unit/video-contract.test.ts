import {
  formatVideoDuration,
  getVideoPublishReadiness,
  isYouTubeUrl,
  normalizeVideoKeywords,
  parseYouTubeVideoId,
  toCanonicalYouTubeUrl,
  toYouTubeThumbnailUrl,
} from "@/lib/content/video-contract";
import { resolveVideoPlayback } from "@/lib/content/video-playback";
import { describe, expect, it } from "vitest";

const ID = "dQw4w9WgXcQ";

describe("YouTube link parsing", () => {
  it.each([
    [`https://www.youtube.com/watch?v=${ID}`, "watch"],
    [`https://youtube.com/watch?v=${ID}&t=42s`, "watch with extra params"],
    [`https://m.youtube.com/watch?v=${ID}`, "mobile"],
    [`https://music.youtube.com/watch?v=${ID}`, "music"],
    [`https://youtu.be/${ID}`, "short link"],
    [`https://youtu.be/${ID}?si=abc`, "short link with tracking"],
    [`https://www.youtube.com/embed/${ID}`, "embed"],
    [`https://www.youtube-nocookie.com/embed/${ID}`, "nocookie embed"],
    [`https://www.youtube.com/shorts/${ID}`, "shorts"],
    [`https://www.youtube.com/live/${ID}`, "live"],
    [`https://www.youtube.com/v/${ID}`, "legacy /v/"],
    [ID, "bare id"],
    [`  https://youtu.be/${ID}  `, "surrounding whitespace"],
  ])("extracts the id from %s (%s)", (input) => {
    expect(parseYouTubeVideoId(input)).toBe(ID);
    expect(isYouTubeUrl(input)).toBe(true);
  });

  it.each([
    ["", "empty"],
    ["not a url", "free text"],
    [`http://www.youtube.com/watch?v=${ID}`, "insecure scheme"],
    [`https://evil.example/watch?v=${ID}`, "foreign host"],
    [`https://www.youtube.com.evil.example/watch?v=${ID}`, "lookalike host"],
    [`https://user:pass@www.youtube.com/watch?v=${ID}`, "credentials"],
    ["https://www.youtube.com/watch?v=short", "id too short"],
    [`https://www.youtube.com/watch?v=${ID}extra`, "id too long"],
    ["https://www.youtube.com/playlist?list=PL12345678901", "playlist only"],
    [`javascript:alert(1)//${ID}`, "script scheme"],
    ["https://www.youtube.com/", "no video"],
  ])("rejects %s (%s)", (input) => {
    expect(parseYouTubeVideoId(input)).toBeNull();
    expect(isYouTubeUrl(input)).toBe(false);
  });

  it("rejects non-strings and oversized input", () => {
    expect(parseYouTubeVideoId(undefined)).toBeNull();
    expect(parseYouTubeVideoId(42)).toBeNull();
    expect(
      parseYouTubeVideoId(`https://youtu.be/${ID}?${"a".repeat(3_000)}`)
    ).toBeNull();
  });

  it("always plays and posters the canonical forms", () => {
    expect(toCanonicalYouTubeUrl(ID)).toBe(
      `https://www.youtube.com/watch?v=${ID}`
    );
    expect(toYouTubeThumbnailUrl(ID)).toBe(
      `https://i.ytimg.com/vi/${ID}/hqdefault.jpg`
    );
  });
});

describe("video keywords", () => {
  it("trims, collapses whitespace, removes control characters and duplicates", () => {
    expect(
      normalizeVideoKeywords([
        "  Next.js ",
        "next.js",
        "System\u0000   design",
        "",
        "  ",
        42,
      ])
    ).toEqual(["Next.js", "System design"]);
  });

  it("bounds the number and length of keywords", () => {
    const many = Array.from({ length: 40 }, (_, index) => `keyword ${index}`);
    expect(normalizeVideoKeywords(many)).toHaveLength(20);
    expect(normalizeVideoKeywords(["x".repeat(200)])[0]).toHaveLength(60);
    expect(normalizeVideoKeywords(undefined)).toEqual([]);
  });
});

describe("video publish readiness", () => {
  it("accepts a YouTube source with a resolvable id", () => {
    expect(
      getVideoPublishReadiness({
        aspect_ratio: "reel",
        source_type: "youtube",
        youtube_id: ID,
      })
    ).toEqual([]);
    expect(
      getVideoPublishReadiness({
        aspect_ratio: "landscape",
        source_type: "youtube",
        youtube_url: `https://youtu.be/${ID}`,
      })
    ).toEqual([]);
  });

  it("accepts an uploaded source that has a file", () => {
    expect(
      getVideoPublishReadiness({
        aspect_ratio: "landscape",
        source_type: "upload",
        video_file: "507f1f77bcf86cd799439011",
      })
    ).toEqual([]);
  });

  it("names every missing field", () => {
    expect(
      getVideoPublishReadiness({
        aspect_ratio: "square",
        source_type: "youtube",
      })
    ).toEqual(["aspect_ratio", "youtube_url"]);
    expect(
      getVideoPublishReadiness({ aspect_ratio: "reel", source_type: "upload" })
    ).toEqual(["video_file"]);
    expect(getVideoPublishReadiness({ aspect_ratio: "reel" })).toEqual([
      "source_type",
    ]);
  });
});

describe("video duration labels", () => {
  it("formats minutes and hours and ignores unusable values", () => {
    expect(formatVideoDuration(9)).toBe("0:09");
    expect(formatVideoDuration(75)).toBe("1:15");
    expect(formatVideoDuration(3_725)).toBe("1:02:05");
    expect(formatVideoDuration(0)).toBe("");
    expect(formatVideoDuration(undefined)).toBe("");
    expect(formatVideoDuration(Number.NaN)).toBe("");
  });
});

describe("video playback resolution", () => {
  it("plays YouTube through the canonical URL and falls back to YouTube's poster", () => {
    expect(
      resolveVideoPlayback({ source_type: "youtube", youtube_id: ID })
    ).toEqual({
      src: `https://www.youtube.com/watch?v=${ID}`,
      poster: `https://i.ytimg.com/vi/${ID}/hqdefault.jpg`,
    });
  });

  it("prefers an uploaded thumbnail over YouTube's poster", () => {
    expect(
      resolveVideoPlayback({
        source_type: "youtube",
        youtube_id: ID,
        thumbnail: {
          url: "https://res.cloudinary.com/demo/image/upload/a.webp",
        },
      })?.poster
    ).toBe("https://res.cloudinary.com/demo/image/upload/a.webp");
  });

  it("plays an uploaded file and has no poster without a thumbnail", () => {
    expect(
      resolveVideoPlayback({
        source_type: "upload",
        video_file: {
          url: "https://res.cloudinary.com/demo/video/upload/a.mp4",
        },
      })
    ).toEqual({ src: "https://res.cloudinary.com/demo/video/upload/a.mp4" });
  });

  it("returns nothing when the source is unusable", () => {
    expect(resolveVideoPlayback({ source_type: "youtube" })).toBeNull();
    expect(resolveVideoPlayback({ source_type: "upload" })).toBeNull();
    expect(resolveVideoPlayback({})).toBeNull();
  });
});
