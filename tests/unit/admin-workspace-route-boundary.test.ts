import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const sessionMocks = vi.hoisted(() => ({
  role: "admin" as
    | "super-admin"
    | "admin"
    | "editor"
    | "author"
    | "contributor"
    | "subscriber"
    | "user",
  verifyAccessSessionToken: vi.fn(),
  revokeUserSessions: vi.fn(),
  deleteUserSessions: vi.fn(),
}));

const databaseMocks = vi.hoisted(() => ({
  connectDB: vi.fn(),
  startSession: vi.fn(),
  withTransaction: vi.fn(),
  endSession: vi.fn(),
}));

const contactRepositoryMocks = vi.hoisted(() => ({
  findInboxPage: vi.fn(),
  findOperationalRecords: vi.fn(),
  findById: vi.fn(),
  transitionStatus: vi.fn(),
  findDeletedById: vi.fn(),
  hardDeleteById: vi.fn(),
}));

const projectResourceRepositoryMocks = vi.hoisted(() => ({
  findPaginated: vi.fn(),
  isProjectActive: vi.fn(),
  create: vi.fn(),
  findDeletedById: vi.fn(),
  findNotRestorableIds: vi.fn(),
  restoreById: vi.fn(),
  hardDeleteById: vi.fn(),
}));

const reviewRepositoryMocks = vi.hoisted(() => ({
  findPaginated: vi.fn(),
  updateById: vi.fn(),
  findDeletedById: vi.fn(),
  findNotRestorableIds: vi.fn(),
  restoreById: vi.fn(),
  hardDeleteById: vi.fn(),
}));

const userRepositoryMocks = vi.hoisted(() => ({
  findPaginated: vi.fn(),
  findById: vi.fn(),
  updateById: vi.fn(),
  findDeletedById: vi.fn(),
  findNotRestorableIds: vi.fn(),
  restoreById: vi.fn(),
  hardDeleteById: vi.fn(),
}));

const auditRepositoryMocks = vi.hoisted(() => ({
  findBounded: vi.fn(),
}));

const articleCategoryRepositoryMocks = vi.hoisted(() => ({
  findPaginated: vi.fn(),
  findById: vi.fn(),
  findParentHierarchyNodeById: vi.fn(),
  findDeletedById: vi.fn(),
  findPermanentDeleteDependencyIds: vi.fn(),
  hardDeleteById: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: vi.fn(() => undefined) })),
}));

vi.mock("@/lib/auth/session-manager", () => ({
  verifyAccessSessionToken: sessionMocks.verifyAccessSessionToken,
  revokeUserSessions: sessionMocks.revokeUserSessions,
  deleteUserSessions: sessionMocks.deleteUserSessions,
}));

vi.mock("@/lib/db", () => ({ default: databaseMocks.connectDB }));
vi.mock("@/app/api/contacts/contact.repository", () => contactRepositoryMocks);
vi.mock(
  "@/app/api/project-resources/project-resource.repository",
  () => projectResourceRepositoryMocks
);
vi.mock("@/app/api/reviews/review.repository", () => reviewRepositoryMocks);
vi.mock("@/app/api/users/user.repository", () => userRepositoryMocks);
vi.mock(
  "@/app/api/audit-events/audit-event.repository",
  () => auditRepositoryMocks
);
vi.mock(
  "@/app/api/article-categories/article-category.repository",
  () => articleCategoryRepositoryMocks
);

