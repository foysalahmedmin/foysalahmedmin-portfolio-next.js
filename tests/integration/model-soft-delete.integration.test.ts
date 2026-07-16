import AppQuery from "@/builder/app-query";
import ArticleCategory from "@/app/api/article-categories/article-category.model";
import Article from "@/app/api/articles/article.model";
import Contact from "@/app/api/contacts/contact.model";
import File from "@/app/api/files/file.model";
import ProjectCategory from "@/app/api/project-categories/project-category.model";
import ProjectResource from "@/app/api/project-resources/project-resource.model";
import Project from "@/app/api/projects/project.model";
import { Review } from "@/app/api/reviews/review.model";
import User from "@/app/api/users/user.model";
import { setSoftDeleteScope, type SoftDeleteScope } from "@/lib/db/soft-delete";
import mongoose, { type Document, type Model, type Types } from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  assertReplicaSetTestDatabaseUrl,
  assertSafeTestDatabaseName,
  assertSafeTestDatabaseUrl,
} from "../helpers/test-database";

const TEST_MONGODB_URI = process.env.TEST_MONGODB_URI?.trim();
const SUITE_NAME = TEST_MONGODB_URI
  ? "application model soft-delete lifecycles against real MongoDB"
  : "application model soft-delete lifecycles against real MongoDB (skipped: set TEST_MONGODB_URI)";

if (!TEST_MONGODB_URI) {
  console.warn(
    "[integration] Skipping application model lifecycle coverage: set TEST_MONGODB_URI to an isolated replica-set test database."
  );
}

type LifecycleDocument = Document & { _id: Types.ObjectId };

type LifecycleCase = {
  name: string;
  create: (token: string) => Promise<LifecycleDocument>;
  findAll: (scope: SoftDeleteScope) => Promise<LifecycleDocument[]>;
  softDelete: (id: Types.ObjectId) => Promise<LifecycleDocument | null>;
  restore: (id: Types.ObjectId) => Promise<LifecycleDocument | null>;
  hardDelete: (id: Types.ObjectId) => Promise<number>;
  removeAll: () => Promise<void>;
  syncIndexes: () => Promise<void>;
};

const defineLifecycleCase = <T extends LifecycleDocument>(
  name: string,
  model: Model<T>,
  create: (token: string) => Promise<T>
): LifecycleCase => ({
  name,
  create,
  findAll: async (scope) =>
    setSoftDeleteScope(
      model.find({}).select("+is_deleted +deleted_at").sort({ _id: 1 }),
      scope
    ),
  softDelete: async (id) =>
    setSoftDeleteScope(
      model
        .findByIdAndUpdate(
          id,
          { $set: { is_deleted: true, deleted_at: new Date() } },
          { new: true, runValidators: true }
        )
        .select("+is_deleted +deleted_at"),
      "active"
    ),
  restore: async (id) =>
    setSoftDeleteScope(
      model
        .findByIdAndUpdate(
          id,
          { $set: { is_deleted: false }, $unset: { deleted_at: 1 } },
          { new: true, runValidators: true }
        )
        .select("+is_deleted +deleted_at"),
      "only_deleted"
    ),
  hardDelete: async (id) => {
    const result = await setSoftDeleteScope(
      model.deleteOne({ _id: id }),
      "only_deleted"
    );
    return result.deletedCount;
  },
  removeAll: async () => {
    await setSoftDeleteScope(model.deleteMany({}), "with_deleted");
  },
  syncIndexes: async () => {
    await model.syncIndexes();
  },
});

const RUN_ID = Date.now().toString(36);
let fixtureSequence = 0;

const nextToken = (label: string): string => {
  fixtureSequence += 1;
  return `${RUN_ID}-${fixtureSequence}-${label}`;
};

const boundedFixtureLabel = (
  prefix: string,
  token: string,
  maximum = 50
): string => {
  const available = Math.max(1, maximum - prefix.length - 1);
  return `${prefix} ${token.slice(-available)}`;
};

const createUser = async (token: string) =>
  User.create({
    name: `Lifecycle ${token}`.slice(0, 50),
    email: `${token}@example.test`,
    password: "TestPassword123!",
    role: "user",
  });

