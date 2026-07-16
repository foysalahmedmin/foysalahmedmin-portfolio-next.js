import type { TRole } from "@/types/jsonwebtoken.type";

export const CAPABILITIES = [
  "admin:access",
  "dashboard:read",
  "site:read",
  "site:edit",
  "site:publish",
  "content:read",
  "content:read-own",
  "content:edit",
  "content:publish",
  "content:edit-own",
  "content:submit-own",
  "content:permanent-delete",
  "media:manage",
  "media:upload-own",
  "media:permanent-delete",
  "inbox:manage",
  "inbox:retention-manage",
  "inbox:permanent-delete",
  "users:manage",
  "users:permanent-delete",
  "audit:read",
  "sessions:manage",
  "infrastructure:manage",
] as const;

export type Capability = (typeof CAPABILITIES)[number];

const ROLE_CAPABILITIES = {
  "super-admin": CAPABILITIES,
  admin: [
    "admin:access",
    "dashboard:read",
    "site:read",
    "site:edit",
    "site:publish",
    "content:read",
    "content:edit",
    "content:publish",
    "media:manage",
    "inbox:manage",
    "users:manage",
    "audit:read",
  ],
  editor: [
    "admin:access",
    "site:read",
    "site:edit",
    "content:read",
    "content:edit",
    "content:publish",
    "media:manage",
  ],
  author: [
    "admin:access",
    "content:read-own",
    "content:edit-own",
    "content:submit-own",
    "media:upload-own",
  ],
  contributor: [
    "admin:access",
    "content:read-own",
    "content:edit-own",
    "content:submit-own",
    "media:upload-own",
  ],
  subscriber: [],
  user: [],
} as const satisfies Record<TRole, readonly Capability[]>;

export const getCapabilitiesForRole = (role: TRole): readonly Capability[] =>
  ROLE_CAPABILITIES[role];

export const hasCapability = (
  role: TRole | string | null | undefined,
  capability: Capability
): boolean =>
  typeof role === "string" &&
  role in ROLE_CAPABILITIES &&
  (ROLE_CAPABILITIES[role as TRole] as readonly Capability[]).includes(
    capability
  );

export type AdminMutationRule = Readonly<{
  resource:
    | "article-categories"
    | "articles"
    | "contacts"
    | "dashboard"
    | "credentials"
    | "faqs"
    | "files"
    | "legal-documents"
    | "pages"
    | "project-categories"
    | "project-resources"
    | "projects"
    | "reviews"
    | "services"
    | "site"
    | "skill-groups"
    | "skills"
    | "testimonials"
    | "timeline"
    | "users";
  ordinary: Capability;
  permanent: Capability;
}>;

/**
 * This is the backend authority for every current admin API mutation.
 * Route components may hide unavailable actions, but this matrix is what the
 * request middleware enforces using the user's current database role.
 */
export const ADMIN_MUTATION_MATRIX: readonly AdminMutationRule[] = [
  {
    resource: "article-categories",
    ordinary: "content:edit",
    permanent: "content:permanent-delete",
  },
  {
    resource: "articles",
    ordinary: "content:edit",
    permanent: "content:permanent-delete",
  },
  {
    resource: "contacts",
    ordinary: "inbox:manage",
    permanent: "inbox:permanent-delete",
  },
  {
    resource: "dashboard",
    ordinary: "dashboard:read",
    permanent: "dashboard:read",
  },
  {
    resource: "credentials",
    ordinary: "content:edit",
    permanent: "content:permanent-delete",
  },
  {
    resource: "faqs",
    ordinary: "content:edit",
    permanent: "content:permanent-delete",
  },
  {
    resource: "files",
    ordinary: "media:manage",
    permanent: "media:permanent-delete",
  },
  {
    resource: "legal-documents",
    ordinary: "content:edit",
    permanent: "content:permanent-delete",
  },
  {
    resource: "pages",
    ordinary: "site:edit",
    permanent: "site:publish",
  },
  {
    resource: "project-categories",
    ordinary: "content:edit",
    permanent: "content:permanent-delete",
  },
  {
    resource: "project-resources",
    ordinary: "content:edit",
    permanent: "content:permanent-delete",
  },
  {
    resource: "projects",
    ordinary: "content:edit",
    permanent: "content:permanent-delete",
  },
  {
    resource: "reviews",
    ordinary: "inbox:manage",
    permanent: "inbox:permanent-delete",
  },
  {
    resource: "services",
    ordinary: "content:edit",
    permanent: "content:permanent-delete",
  },
  {
    resource: "site",
    ordinary: "site:edit",
    permanent: "site:publish",
  },
  {
    resource: "skill-groups",
    ordinary: "content:edit",
    permanent: "content:permanent-delete",
  },
  {
    resource: "skills",
    ordinary: "content:edit",
    permanent: "content:permanent-delete",
  },
  {
    resource: "testimonials",
    ordinary: "content:edit",
    permanent: "content:permanent-delete",
  },
  {
    resource: "timeline",
    ordinary: "content:edit",
    permanent: "content:permanent-delete",
  },
  {
    resource: "users",
    ordinary: "users:manage",
    permanent: "users:permanent-delete",
  },
] as const;