import { GET as getContacts } from "@/app/api/contacts/admin/route";
import { PATCH as updateContact } from "@/app/api/contacts/[id]/admin/route";
import { DELETE as permanentlyDeleteContact } from "@/app/api/contacts/[id]/admin/permanent/route";
import {
  GET as getProjectResources,
  POST as createProjectResource,
} from "@/app/api/project-resources/admin/route";
import { POST as restoreProjectResource } from "@/app/api/project-resources/[id]/admin/restore/route";
import { DELETE as permanentlyDeleteProjectResource } from "@/app/api/project-resources/[id]/admin/permanent/route";
import { GET as getReviews } from "@/app/api/reviews/admin/route";
import { PATCH as moderateReview } from "@/app/api/reviews/[id]/admin/route";
import { POST as restoreReview } from "@/app/api/reviews/[id]/admin/restore/route";
import { DELETE as permanentlyDeleteReview } from "@/app/api/reviews/[id]/admin/permanent/route";
import { toAdminReviewProjection } from "@/app/api/reviews/review.service";
import { GET as getUsers } from "@/app/api/users/admin/route";
import { PATCH as updateUser } from "@/app/api/users/[id]/admin/route";
import { POST as restoreUser } from "@/app/api/users/[id]/admin/restore/route";
import { DELETE as permanentlyDeleteUser } from "@/app/api/users/[id]/admin/permanent/route";
import { GET as getAuditEvents } from "@/app/api/audit-events/route";
import { GET as getArticleCategories } from "@/app/api/article-categories/admin/route";
import { PATCH as updateArticleCategory } from "@/app/api/article-categories/[id]/admin/route";
import { DELETE as permanentlyDeleteArticleCategory } from "@/app/api/article-categories/[id]/admin/permanent/route";

const BASE_URL = "http://localhost:3000";
const IDS = {
  actor: "507f1f77bcf86cd799439011",
  target: "507f1f77bcf86cd799439012",
  parent: "507f1f77bcf86cd799439013",
  project: "507f1f77bcf86cd799439014",
  author: "507f1f77bcf86cd799439015",
} as const;

type Role = typeof sessionMocks.role;

