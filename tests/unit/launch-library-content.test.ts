import { createCaseStudySchema } from "@/app/api/case-studies/case-study.validation";
import { createVideoSchema } from "@/app/api/videos/video.validation";
import { parseYouTubeVideoId } from "@/lib/content/video-contract";
import { PILLAR_KEYS } from "@/lib/content/pillars";
import { getCaseStudyPublishReadiness } from "@/lib/content/case-study-contract";
import {
  LAUNCH_CASE_STUDIES,
  LAUNCH_CASE_STUDY_CATEGORIES,
  LAUNCH_VIDEOS,
  LAUNCH_VIDEO_CATEGORIES,
} from "@/lib/seed/launch-library-content";
import { describe, expect, it } from "vitest";

const id = "507f1f77bcf86cd799439011";

describe("launch case studies", () => {
  it("each satisfy the create schema and the publish check", () => {
    for (const study of LAUNCH_CASE_STUDIES) {
      const parsed = createCaseStudySchema.safeParse({
        body: {
          name: study.name,
          category: id,
          description: study.description,
          overview: study.overview,
          engagement_type: "internal",
          primary_pillar: study.pillar,
          role: study.role,
          challenge: study.challenge,
          approach: study.approach,
          key_decisions: [...study.decisions],
          solution: study.solution,
          results_summary: study.results,
          outcomes: study.outcomes.map((o) => ({ ...o, verification_state: "derived" })),
          tech_stack: [...study.tools],
          services: [...study.services],
          learnings: [...study.learnings],
          keywords: [...study.keywords],
          status: "published",
        },
      });
      expect(parsed.success, study.name).toBe(true);
      expect(
        getCaseStudyPublishReadiness({
          description: study.description,
          primary_pillar: study.pillar,
          engagement_type: "internal",
          challenge: study.challenge,
          approach: study.approach,
          solution: study.solution,
          results_summary: study.results,
        })
      ).toEqual([]);
    }
  });

  it("cover every role, use known categories and stay honest about evidence", () => {
    const categories = new Set(LAUNCH_CASE_STUDY_CATEGORIES.map((c) => c.slug));
    expect(new Set(LAUNCH_CASE_STUDIES.map((s) => s.pillar))).toEqual(new Set(PILLAR_KEYS));
    for (const study of LAUNCH_CASE_STUDIES) {
      expect(categories.has(study.category)).toBe(true);
    }
    expect(new Set(LAUNCH_CASE_STUDIES.map((s) => s.name)).size).toBe(LAUNCH_CASE_STUDIES.length);
    // No invented client, revenue or traffic claims.
    const text = JSON.stringify(LAUNCH_CASE_STUDIES);
    expect(text).not.toMatch(/\brevenue\b|\bROI\b|\d+\s?%|\bclients? (said|praised)\b/i);
  });
});

describe("launch videos", () => {
  it("are valid YouTube videos with credited descriptions", () => {
    const categories = new Set(LAUNCH_VIDEO_CATEGORIES.map((c) => c.slug));
    for (const video of LAUNCH_VIDEOS) {
      const parsed = createVideoSchema.safeParse({
        body: {
          name: video.name,
          category: id,
          aspect_ratio: video.aspect,
          source_type: "youtube",
          youtube_url: video.url,
          description: video.description,
          keywords: [...video.keywords],
          status: "published",
        },
      });
      expect(parsed.success, video.name).toBe(true);
      expect(categories.has(video.category)).toBe(true);
      expect(video.description).toMatch(/Video by .+ on YouTube\./);
      // A reel must be a Shorts link; a landscape video must not be.
      expect(video.url.includes("/shorts/")).toBe(video.aspect === "reel");
    }
  });

  it("fill both home lanes without repeating a video", () => {
    const ids = LAUNCH_VIDEOS.map((v) => parseYouTubeVideoId(v.url));
    expect(new Set(ids).size).toBe(ids.length);
    expect(LAUNCH_VIDEOS.filter((v) => v.aspect === "landscape").length).toBeGreaterThanOrEqual(3);
    expect(LAUNCH_VIDEOS.filter((v) => v.aspect === "reel").length).toBeGreaterThanOrEqual(4);
  });
});