const ruleByResource = new Map<string, AdminMutationRule>(
  ADMIN_MUTATION_MATRIX.map((rule) => [rule.resource, rule])
);

export type AdminApiAuthority =
  | { kind: "not-admin-api" }
  | { kind: "unmapped-admin-api" }
  | { kind: "capability"; capability: Capability };

const getApiResource = (pathname: string): string | null => {
  const match = pathname.match(/^\/api\/([^/]+)(?:\/|$)/);
  return match?.[1] ?? null;
};

export const getAdminApiAuthority = (
  pathname: string,
  method: string
): AdminApiAuthority => {
  if (!pathname.startsWith("/api/") || !pathname.split("/").includes("admin")) {
    return { kind: "not-admin-api" };
  }

  const resource = getApiResource(pathname);
  const rule = resource ? ruleByResource.get(resource) : undefined;
  if (!rule) return { kind: "unmapped-admin-api" };

  if (pathname === "/api/files/admin/reconcile") {
    return { kind: "capability", capability: "infrastructure:manage" };
  }

  if (rule.resource === "dashboard") {
    return method.toUpperCase() === "GET"
      ? { kind: "capability", capability: "dashboard:read" }
      : { kind: "unmapped-admin-api" };
  }

  if (
    rule.resource === "contacts" &&
    pathname.split("/").includes("retention-hold")
  ) {
    return { kind: "capability", capability: "inbox:retention-manage" };
  }

  if (
    rule.resource === "contacts" &&
    pathname.split("/").includes("anonymize")
  ) {
    return { kind: "capability", capability: "inbox:permanent-delete" };
  }

  if (rule.resource === "site") {
    if (method.toUpperCase() === "GET") {
      return { kind: "capability", capability: "site:read" };
    }
    return {
      kind: "capability",
      capability:
        pathname === "/api/site/admin/publish" ? "site:publish" : "site:edit",
    };
  }

  if (rule.resource === "pages") {
    if (method.toUpperCase() === "GET") {
      return { kind: "capability", capability: "site:read" };
    }
    if (pathname.endsWith("/admin/preview-session")) {
      return { kind: "capability", capability: "site:read" };
    }
    return {
      kind: "capability",
      capability:
        pathname.endsWith("/admin/publish") ||
        pathname.split("/").includes("permanent")
          ? "site:publish"
          : "site:edit",
    };
  }

  if (method.toUpperCase() === "GET") {
    if (["contacts", "reviews"].includes(rule.resource)) {
      return { kind: "capability", capability: "inbox:manage" };
    }
    if (rule.resource === "users") {
      return { kind: "capability", capability: "users:manage" };
    }
    if (rule.resource === "files") {
      return { kind: "capability", capability: "media:manage" };
    }
    return { kind: "capability", capability: "content:read" };
  }

  return {
    kind: "capability",
    capability: pathname.split("/").includes("permanent")
      ? rule.permanent
      : rule.ordinary,
  };
};

export const getAdminPageCapability = (pathname: string): Capability | null => {
  if (pathname === "/admin/signin" || pathname.startsWith("/admin/signin/")) {
    return null;
  }
  if (
    pathname === "/admin/articles" ||
    pathname.startsWith("/admin/articles/") ||
    pathname === "/admin/projects" ||
    pathname.startsWith("/admin/projects/") ||
    pathname === "/admin/project-resources" ||
    pathname.startsWith("/admin/project-resources/") ||
    pathname === "/admin/taxonomy" ||
    pathname.startsWith("/admin/taxonomy/")
  ) {
    return "content:read";
  }
  if (
    pathname === "/admin/design-system" ||
    pathname === "/admin/site" ||
    pathname.startsWith("/admin/site/") ||
    pathname === "/admin/pages" ||
    pathname.startsWith("/admin/pages/")
  ) {
    return "site:read";
  }
  if (pathname === "/admin/media" || pathname.startsWith("/admin/media/")) {
    return "media:manage";
  }
  if (
    pathname === "/admin/contacts" ||
    pathname.startsWith("/admin/contacts/") ||
    pathname === "/admin/reviews" ||
    pathname.startsWith("/admin/reviews/")
  ) {
    return "inbox:manage";
  }
  if (pathname === "/admin/audit" || pathname.startsWith("/admin/audit/")) {
    return "audit:read";
  }
  if (pathname === "/admin/users" || pathname.startsWith("/admin/users/")) {
    return "users:manage";
  }
  return pathname === "/admin" || pathname.startsWith("/admin/")
    ? "admin:access"
    : null;
};