const request = (
  path: string,
  options: {
    role?: Role;
    method?: string;
    body?: Record<string, unknown>;
  } = {}
) => {
  sessionMocks.role = options.role ?? "admin";
  const method = options.method ?? "GET";
  const headers = new Headers({
    authorization: "Bearer route-boundary-token",
  });
  if (method !== "GET") {
    headers.set("origin", BASE_URL);
    headers.set("sec-fetch-site", "same-origin");
  }
  if (options.body !== undefined) {
    headers.set("content-type", "application/json");
  }
  return new NextRequest(`${BASE_URL}${path}`, {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
};

const context = (id: string = IDS.target) => ({
  params: Promise.resolve({ id }),
});

const contactRecord = () => ({
  _id: IDS.target,
  name: "Private Contact",
  email: "private.contact@example.test",
  subject: "Architecture review",
  message: "This message is available only from the detail endpoint.",
  status: "new" as const,
  delivery_status: "delivered" as const,
  revision: 7,
  retention_expires_at: new Date("2027-07-16T00:00:00.000Z"),
  anonymized_at: null,
  created_at: new Date("2026-07-16T00:00:00.000Z"),
  updated_at: new Date("2026-07-16T01:00:00.000Z"),
});

const categoryRecord = () => ({
  _id: IDS.target,
  name: "System design",
  slug: "system-design",
  sequence: 1,
  description: "Architecture and platform categories.",
  status: "active" as const,
  tags: ["architecture"],
  parent: null,
  is_deleted: false,
  created_at: new Date("2026-07-16T00:00:00.000Z"),
  updated_at: new Date("2026-07-16T01:00:00.000Z"),
});

beforeEach(() => {
  sessionMocks.role = "admin";
  sessionMocks.verifyAccessSessionToken.mockImplementation(async () => ({
    _id: IDS.actor,
    name: "Route Boundary Operator",
    email: "operator@example.test",
    role: sessionMocks.role,
    is_verified: true,
    session_id: "550e8400-e29b-41d4-a716-446655440000",
  }));
  sessionMocks.revokeUserSessions.mockResolvedValue(undefined);
  sessionMocks.deleteUserSessions.mockResolvedValue(undefined);

  databaseMocks.connectDB.mockResolvedValue({
    startSession: databaseMocks.startSession,
  });
  databaseMocks.startSession.mockResolvedValue({
    withTransaction: databaseMocks.withTransaction,
    endSession: databaseMocks.endSession,
  });
  databaseMocks.withTransaction.mockImplementation(
    async (operation: () => Promise<void>) => operation()
  );
  databaseMocks.endSession.mockResolvedValue(undefined);
});

describe("real admin route capability boundaries", () => {
  const deniedReads = [
    {
      label: "contact inbox",
      path: "/api/contacts/admin",
      role: "editor" as const,
      handler: getContacts,
    },
    {
      label: "review moderation",
      path: "/api/reviews/admin",
      role: "editor" as const,
      handler: getReviews,
    },
    {
      label: "user management",
      path: "/api/users/admin",
      role: "editor" as const,
      handler: getUsers,
    },
    {
      label: "audit log",
      path: "/api/audit-events",
      role: "editor" as const,
      handler: getAuditEvents,
    },
    {
      label: "project resources",
      path: "/api/project-resources/admin",
      role: "author" as const,
      handler: getProjectResources,
    },
    {
      label: "taxonomy",
      path: "/api/article-categories/admin",
      role: "author" as const,
      handler: getArticleCategories,
    },
  ];

  it.each(deniedReads)(
    "denies $label without its required capability before data access",
    async ({ path, role, handler }) => {
      const response = await handler(request(path, { role }));

      expect(response.status).toBe(403);
      expect(await response.json()).toMatchObject({
        success: false,
        message: "Access denied.",
      });
      expect(databaseMocks.connectDB).not.toHaveBeenCalled();
    }
  );

  const permanentDeletes = [
    {
      label: "contact",
      path: `/api/contacts/${IDS.target}/admin/permanent`,
      handler: (req: NextRequest) => permanentlyDeleteContact(req, context()),
    },
    {
      label: "review",
      path: `/api/reviews/${IDS.target}/admin/permanent`,
      handler: (req: NextRequest) => permanentlyDeleteReview(req, context()),
    },
    {
      label: "user",
      path: `/api/users/${IDS.target}/admin/permanent`,
      handler: (req: NextRequest) => permanentlyDeleteUser(req, context()),
    },
    {
      label: "project resource",
      path: `/api/project-resources/${IDS.target}/admin/permanent`,
      handler: (req: NextRequest) =>
        permanentlyDeleteProjectResource(req, context()),
    },
    {
      label: "taxonomy",
      path: `/api/article-categories/${IDS.target}/admin/permanent`,
      handler: (req: NextRequest) =>
        permanentlyDeleteArticleCategory(req, context()),
    },
  ];

  it.each(permanentDeletes)(
    "keeps $label permanent deletion outside ordinary admin authority",
    async ({ path, handler }) => {
      const response = await handler(request(path, { method: "DELETE" }));

      expect(response.status).toBe(403);
      expect(databaseMocks.connectDB).not.toHaveBeenCalled();
    }
  );
});

describe("contact inbox route and data boundaries", () => {
  it("redacts list PII while retaining bounded operational fields", async () => {
    const contact = contactRecord();
    contactRepositoryMocks.findInboxPage.mockResolvedValue({
      contacts: [contact],
      total: 1,
    });
    contactRepositoryMocks.findOperationalRecords.mockResolvedValue(new Map());

    const response = await getContacts(
      request("/api/contacts/admin?status=new&limit=25")
    );
    const payload = await response.json();
    const serialized = JSON.stringify(payload.data[0]);

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(payload.data[0]).toMatchObject({
      id: IDS.target,
      name: contact.name,
      subject: contact.subject,
      status: "new",
      revision: 7,
    });
    expect(payload.data[0].email_masked).toMatch(/@example\.test$/);
    expect(serialized).not.toContain(contact.email);
    expect(serialized).not.toContain(contact.message);
  });

  it("rejects an invalid status transition before persistence", async () => {
    const contact = contactRecord();
    contactRepositoryMocks.findById.mockResolvedValue({
      ...contact,
      toObject: () => contact,
    });

    const response = await updateContact(
      request(`/api/contacts/${IDS.target}/admin`, {
        method: "PATCH",
        body: { status: "replied", expected_revision: 7 },
      }),
      context()
    );

    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({
      success: false,
      message: "Contact cannot transition from new to replied",
    });
    expect(contactRepositoryMocks.transitionStatus).not.toHaveBeenCalled();
  });
});

describe("project-resource route and lifecycle boundaries", () => {
  it("reads the bounded admin resource shape", async () => {
    projectResourceRepositoryMocks.findPaginated.mockResolvedValue({
      data: [
        {
          _id: IDS.target,
          project: { _id: IDS.project, name: "Platform" },
          sequence: 1,
          type: "documentation",
          title: "Architecture notes",
          url: "https://github.com/example/platform",
          description: "Approved project documentation.",
          is_private: true,
          is_deleted: false,
        },
      ],
      meta: { page: 1, limit: 20, total: 1 },
    });

    const response = await getProjectResources(
      request("/api/project-resources/admin?page=1&limit=20")
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data[0]).toEqual(
      expect.objectContaining({
        _id: IDS.target,
        is_private: true,
        project: { _id: IDS.project, name: "Platform" },
      })
    );
  });

  it("defaults new resources to private at the route-service boundary", async () => {
    projectResourceRepositoryMocks.isProjectActive.mockResolvedValue(true);
    projectResourceRepositoryMocks.create.mockImplementation(async (input) => ({
      _id: IDS.target,
      ...(input as Record<string, unknown>),
    }));

    const response = await createProjectResource(
      request("/api/project-resources/admin", {
        method: "POST",
        body: {
          project: IDS.project,
          sequence: 1,
          title: "Source repository",
          url: "https://github.com/example/platform",
          type: "repository",
        },
      })
    );

    expect(response.status).toBe(201);
    expect(projectResourceRepositoryMocks.create).toHaveBeenCalledWith(
      expect.objectContaining({ is_private: true })
    );
    expect((await response.json()).data).toMatchObject({ is_private: true });
  });

  it("blocks restore while the owning project is inactive", async () => {
    projectResourceRepositoryMocks.findDeletedById.mockResolvedValue({
      _id: IDS.target,
      project: IDS.project,
    });
    projectResourceRepositoryMocks.findNotRestorableIds.mockResolvedValue([
      IDS.target,
    ]);

    const response = await restoreProjectResource(
      request(`/api/project-resources/${IDS.target}/admin/restore`, {
        role: "editor",
        method: "POST",
      }),
      context()
    );

    expect(response.status).toBe(409);
    expect(projectResourceRepositoryMocks.restoreById).not.toHaveBeenCalled();
  });
});

describe("review moderation route and lifecycle boundaries", () => {
  it("fails closed instead of coercing a malformed moderation record", () => {
    expect(() =>
      toAdminReviewProjection({
        _id: IDS.target,
        author: { _id: IDS.author, name: "Ada Lovelace" },
        target: { _id: IDS.project, name: "Platform" },
        target_model: "Unknown",
        rating: 7,
        review: "Corrupt record",
        status: "invented",
      })
    ).toThrow("Review response could not be projected safely");
  });

  it("allowlists author and target relations in the API response", async () => {
    reviewRepositoryMocks.findPaginated.mockResolvedValue({
      data: [
        {
          _id: IDS.target,
          author: {
            _id: IDS.author,
            name: "Ada Lovelace",
            email: "private.author@example.test",
            image: { url: "https://private.example.test/profile.png" },
            password: "must-not-cross-the-route",
          },
          target: {
            _id: IDS.project,
            name: "Platform",
            publication_status: "draft",
          },
          target_model: "Project",
          rating: 5,
          review: "Clear architecture boundaries.",
          status: "pending",
          is_edited: false,
        },
      ],
      meta: { page: 1, limit: 25, total: 1 },
    });

    const response = await getReviews(request("/api/reviews/admin"));
    const payload = await response.json();
    const review = payload.data[0];

    expect(response.status).toBe(200);
    expect(review.author).toEqual({
      id: IDS.author,
      name: "Ada Lovelace",
    });
    expect(review.target).toEqual({ id: IDS.project, name: "Platform" });
    expect(JSON.stringify(review)).not.toContain("private.author@example.test");
    expect(review.author).not.toHaveProperty("email");
    expect(review.author).not.toHaveProperty("image");
    expect(review.target).not.toHaveProperty("publication_status");
  });

  it("passes only the validated moderation status to persistence", async () => {
    reviewRepositoryMocks.updateById.mockResolvedValue({
      populate: vi.fn().mockResolvedValue({
        _id: IDS.target,
        author: { id: IDS.author, name: "Ada Lovelace" },
        target: { id: IDS.project, name: "Platform" },
        target_model: "Project",
        rating: 5,
        review: "Clear architecture boundaries.",
        status: "approved",
      }),
    });

    const response = await moderateReview(
      request(`/api/reviews/${IDS.target}/admin`, {
        method: "PATCH",
        body: {
          status: "approved",
          review: "Attempted content rewrite",
          author: IDS.actor,
        },
      }),
      context()
    );

    expect(response.status).toBe(200);
    expect(reviewRepositoryMocks.updateById).toHaveBeenCalledWith(IDS.target, {
      status: "approved",
    });
  });

  it("blocks restore when author, target, or active identity is invalid", async () => {
    reviewRepositoryMocks.findDeletedById.mockResolvedValue({
      _id: IDS.target,
      author: IDS.author,
      target: IDS.project,
      target_model: "Project",
    });
    reviewRepositoryMocks.findNotRestorableIds.mockResolvedValue([IDS.target]);

    const response = await restoreReview(
      request(`/api/reviews/${IDS.target}/admin/restore`, {
        method: "POST",
      }),
      context()
    );

    expect(response.status).toBe(409);
    expect(reviewRepositoryMocks.restoreById).not.toHaveBeenCalled();
  });
});

describe("user-management route and lifecycle boundaries", () => {
  it("returns only the administrative user allowlist", async () => {
    userRepositoryMocks.findPaginated.mockResolvedValue({
      data: [
        {
          _id: IDS.target,
          name: "Content Editor",
          email: "editor@example.test",
          role: "editor",
          status: "in-progress",
          is_verified: true,
          is_deleted: false,
          deleted_at: null,
          created_at: new Date("2026-07-15T00:00:00.000Z"),
          updated_at: new Date("2026-07-16T00:00:00.000Z"),
        },
      ],
      meta: { page: 1, limit: 20, total: 1 },
    });

    const response = await getUsers(request("/api/users/admin"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(Object.keys(payload.data[0]).sort()).toEqual(
      [
        "_id",
        "created_at",
        "deleted_at",
        "email",
        "is_deleted",
        "is_verified",
        "name",
        "role",
        "status",
        "updated_at",
      ].sort()
    );
    expect(JSON.stringify(payload.data[0])).not.toContain("password");
    expect(JSON.stringify(payload.data[0])).not.toContain("session_hash");
  });

  it("rejects a sensitive self-update before persistence", async () => {
    userRepositoryMocks.findById.mockResolvedValue({
      _id: IDS.actor,
      role: "admin",
      status: "in-progress",
      email: "operator@example.test",
      image: null,
    });

    const response = await updateUser(
      request(`/api/users/${IDS.actor}/admin`, {
        method: "PATCH",
        body: { status: "blocked" },
      }),
      context(IDS.actor)
    );

    expect(response.status).toBe(403);
    expect(userRepositoryMocks.updateById).not.toHaveBeenCalled();
  });

  it("blocks restore when the deleted email is already active", async () => {
    userRepositoryMocks.findDeletedById.mockResolvedValue({
      _id: IDS.target,
      name: "Deleted editor",
      email: "editor@example.test",
      role: "editor",
      status: "blocked",
    });
    userRepositoryMocks.findNotRestorableIds.mockResolvedValue([IDS.target]);

    const response = await restoreUser(
      request(`/api/users/${IDS.target}/admin/restore`, { method: "POST" }),
      context()
    );

    expect(response.status).toBe(409);
    expect(userRepositoryMocks.restoreById).not.toHaveBeenCalled();
  });
});

describe("audit route and data boundaries", () => {
  it("projects privacy-safe events and omits session identifiers", async () => {
    auditRepositoryMocks.findBounded.mockResolvedValue({
      events: [
        {
          event_id: "550e8400-e29b-41d4-a716-446655440000",
          schema_version: 1,
          action: "content.updated",
          actor_type: "user",
          actor_id: IDS.actor,
          actor_role: "admin",
          session_hash: "a".repeat(64),
          target_type: "article",
          target_id: IDS.target,
          target_revision: 4,
          outcome: "success",
          source: "admin",
          summary_code: "content_updated",
          changed_fields: ["title"],
          metadata: {
            previous_state: "draft",
            next_state: "review",
            raw_email: "private@example.test",
          },
          correlation_hash: "b".repeat(64),
          created_at: new Date("2026-07-16T00:00:00.000Z"),
          retain_until: new Date("2027-07-16T00:00:00.000Z"),
        },
      ],
      total: 1,
    });

    const response = await getAuditEvents(
      request("/api/audit-events?action=content.updated")
    );
    const payload = await response.json();
    const serialized = JSON.stringify(payload.data[0]);

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(payload.data[0]).toMatchObject({
      actor: { type: "user", id: IDS.actor, role: "admin" },
      target: { type: "article", id: IDS.target, revision: 4 },
      metadata: { previous_state: "draft", next_state: "review" },
    });
    expect(serialized).not.toContain("session_hash");
    expect(serialized).not.toContain("private@example.test");
  });

  it("rejects a query window over 90 days before repository access", async () => {
    const response = await getAuditEvents(
      request(
        "/api/audit-events?from=2026-01-01T00%3A00%3A00.000Z&to=2026-04-02T00%3A00%3A00.000Z"
      )
    );

    expect(response.status).toBe(400);
    expect(auditRepositoryMocks.findBounded).not.toHaveBeenCalled();
  });
});

describe("taxonomy route, hierarchy, and lifecycle boundaries", () => {
  it("reads the bounded category contract through the protected route", async () => {
    articleCategoryRepositoryMocks.findPaginated.mockResolvedValue({
      data: [categoryRecord()],
      meta: { page: 1, limit: 20, total: 1 },
    });

    const response = await getArticleCategories(
      request("/api/article-categories/admin?page=1&limit=20")
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data[0]).toMatchObject({
      _id: IDS.target,
      name: "System design",
      slug: "system-design",
      status: "active",
      parent: null,
    });
  });

  it("rejects self-parenting through the real PATCH boundary", async () => {
    const category = {
      ...categoryRecord(),
      slug_history: [],
      save: vi.fn(),
    };
    articleCategoryRepositoryMocks.findById.mockResolvedValue(category);

    const response = await updateArticleCategory(
      request(`/api/article-categories/${IDS.target}/admin`, {
        role: "editor",
        method: "PATCH",
        body: { parent: IDS.target },
      }),
      context()
    );

    expect(response.status).toBe(409);
    expect(category.save).not.toHaveBeenCalled();
    expect(
      articleCategoryRepositoryMocks.findParentHierarchyNodeById
    ).not.toHaveBeenCalled();
  });

  it("blocks permanent deletion while content dependencies remain", async () => {
    articleCategoryRepositoryMocks.findDeletedById.mockResolvedValue({
      ...categoryRecord(),
      is_deleted: true,
    });
    articleCategoryRepositoryMocks.findPermanentDeleteDependencyIds.mockResolvedValue(
      [IDS.target]
    );

    const response = await permanentlyDeleteArticleCategory(
      request(`/api/article-categories/${IDS.target}/admin/permanent`, {
        role: "super-admin",
        method: "DELETE",
      }),
      context()
    );

    expect(response.status).toBe(409);
    expect(
      articleCategoryRepositoryMocks.hardDeleteById
    ).not.toHaveBeenCalled();
  });
});