const createArticleCategory = async (token: string) =>
  ArticleCategory.create({
    name: boundedFixtureLabel("Article", token),
    slug: `article-${token}`.slice(-96),
    sequence: 1,
  });

const createProjectCategory = async (token: string) =>
  ProjectCategory.create({
    name: boundedFixtureLabel("Project", token),
    slug: `project-${token}`.slice(-96),
    sequence: 1,
  });

const createProject = async (token: string) => {
  const [author, category] = await Promise.all([
    createUser(`project-author-${token}`),
    createProjectCategory(`project-category-${token}`),
  ]);

  return Project.create({
    name: `Lifecycle project ${token}`,
    content: `Lifecycle project content ${token}`,
    category: category._id,
    author: author._id,
  });
};

const LIFECYCLE_CASES: LifecycleCase[] = [
  defineLifecycleCase(
    "ArticleCategory",
    ArticleCategory,
    createArticleCategory
  ),
  defineLifecycleCase(
    "ProjectCategory",
    ProjectCategory,
    createProjectCategory
  ),
  defineLifecycleCase("Article", Article, async (token) => {
    const [author, category] = await Promise.all([
      createUser(`article-author-${token}`),
      createArticleCategory(`article-category-${token}`),
    ]);

    return Article.create({
      name: `Lifecycle article ${token}`,
      content: `Lifecycle article content ${token}`,
      category: category._id,
      author: author._id,
    });
  }),
  defineLifecycleCase("Project", Project, createProject),
  defineLifecycleCase("ProjectResource", ProjectResource, async (token) => {
    const project = await createProject(`resource-project-${token}`);

    return ProjectResource.create({
      project: project._id,
      sequence: 1,
      title: `Lifecycle resource ${token}`,
      url: `https://example.test/resources/${token}`,
    });
  }),
  defineLifecycleCase("Review", Review, async (token) => {
    const project = await createProject(`review-project-${token}`);
    const author = await createUser(`review-author-${token}`);

    return Review.create({
      author: author._id,
      target_model: "Project",
      target: project._id,
      rating: 5,
      review: `Lifecycle review ${token}`,
    });
  }),
  defineLifecycleCase("Contact", Contact, async (token) =>
    Contact.create({
      name: `Lifecycle contact ${token}`,
      email: `contact-${token}@example.test`,
      subject: `Lifecycle subject ${token}`,
      message: `Lifecycle message body for ${token}`,
    })
  ),
  defineLifecycleCase("User", User, createUser),
  defineLifecycleCase("File", File, async (token) => {
    const author = await createUser(`file-author-${token}`);

    return File.create({
      filename: `${token}.png`,
      originalname: `${token}.png`,
      name: `Lifecycle file ${token}`,
      url: `https://example.test/files/${token}.png`,
      mimetype: "image/png",
      size: 128,
      author: author._id,
      provider: "cloudinary",
    });
  }),
];

const removeAllApplicationFixtures = async (): Promise<void> => {
  assertSafeTestDatabaseName(mongoose.connection.name);

  for (const lifecycle of [...LIFECYCLE_CASES].reverse()) {
    await lifecycle.removeAll();
  }
};

const idsOf = (documents: LifecycleDocument[]): string[] =>
  documents.map((document) => document._id.toString()).sort();

