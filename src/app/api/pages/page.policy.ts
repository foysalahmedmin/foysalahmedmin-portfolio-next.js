import type {
  TPageDraftSnapshot,
  TPageRouteKey,
  TPageSection,
} from "./page.type";

export class PageDomainError extends Error {
  readonly status: number;
  readonly code: string;
  readonly sources: string[];
  readonly current_revision?: number;

  constructor(input: {
    status: number;
    code: string;
    message: string;
    sources?: string[];
    current_revision?: number;
  }) {
    super(input.message);
    this.name = "PageDomainError";
    this.status = input.status;
    this.code = input.code;
    this.sources = [
      ...new Set(
        (input.sources ?? [])
          .map((source) => source.trim())
          .filter(
            (source) =>
              source.length <= 120 &&
              /^[a-z][a-z0-9_-]*(?:\.(?:[a-z][a-z0-9_-]*|\d+))*$/.test(source)
          )
      ),
    ].slice(0, 100);
    this.current_revision = input.current_revision;
  }
}

const REQUIRED_VISIBLE_SECTION: Partial<
  Record<TPageRouteKey, TPageSection["kind"]>
> = {
  home: "site-hero",
  contact: "contact-form",
  privacy: "legal-document",
  terms: "legal-document",
};

export const getPagePublishStructureIssues = (
  routeKey: TPageRouteKey,
  draft: TPageDraftSnapshot
): string[] => {
  const issues: string[] = [];
  if (!draft.sections.some((section) => section.visible)) {
    issues.push("sections.visible");
  }
  const required = REQUIRED_VISIBLE_SECTION[routeKey];
  if (
    required &&
    !draft.sections.some(
      (section) => section.kind === required && section.visible
    )
  ) {
    issues.push("sections.required");
  }
  if (
    (routeKey === "privacy" || routeKey === "terms") &&
    draft.sections.filter((section) => section.visible).length !== 1
  ) {
    issues.push("sections.legal_count");
  }
  return issues;
};

export const assertPagePublishStructure = (
  routeKey: TPageRouteKey,
  draft: TPageDraftSnapshot
): void => {
  const sources = getPagePublishStructureIssues(routeKey, draft);
  if (sources.length) {
    throw new PageDomainError({
      status: 422,
      code: "PAGE_PUBLISH_STRUCTURE_INVALID",
      message: "The Page layout is incomplete for its fixed route.",
      sources,
    });
  }
};

export const reorderPageSections = (
  draft: TPageDraftSnapshot,
  orderedKeys: readonly string[]
): TPageDraftSnapshot => {
  const currentKeys = draft.sections.map((section) => section.key);
  if (
    currentKeys.length !== orderedKeys.length ||
    currentKeys.some((key) => !orderedKeys.includes(key))
  ) {
    throw new PageDomainError({
      status: 422,
      code: "PAGE_REORDER_INVALID",
      message: "Reordering must include every current section exactly once.",
      sources: ["ordered_section_keys"],
    });
  }
  const byKey = new Map(
    draft.sections.map((section) => [section.key, section])
  );
  return {
    ...draft,
    sections: orderedKeys.map((key) => byKey.get(key)!),
  };
};

export const changedPageFields = (
  previous: TPageDraftSnapshot,
  next: TPageDraftSnapshot
): string[] => {
  const changed: string[] = [];
  if (JSON.stringify(previous.seo) !== JSON.stringify(next.seo)) {
    changed.push("draft.seo");
  }
  if (JSON.stringify(previous.sections) !== JSON.stringify(next.sections)) {
    changed.push("draft.sections");
  }
  return changed;
};
