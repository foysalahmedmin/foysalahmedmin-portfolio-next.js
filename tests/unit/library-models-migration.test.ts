import "@/app/api/case-studies/case-study.model";
import "@/app/api/case-study-categories/case-study-category.model";
import "@/app/api/video-categories/video-category.model";
import "@/app/api/videos/video.model";
import {
  CASE_STUDY_AND_VIDEO_COLLECTIONS,
  CASE_STUDY_AND_VIDEO_INDEX_TARGETS,
  isCaseStudyAndVideoIndexReady,
} from "@/lib/db/migrations/202610080001-case-study-and-video-foundation";
import { MIGRATION_REGISTRY } from "@/lib/db/migrations/registry";
import mongoose from "mongoose";
import { describe, expect, it } from "vitest";

const MODELS = {
  CaseStudy: "case_studies",
  CaseStudyCategory: "case_study_categories",
  Video: "videos",
  VideoCategory: "video_categories",
} as const;

describe("case study and video models", () => {
  it("pin the collection names the migration indexes", () => {
    for (const [model, collection] of Object.entries(MODELS)) {
      expect(mongoose.models[model]!.collection.name).toBe(collection);
    }
    expect([...CASE_STUDY_AND_VIDEO_COLLECTIONS].sort()).toEqual(
      Object.values(MODELS).sort()
    );
  });

  it("declare no index the migration does not own", () => {
    for (const [model, collection] of Object.entries(MODELS)) {
      const owned = CASE_STUDY_AND_VIDEO_INDEX_TARGETS.filter(
        (target) => target.collection === collection
      );
      for (const [key, options] of mongoose.models[model]!.schema.indexes()) {
        const match = owned.find((target) => target.options.name === options?.name);
        expect(match, `${model} index ${String(options?.name)}`).toBeDefined();
        expect(match!.key).toEqual(key);
        expect(Boolean(match!.options.unique)).toBe(Boolean(options?.unique));
        expect(match!.options.partialFilterExpression ?? null).toEqual(
          options?.partialFilterExpression ?? null
        );
      }
    }
  });

  it("require unique active slugs and names", () => {
    const unique = CASE_STUDY_AND_VIDEO_INDEX_TARGETS.filter((t) => t.options.unique);
    expect(unique.map((t) => t.options.name).sort()).toEqual([
      "unique_case_study_category_name_active",
      "unique_case_study_category_slug_active",
      "unique_case_study_slug_active",
      "unique_video_category_name_active",
      "unique_video_category_slug_active",
      "unique_video_slug_active",
    ]);
    for (const target of unique) {
      expect(target.options.partialFilterExpression).toMatchObject({ is_deleted: false });
    }
  });

  it("does not treat a same-name index with different semantics as ready", () => {
    const target = CASE_STUDY_AND_VIDEO_INDEX_TARGETS[0]!;
    const index = { v: 2, name: target.options.name, key: target.key as never };
    expect(isCaseStudyAndVideoIndexReady(index, target)).toBe(false);
    expect(
      isCaseStudyAndVideoIndexReady(
        {
          ...index,
          unique: true,
          partialFilterExpression: target.options.partialFilterExpression,
        },
        target
      )
    ).toBe(true);
  });

  it("is registered last and after every earlier foundation", () => {
    const ids = MIGRATION_REGISTRY.map(({ id }) => id);
    expect(ids.at(-1)).toBe("202610080001-case-study-and-video-foundation");
    expect(ids.at(-2)).toBe("202607170001-auth-mfa-foundation");
  });

  it("validate the Video source rules at the model", async () => {
    const Video = mongoose.models.Video!;
    const base = {
      name: "Clip",
      category: new mongoose.Types.ObjectId(),
      author: new mongoose.Types.ObjectId(),
    };
    await expect(
      new Video({ ...base, source_type: "youtube", youtube_id: "dQw4w9WgXcQ" }).validate()
    ).resolves.toBeUndefined();
    await expect(new Video({ ...base, source_type: "youtube" }).validate()).rejects.toBeDefined();
    await expect(new Video({ ...base, source_type: "upload" }).validate()).rejects.toBeDefined();
    await expect(
      new Video({
        ...base,
        source_type: "upload",
        video_file: new mongoose.Types.ObjectId(),
        youtube_id: "dQw4w9WgXcQ",
      }).validate()
    ).rejects.toBeDefined();
    await expect(
      new Video({ ...base, source_type: "youtube", youtube_id: "dQw4w9WgXcQ", aspect_ratio: "square" }).validate()
    ).rejects.toBeDefined();
  });
});
