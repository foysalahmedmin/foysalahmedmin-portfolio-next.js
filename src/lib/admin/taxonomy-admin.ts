import {
  CONTENT_SLUG_PATTERN,
  MAX_CONTENT_SLUG_LENGTH,
} from "@/lib/content/slug";

export const TAXONOMY_KINDS = ["article", "project"] as const;
export type TTaxonomyKind = (typeof TAXONOMY_KINDS)[number];
export type TTaxonomyStatus = "active" | "inactive";

export type TAdminTaxonomyCategory = Readonly<{
  id: string;
  name: string;
  slug: string;
  sequence: number;
  description: string;
  status: TTaxonomyStatus;
  tags: readonly string[];
  parentId: string | null;
  parentName?: string;
  isDeleted: boolean;
  createdAt?: string;
  updatedAt?: string;
}>;

export type TTaxonomyDraft = Readonly<{
  name: string;
  slug: string;
  sequence: string;
  description: string;
  status: TTaxonomyStatus;
  parentId: string;
  tags: string;
}>;

export type TTaxonomyDraftErrors = Readonly<
  Partial<Record<keyof TTaxonomyDraft, string>>
>;

export type TTaxonomyPayload = Readonly<{
  name: string;
  slug: string;
  sequence: number;
  description?: string;
  status: TTaxonomyStatus;
  parent: string | null;
  tags: string[];
}>;

export const TAXONOMY_CONTRACT = {
  article: {
    label: "Article categories",
    singular: "article category",
    resource: "article-categories",
  },
  project: {
    label: "Project categories",
    singular: "project category",
    resource: "project-categories",
  },
} as const satisfies Record<
  TTaxonomyKind,
  Readonly<{ label: string; singular: string; resource: string }>
>;

export const emptyTaxonomyDraft = (): TTaxonomyDraft => ({
  name: "",
  slug: "",
  sequence: "1",
  description: "",
  status: "active",
  parentId: "",
  tags: "",
});

export const taxonomyCategoryToDraft = (
  category: TAdminTaxonomyCategory
): TTaxonomyDraft => ({
  name: category.name,
  slug: category.slug,
  sequence: String(category.sequence),
  description: category.description,
  status: category.status,
  parentId: category.parentId ?? "",
  tags: category.tags.join(", "),
});

export const getSafeTaxonomyParents = (
  candidates: readonly TAdminTaxonomyCategory[],
  currentId?: string
): TAdminTaxonomyCategory[] => {
  const excludedIds = new Set(currentId ? [currentId] : []);

  if (currentId) {
    let changed = true;
    while (changed) {
      changed = false;
      for (const candidate of candidates) {
        if (
          candidate.parentId &&
          excludedIds.has(candidate.parentId) &&
          !excludedIds.has(candidate.id)
        ) {
          excludedIds.add(candidate.id);
          changed = true;
        }
      }
    }
  }

  return candidates
    .filter(
      (candidate) =>
        !candidate.isDeleted &&
        candidate.status === "active" &&
        !excludedIds.has(candidate.id)
    )
    .sort(
      (left, right) =>
        left.sequence - right.sequence || left.name.localeCompare(right.name)
    );
};

const parseTags = (value: string): string[] =>
  Array.from(
    new Set(
      value
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
    )
  );

export const validateTaxonomyDraft = (
  draft: TTaxonomyDraft,
  safeParents: readonly TAdminTaxonomyCategory[]
): TTaxonomyDraftErrors => {
  const errors: Partial<Record<keyof TTaxonomyDraft, string>> = {};
  const name = draft.name.trim();
  const slug = draft.slug.trim();
  const sequence = Number(draft.sequence);

  if (name.length < 2 || name.length > 50) {
    errors.name = "Use a name between 2 and 50 characters.";
  }
  if (
    !slug ||
    slug.length > MAX_CONTENT_SLUG_LENGTH ||
    !CONTENT_SLUG_PATTERN.test(slug)
  ) {
    errors.slug = `Use a canonical lowercase slug of at most ${MAX_CONTENT_SLUG_LENGTH} characters.`;
  }
  if (!Number.isSafeInteger(sequence) || sequence < 1 || sequence > 100) {
    errors.sequence = "Use a whole display order from 1 to 100.";
  }
  if (draft.description.length > 500) {
    errors.description = "Use 500 characters or fewer.";
  }
  if (draft.parentId && !safeParents.some(({ id }) => id === draft.parentId)) {
    errors.parentId =
      "Choose an active parent outside this category's descendant tree.";
  }
  if (!(["active", "inactive"] as const).includes(draft.status)) {
    errors.status = "Choose a supported category status.";
  }

  return errors;
};

export const buildTaxonomyPayload = (
  draft: TTaxonomyDraft
): TTaxonomyPayload => ({
  name: draft.name.trim(),
  slug: draft.slug.trim(),
  sequence: Number(draft.sequence),
  description: draft.description.trim(),
  status: draft.status,
  parent: draft.parentId || null,
  tags: parseTags(draft.tags),
});
