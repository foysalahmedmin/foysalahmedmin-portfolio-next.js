import {
  mergeTaxonomyAdminQuery,
  parseTaxonomyAdminQuery,
} from "@/hooks/ui/use-taxonomy-admin-query-state";
import {
  buildTaxonomyPayload,
  getSafeTaxonomyParents,
  validateTaxonomyDraft,
  type TAdminTaxonomyCategory,
} from "@/lib/admin/taxonomy-admin";
import {
  getAdminTaxonomyCategories,
  getAdminTaxonomyParentCandidates,
  updateAdminTaxonomyCategory,
} from "@/services/taxonomy-admin.service";
import { afterEach, describe, expect, it, vi } from "vitest";

const category = (
  id: string,
  name: string,
  parentId: string | null = null
): TAdminTaxonomyCategory => ({
  id,
  name,
  slug: name.toLowerCase().replaceAll(" ", "-"),
  sequence: 1,
  description: "",
  status: "active",
  tags: [],
  parentId,
  isDeleted: false,
});

describe("taxonomy admin contracts", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("round-trips bounded remote table state and preserves unrelated params", () => {
    const state = parseTaxonomyAdminQuery(
      "?type=project&search=api&sort=-name&page=3&limit=20&status=inactive&deleted_scope=only_deleted"
    );

    expect(state).toEqual({
      kind: "project",
      search: "api",
      sort: "-name",
      page: 3,
      limit: 20,
      status: "inactive",
      deletedScope: "only_deleted",
    });
    expect(mergeTaxonomyAdminQuery("?utm_source=admin", state)).toBe(
      "?utm_source=admin&type=project&search=api&sort=-name&page=3&limit=20&status=inactive&deleted_scope=only_deleted"
    );
  });

  it("removes the current category and every descendant from parent choices", () => {
    const root = category("507f1f77bcf86cd799439001", "Root");
    const current = category("507f1f77bcf86cd799439002", "Current", root.id);
    const child = category("507f1f77bcf86cd799439003", "Child", current.id);
    const grandchild = category(
      "507f1f77bcf86cd799439004",
      "Grandchild",
      child.id
    );
    const sibling = category("507f1f77bcf86cd799439005", "Sibling", root.id);

    expect(
      getSafeTaxonomyParents(
        [root, current, child, grandchild, sibling],
        current.id
      ).map(({ id }) => id)
    ).toEqual([root.id, sibling.id]);
  });

  it("requires explicit canonical identity and a safe active parent", () => {
    const parent = category("507f1f77bcf86cd799439001", "Parent");
    const invalid = {
      name: "A",
      slug: "Invalid Slug",
      sequence: "0",
      description: "",
      status: "active" as const,
      parentId: "507f1f77bcf86cd799439099",
      tags: "",
    };
    expect(validateTaxonomyDraft(invalid, [parent])).toMatchObject({
      name: expect.any(String),
      slug: expect.any(String),
      sequence: expect.any(String),
      parentId: expect.any(String),
    });

    const valid = {
      ...invalid,
      name: "Architecture",
      slug: "architecture",
      sequence: "2",
      parentId: parent.id,
      tags: "systems, backend, systems",
    };
    expect(validateTaxonomyDraft(valid, [parent])).toEqual({});
    expect(buildTaxonomyPayload(valid)).toEqual({
      name: "Architecture",
      slug: "architecture",
      sequence: 2,
      description: "",
      status: "active",
      parent: parent.id,
      tags: ["systems", "backend"],
    });
  });

  it("traverses inactive hierarchy nodes while offering only active parents", () => {
    const current = category("507f1f77bcf86cd799439001", "Current");
    const inactiveChild = {
      ...category("507f1f77bcf86cd799439002", "Inactive child", current.id),
      status: "inactive" as const,
    };
    const activeGrandchild = category(
      "507f1f77bcf86cd799439003",
      "Active grandchild",
      inactiveChild.id
    );
    const safeRoot = category("507f1f77bcf86cd799439004", "Safe root");

    expect(
      getSafeTaxonomyParents(
        [current, inactiveChild, activeGrandchild, safeRoot],
        current.id
      ).map(({ id }) => id)
    ).toEqual([safeRoot.id]);
  });

  it("loads inactive nodes for complete parent-cycle detection", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          status: 200,
          data: [
            {
              _id: "507f1f77bcf86cd799439002",
              name: "Inactive bridge",
              slug: "inactive-bridge",
              sequence: 2,
              status: "inactive",
              tags: [],
            },
          ],
          meta: { page: 1, limit: 100, total: 1 },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const candidates = await getAdminTaxonomyParentCandidates("article");

    expect(candidates).toHaveLength(1);
    const requestUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(requestUrl).not.toContain("status=");
    expect(requestUrl).toContain("limit=100");
  });

  it("uses existing ID routes and never invents an optimistic version field", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            status: 200,
            data: [
              {
                _id: "507f1f77bcf86cd799439011",
                name: "Systems",
                slug: "systems",
                sequence: 1,
                status: "inactive",
                tags: [],
              },
            ],
            meta: { page: 2, limit: 20, total: 21 },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, status: 200, data: {} }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );
    vi.stubGlobal("fetch", fetchMock);

    const list = await getAdminTaxonomyCategories("project", {
      page: 2,
      limit: 20,
      search: "systems",
      sort: "-name",
      status: "inactive",
      deletedScope: "only_deleted",
    });
    expect(list.data[0]).toMatchObject({
      id: "507f1f77bcf86cd799439011",
      isDeleted: true,
    });
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain(
      "/api/project-categories/admin?"
    );
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain(
      "deleted_scope=only_deleted"
    );

    await updateAdminTaxonomyCategory("project", "507f1f77bcf86cd799439011", {
      name: "Systems",
      slug: "systems",
      sequence: 1,
      status: "inactive",
      parent: null,
      tags: [],
    });
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      "/api/project-categories/507f1f77bcf86cd799439011/admin"
    );
    const request = fetchMock.mock.calls[1]?.[1] as RequestInit;
    expect(request.method).toBe("PATCH");
    expect(JSON.parse(String(request.body))).not.toHaveProperty(
      "expected_version"
    );
  });
});
