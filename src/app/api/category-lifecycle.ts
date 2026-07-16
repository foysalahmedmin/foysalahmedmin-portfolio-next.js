type TCategoryIdentity = {
  _id: unknown;
  name: string;
  slug: string;
  parent?: unknown | null;
};

type TCategoryRestorePartitionInput = {
  candidates: TCategoryIdentity[];
  activeParentIds: Iterable<string>;
  activeConflicts: Array<Pick<TCategoryIdentity, "name" | "slug">>;
};

const toId = (value: unknown): string => String(value);

export const isDuplicateKeyError = (
  error: unknown
): error is { code: number } =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  (error as { code?: unknown }).code === 11_000;

const collectDuplicateIdentityIds = (
  candidates: TCategoryIdentity[]
): Set<string> => {
  const idsByIdentity = new Map<string, string[]>();

  for (const candidate of candidates) {
    const id = toId(candidate._id);
    const identities = [
      `name:${candidate.name.trim().toLocaleLowerCase()}`,
      `slug:${candidate.slug.trim().toLocaleLowerCase()}`,
    ];

    for (const identity of identities) {
      const ids = idsByIdentity.get(identity) ?? [];
      ids.push(id);
      idsByIdentity.set(identity, ids);
    }
  }

  const duplicateIds = new Set<string>();
  for (const ids of idsByIdentity.values()) {
    if (ids.length > 1) {
      ids.forEach((id) => duplicateIds.add(id));
    }
  }

  return duplicateIds;
};

export const partitionCategoryRestoreCandidates = ({
  candidates,
  activeParentIds,
  activeConflicts,
}: TCategoryRestorePartitionInput): {
  restorableIds: string[];
  nonRestorableIds: string[];
} => {
  const availableParentIds = new Set(activeParentIds);
  const conflictingNames = new Set(
    activeConflicts.map((category) => category.name.trim().toLocaleLowerCase())
  );
  const conflictingSlugs = new Set(
    activeConflicts.map((category) => category.slug.trim().toLocaleLowerCase())
  );
  const duplicateIdentityIds = collectDuplicateIdentityIds(candidates);
  const restorableIds: string[] = [];
  const nonRestorableIds: string[] = [];

  for (const candidate of candidates) {
    const id = toId(candidate._id);
    const parentId = candidate.parent ? toId(candidate.parent) : null;
    const hasInactiveParent =
      parentId !== null && !availableParentIds.has(parentId);
    const hasActiveIdentityConflict =
      conflictingNames.has(candidate.name.trim().toLocaleLowerCase()) ||
      conflictingSlugs.has(candidate.slug.trim().toLocaleLowerCase());

    if (
      hasInactiveParent ||
      hasActiveIdentityConflict ||
      duplicateIdentityIds.has(id)
    ) {
      nonRestorableIds.push(id);
    } else {
      restorableIds.push(id);
    }
  }

  return { restorableIds, nonRestorableIds };
};