describe.skipIf(!TEST_MONGODB_URI)(SUITE_NAME, () => {
  beforeAll(async () => {
    const databaseUri = assertReplicaSetTestDatabaseUrl(
      assertSafeTestDatabaseUrl(TEST_MONGODB_URI as string)
    );

    await mongoose.connect(databaseUri, { serverSelectionTimeoutMS: 10_000 });
    assertSafeTestDatabaseName(mongoose.connection.name);

    await removeAllApplicationFixtures();
    for (const lifecycle of LIFECYCLE_CASES) {
      await lifecycle.syncIndexes();
    }

    const hello = (await mongoose.connection.db
      ?.admin()
      .command({ hello: 1 })) as
      | { logicalSessionTimeoutMinutes?: number; setName?: string }
      | undefined;

    expect(hello?.setName).toBeTruthy();
    expect(hello?.logicalSessionTimeoutMinutes).toBeTypeOf("number");

    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      await Contact.create(
        [
          {
            name: "Transaction probe",
            email: "application-model-transaction-probe@example.test",
            subject: "Transaction probe",
            message: "This transaction must be aborted.",
          },
        ],
        { session }
      );
      await session.abortTransaction();
    } finally {
      await session.endSession();
    }
  }, 60_000);

  beforeEach(async () => {
    fixtureSequence = 0;
    await removeAllApplicationFixtures();
  });

  afterAll(async () => {
    if (mongoose.connection.readyState === 0) return;

    await removeAllApplicationFixtures();
    await mongoose.disconnect();
  }, 30_000);

  it.each(LIFECYCLE_CASES)(
    "$name defaults to active reads and safely completes the trash lifecycle",
    async (lifecycle) => {
      const active = await lifecycle.create(nextToken("active"));
      const trash = await lifecycle.create(nextToken("trash"));

      const deleted = await lifecycle.softDelete(trash._id);
      expect(deleted?.get("is_deleted")).toBe(true);
      expect(deleted?.get("deleted_at")).toBeInstanceOf(Date);

      const activeRead = await lifecycle.findAll("active");
      const trashRead = await lifecycle.findAll("only_deleted");
      const fullRead = await lifecycle.findAll("with_deleted");

      expect(idsOf(activeRead)).toEqual([active._id.toString()]);
      expect(idsOf(trashRead)).toEqual([trash._id.toString()]);
      expect(idsOf(fullRead)).toEqual(
        [active._id.toString(), trash._id.toString()].sort()
      );

      const restored = await lifecycle.restore(trash._id);
      expect(restored?.get("is_deleted")).toBe(false);
      expect(restored?.get("deleted_at") ?? null).toBeNull();
      await expect(lifecycle.restore(trash._id)).resolves.toBeNull();
      expect(idsOf(await lifecycle.findAll("active"))).toEqual(
        [active._id.toString(), trash._id.toString()].sort()
      );

      await lifecycle.softDelete(trash._id);

      await expect(lifecycle.hardDelete(active._id)).resolves.toBe(0);
      await expect(lifecycle.hardDelete(trash._id)).resolves.toBe(1);
      expect(idsOf(await lifecycle.findAll("with_deleted"))).toEqual([
        active._id.toString(),
      ]);
    }
  );

  it("keeps actual populate and virtual dependency reads inside the active scope", async () => {
    const author = await createUser(nextToken("populate-author"));
    const category = await createArticleCategory(
      nextToken("populate-article-category")
    );
    const article = await Article.create({
      name: "Populate visibility article",
      content: "Populate visibility article content",
      category: category._id,
      author: author._id,
    });

    await setSoftDeleteScope(
      User.findByIdAndUpdate(author._id, {
        $set: { is_deleted: true, deleted_at: new Date() },
      }),
      "active"
    );

    const populatedArticle = await Article.findById(article._id).populate(
      "author"
    );
    expect(populatedArticle?.get("author")).toBeNull();

    const project = await createProject(nextToken("populate-project"));
    const [visibleResource, deletedResource] = await ProjectResource.create([
      {
        project: project._id,
        sequence: 1,
        title: "Visible resource",
        url: "https://example.test/resources/visible",
      },
      {
        project: project._id,
        sequence: 2,
        title: "Deleted resource",
        url: "https://example.test/resources/deleted",
      },
    ]);

    await setSoftDeleteScope(
      ProjectResource.findByIdAndUpdate(deletedResource._id, {
        $set: { is_deleted: true, deleted_at: new Date() },
      }),
      "active"
    );

    const populatedProject = await Project.findById(project._id).populate(
      "resources"
    );
    const resources = populatedProject?.get("resources") as
      | LifecycleDocument[]
      | undefined;
    expect(idsOf(resources ?? [])).toEqual([visibleResource._id.toString()]);

    await setSoftDeleteScope(
      Project.findByIdAndUpdate(project._id, {
        $set: { is_deleted: true, deleted_at: new Date() },
      }),
      "active"
    );

    const resourceWithParent = await ProjectResource.findById(
      visibleResource._id
    ).populate("project");
    expect(resourceWithParent?.get("project")).toBeNull();
  });

  it("retains an actual category in trash when restore collides with active unique indexes", async () => {
    const original = await ArticleCategory.create({
      name: "Restore collision category",
      slug: "restore-collision-category",
      sequence: 1,
    });

    await setSoftDeleteScope(
      ArticleCategory.findByIdAndUpdate(original._id, {
        $set: { is_deleted: true, deleted_at: new Date() },
      }),
      "active"
    );

    await ArticleCategory.create({
      name: "Restore collision category",
      slug: "restore-collision-category",
      sequence: 2,
    });

    const restore = setSoftDeleteScope(
      ArticleCategory.findByIdAndUpdate(
        original._id,
        { $set: { is_deleted: false }, $unset: { deleted_at: 1 } },
        { new: true, runValidators: true }
      ),
      "only_deleted"
    );

    await expect(restore).rejects.toMatchObject({ code: 11_000 });

    const stillDeleted = await setSoftDeleteScope(
      ArticleCategory.findById(original._id).select("+is_deleted +deleted_at"),
      "only_deleted"
    );
    expect(stillDeleted?.is_deleted).toBe(true);
    expect(stillDeleted?.deleted_at).toBeInstanceOf(Date);
    await expect(ArticleCategory.countDocuments()).resolves.toBe(1);
  });

  it("keeps AppQuery base, search, filter, data, and total contracts aligned", async () => {
    const matching = await Contact.create({
      name: "Needle included",
      email: "selected@example.test",
      subject: "Portfolio scope",
      message: "This matching contact belongs in the result.",
    });
    await Contact.create([
      {
        name: "Needle wrong base",
        email: "selected@example.test",
        subject: "Outside scope",
        message: "This contact must fail the immutable base filter.",
      },
      {
        name: "No search match",
        email: "selected@example.test",
        subject: "Portfolio scope",
        message: "This contact must fail the search filter.",
      },
      {
        name: "Needle wrong field filter",
        email: "different@example.test",
        subject: "Portfolio scope",
        message: "This contact must fail the explicit field filter.",
      },
    ]);
    const deletedMatch = await Contact.create({
      name: "Needle deleted",
      email: "selected@example.test",
      subject: "Portfolio scope",
      message: "This matching contact is in trash.",
    });
    await setSoftDeleteScope(
      Contact.findByIdAndUpdate(deletedMatch._id, {
        $set: { is_deleted: true, deleted_at: new Date() },
      }),
      "active"
    );

    const baseFilter = {
      $or: [
        { subject: "Portfolio scope" },
        { subject: "Alternate portfolio scope" },
      ],
    };
    const queryParams = {
      search: "Needle",
      email: "selected@example.test",
      sort: "name",
      page: "1",
      limit: "10",
      fields: "name,email,subject",
    };

    const activeResult = await new AppQuery(
      Contact.find(baseFilter),
      queryParams
    )
      .search(["name", "message"])
      .filter(["email"])
      .sort(["name"])
      .paginate()
      .fields(["name", "email", "subject"])
      .execute();

    expect(activeResult.meta).toMatchObject({ total: 1, page: 1, limit: 10 });
    expect(activeResult.data).toHaveLength(1);
    expect(String(activeResult.data[0]?._id)).toBe(matching._id.toString());
    expect(baseFilter).toEqual({
      $or: [
        { subject: "Portfolio scope" },
        { subject: "Alternate portfolio scope" },
      ],
    });

    const deletedResult = await new AppQuery(
      setSoftDeleteScope(Contact.find(baseFilter), "only_deleted"),
      { ...queryParams, deleted_scope: "only_deleted" }
    )
      .search(["name", "message"])
      .filter(["email"])
      .sort(["name"])
      .paginate()
      .fields(["name", "email", "subject"])
      .execute();

    expect(deletedResult.meta.total).toBe(1);
    expect(deletedResult.data).toHaveLength(1);
    expect(String(deletedResult.data[0]?._id)).toBe(
      deletedMatch._id.toString()
    );
  });
});
