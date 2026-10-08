import type * as CaseStudyCategoryServiceType from "@/app/api/case-study-categories/case-study-category.service";
import type * as CaseStudyServiceType from "@/app/api/case-studies/case-study.service";
import type CaseStudyModel from "@/app/api/case-studies/case-study.model";
import type FileModel from "@/app/api/files/file.model";
import type { validatePageGraph as validatePageGraphFunction } from "@/app/api/pages/page.graph";
import type UserModel from "@/app/api/users/user.model";
import type * as VideoCategoryServiceType from "@/app/api/video-categories/video-category.service";
import type * as VideoServiceType from "@/app/api/videos/video.service";
import type VideoModel from "@/app/api/videos/video.model";
import { ENV } from "@/config";
import mongoose from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  assertReplicaSetTestDatabaseUrl,
  assertSafeTestDatabaseName,
  assertSafeTestDatabaseUrl,
} from "../helpers/test-database";

const TEST_MONGODB_URI = process.env.TEST_MONGODB_URI?.trim();
const SUITE_NAME = TEST_MONGODB_URI
  ? "case study and video libraries against real transaction-capable MongoDB"
  : "case study and video libraries (skipped: set TEST_MONGODB_URI)";

if (!TEST_MONGODB_URI) {
  console.warn(
    "[integration] Skipping case study and video coverage: set TEST_MONGODB_URI to an isolated replica-set test database."
  );
}

const RUN = Date.now().toString(36);
const YT = (suffix: string) => `https://youtu.be/${`vid${suffix}`.padEnd(11, "x").slice(0, 11)}`;

describe.skipIf(!TEST_MONGODB_URI)(SUITE_NAME, () => {
  let VideoService: typeof VideoServiceType;
  let CaseStudyService: typeof CaseStudyServiceType;
  let VideoCategoryService: typeof VideoCategoryServiceType;
  let CaseStudyCategoryService: typeof CaseStudyCategoryServiceType;
  let File: typeof FileModel;
  let User: typeof UserModel;
  let Video: typeof VideoModel;
  let CaseStudy: typeof CaseStudyModel;
  let validatePageGraph: typeof validatePageGraphFunction;

  let actor: { _id: string; role: "super-admin" };
  let videoCategory: string;
  let caseStudyCategory: string;
  const createdFiles: string[] = [];

  beforeAll(async () => {
    const databaseUri = assertReplicaSetTestDatabaseUrl(
      assertSafeTestDatabaseUrl(TEST_MONGODB_URI as string)
    );
    ENV.database_url = databaseUri;
    process.env.DATABASE_URL = databaseUri;
    const connectDB = (await import("@/lib/db")).default;
    await connectDB();
    assertSafeTestDatabaseName(mongoose.connection.name);

    VideoService = await import("@/app/api/videos/video.service");
    CaseStudyService = await import("@/app/api/case-studies/case-study.service");
    VideoCategoryService = await import("@/app/api/video-categories/video-category.service");
    CaseStudyCategoryService = await import("@/app/api/case-study-categories/case-study-category.service");
    File = (await import("@/app/api/files/file.model")).default;
    User = (await import("@/app/api/users/user.model")).default;
    Video = (await import("@/app/api/videos/video.model")).default;
    CaseStudy = (await import("@/app/api/case-studies/case-study.model")).default;
    validatePageGraph = (await import("@/app/api/pages/page.graph")).validatePageGraph;
    await Promise.all([Video.syncIndexes(), CaseStudy.syncIndexes()]);

    const user = await User.create({
      name: `Library ${RUN}`.slice(0, 50),
      email: `library-${RUN}@example.test`,
      password: "TestPassword123!",
      role: "admin",
    });
    actor = { _id: user._id.toString(), role: "super-admin" };
    videoCategory = String(
      (
        await VideoCategoryService.createVideoCategory({
          name: `Videos ${RUN}`.slice(0, 50),
          slug: `videos-${RUN}`,
          sequence: 1,
        })
      )?._id
    );
    caseStudyCategory = String(
      (
        await CaseStudyCategoryService.createCaseStudyCategory({
          name: `Studies ${RUN}`.slice(0, 50),
          slug: `studies-${RUN}`,
          sequence: 1,
        })
      )?._id
    );
  });

  afterAll(async () => {
    if (!mongoose.connection.readyState) return;
    await Promise.all([
      Video.deleteMany({ author: actor._id }),
      CaseStudy.deleteMany({ author: actor._id }),
      File.deleteMany({ _id: { $in: createdFiles } }),
      mongoose.connection.collection("video_categories").deleteMany({ slug: `videos-${RUN}` }),
      mongoose.connection.collection("case_study_categories").deleteMany({ slug: `studies-${RUN}` }),
      User.deleteMany({ _id: actor._id }),
    ]);
    await mongoose.disconnect();
  });

  const video = (name: string, extra: Record<string, unknown> = {}) =>
    VideoService.createVideo(
      {
        name: `${name} ${RUN}`,
        category: videoCategory,
        author: actor._id,
        source_type: "youtube",
        youtube_url: YT(name.slice(0, 4)),
        status: "published",
        ...extra,
      } as never,
      actor as never
    ) as Promise<{ _id: unknown; slug: string }>;

  it("publishes YouTube videos and separates the two shapes", async () => {
    const reel = await video("reel-one", { aspect_ratio: "reel", youtube_url: `https://www.youtube.com/shorts/aaaaaaaaaaa` });
    const wide = await video("wide-one", { aspect_ratio: "landscape" });
    const draft = await video("draft-one", { status: "draft" });

    const onlyReels = await VideoService.getPublicVideoDiscovery({ aspect_ratio: "reel", category: `videos-${RUN}` });
    const reelSlugs = onlyReels.data.map((item) => String(item.slug));
    expect(reelSlugs).toContain(reel.slug);
    expect(reelSlugs).not.toContain(wide.slug);
    expect(reelSlugs).not.toContain(draft.slug);
    expect(onlyReels.data.every((item) => item.aspect_ratio === "reel")).toBe(true);

    const detail = await VideoService.getPublicVideoByIdentifier(reel.slug);
    expect(detail).toMatchObject({ youtube_id: "aaaaaaaaaaa", source_type: "youtube" });
    expect(detail).not.toHaveProperty("status");
    await expect(VideoService.getPublicVideoByIdentifier(draft.slug)).rejects.toMatchObject({ status: 404 });
    expect(
      (await VideoService.getPublicVideoDiscovery({ category: "no-such-category" })).data
    ).toHaveLength(0);
  });

  it("normalises YouTube links and rejects unusable sources", async () => {
    const created = (await video("canon", { youtube_url: "https://m.youtube.com/watch?v=bbbbbbbbbbb&t=9s" })) as { _id: unknown };
    const stored = await Video.findById(created._id).lean();
    expect(stored).toMatchObject({
      youtube_url: "https://www.youtube.com/watch?v=bbbbbbbbbbb",
      youtube_id: "bbbbbbbbbbb",
    });
    await expect(video("bad", { youtube_url: "https://vimeo.com/1" })).rejects.toMatchObject({ status: 400 });
    await expect(
      VideoService.updateVideoById(String(created._id), { source_type: "upload" }, actor as never)
    ).rejects.toMatchObject({ status: 400 });
  });

  it("attaches an uploaded file, derives its duration and releases it on switch", async () => {
    const file = await File.create({
      filename: `v1/video_file/${RUN}/clip.mp4`,
      originalname: "clip.mp4",
      name: "clip",
      url: `https://res.cloudinary.com/test-cloud/video/upload/${RUN}/clip.mp4`,
      mimetype: "video/mp4",
      size: 1801,
      author: actor._id,
      provider: "cloudinary",
      status: "active",
      lifecycle_state: "ready",
      purpose: "video_file",
      access: "public",
      source: "uploaded",
      checksum: "a".repeat(64),
      storage_version: 1,
      attribution: { license: "owned" },
      metadata: { file_type: "video", duration: 7.4, width: 360, height: 640, cloud_name: "test-cloud", format: "mp4" },
    });
    createdFiles.push(file._id.toString());

    const created = await video("upload", { source_type: "upload", youtube_url: undefined, video_file: file._id.toString() });
    expect((await Video.findById(created._id).lean())?.duration_seconds).toBe(7);
    expect((await File.findById(file._id).lean())?.references).toEqual([
      expect.objectContaining({ model: "Video", field: "video_file", entity: expect.anything() }),
    ]);
    const detail = await VideoService.getPublicVideoByIdentifier(created.slug);
    expect(detail).toMatchObject({ source_type: "upload", video_file: { url: expect.stringContaining("/video/upload/") } });

    // A thumbnail-purpose file cannot stand in for the video file.
    await expect(
      video("wrong-purpose", {
        source_type: "upload",
        youtube_url: undefined,
        video_file: (await File.create({
          filename: `v1/video/${RUN}/p.webp`, originalname: "p.webp", name: "p", url: `https://res.cloudinary.com/test-cloud/image/upload/${RUN}/p.webp`,
          mimetype: "image/webp", size: 10, author: actor._id, provider: "cloudinary", status: "active", lifecycle_state: "ready",
          purpose: "video", access: "public", source: "uploaded", checksum: "b".repeat(64), storage_version: 1,
        }).then((doc) => { createdFiles.push(doc._id.toString()); return doc._id.toString(); })),
      })
    ).rejects.toMatchObject({ status: 400 });

    await VideoService.updateVideoById(String(created._id), { source_type: "youtube", youtube_url: YT("swit") }, actor as never);
    const after = await Video.findById(created._id).lean();
    expect(after).toMatchObject({ source_type: "youtube", video_file: null });
    expect((await File.findById(file._id).lean())?.references).toEqual([]);
  });

  it("keeps old links working after a slug change and honours soft delete", async () => {
    const created = await video("slugs");
    const oldSlug = created.slug;
    await VideoService.updateVideoById(String(created._id), { slug: `renamed-${RUN}` }, actor as never);
    expect((await VideoService.getPublicVideoByIdentifier(oldSlug)).slug).toBe(`renamed-${RUN}`);

    await VideoService.deleteVideoById(String(created._id));
    await expect(VideoService.getPublicVideoByIdentifier(`renamed-${RUN}`)).rejects.toMatchObject({ status: 404 });
    await VideoService.restoreVideoById(String(created._id));
    expect((await VideoService.getPublicVideoByIdentifier(`renamed-${RUN}`)).slug).toBe(`renamed-${RUN}`);
  });

  it("requires a complete story before a case study is published and keeps private data private", async () => {
    await expect(
      CaseStudyService.createCaseStudy(
        { name: `Thin ${RUN}`, category: caseStudyCategory, author: actor._id, status: "published" },
        actor as never
      )
    ).rejects.toMatchObject({ status: 400, message: expect.stringContaining("complete:") });

    const created = (await CaseStudyService.createCaseStudy(
      {
        name: `Story ${RUN}`,
        category: caseStudyCategory,
        author: actor._id,
        status: "published",
        description: "Summary",
        primary_pillar: "software_developer",
        engagement_type: "client",
        client_name: "Acme Ltd",
        challenge: "Problem",
        approach: "Approach",
        solution: "Solution",
        results_summary: "Result",
        live_url: "https://example.com",
        source_url: "https://github.com/x/y",
        source_url_visibility: "public",
        outcomes: [
          { label: "A", value: "1", verification_state: "derived" },
          { label: "B", value: "2", verification_state: "unverified" },
        ],
        content: "<p>Body</p><script>alert(1)</script>",
      },
      actor as never
    )) as unknown as { slug: string };

    const detail = await CaseStudyService.getPublicCaseStudyByIdentifier(created.slug);
    expect(detail).not.toHaveProperty("client_name");
    expect(detail).not.toHaveProperty("live_url");
    expect(detail).toHaveProperty("source_url", "https://github.com/x/y");
    expect((detail.outcomes as { label: string }[]).map((o) => o.label)).toEqual(["A"]);
    expect(String(detail.content)).not.toContain("<script");
    expect(String(detail.content)).toContain("<p>Body</p>");

    const listed = await CaseStudyService.getPublicCaseStudyDiscovery({ category: `studies-${RUN}`, pillar: "software_developer" });
    expect(listed.data.map((item) => item.slug)).toContain(created.slug);
    expect((await CaseStudyService.getPublicCaseStudyDiscovery({ category: `studies-${RUN}`, pillar: "ai_automation" })).data).toHaveLength(0);
    expect((await CaseStudyService.getPublicCaseStudyDiscoveryFacets()).technologies).toEqual(expect.any(Array));
  });

  it("hides content whose category was deactivated", async () => {
    const created = await video("hidden-by-category");
    await VideoCategoryService.updateVideoCategoryById(videoCategory, { status: "inactive" });
    await expect(VideoService.getPublicVideoByIdentifier(created.slug)).rejects.toMatchObject({ status: 404 });
    await expect(video("no-active-category")).rejects.toMatchObject({ status: 400 });
    await VideoCategoryService.updateVideoCategoryById(videoCategory, { status: "active" });
    expect((await VideoService.getPublicVideoByIdentifier(created.slug)).slug).toBe(created.slug);
  });

  it("validates a Page graph that lists each shape and refuses an empty one", async () => {
    await video("graph-reel", { aspect_ratio: "reel" });
    const section = (shape: string) => ({
      key: `videos-${shape}`,
      kind: "video-collection" as const,
      visible: true,
      layout: "grid",
      item_limit: 3,
      source: { mode: "automatic" as const, filter: { aspect_ratio: shape } },
    });
    await expect(
      validatePageGraph({
        route_key: "home",
        snapshot: { seo: { noindex: false }, sections: [section("reel")] } as never,
        mode: "publish",
      })
    ).resolves.toBeDefined();
    await Video.updateMany({ author: actor._id, aspect_ratio: "reel" }, { $set: { status: "draft" } });
    await expect(
      validatePageGraph({
        route_key: "home",
        snapshot: { seo: { noindex: false }, sections: [section("reel")] } as never,
        mode: "publish",
      })
    ).rejects.toMatchObject({ code: "PAGE_PUBLISH_GRAPH_INVALID" });
  });
});
