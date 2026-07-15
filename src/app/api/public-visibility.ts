export const getPublicArticleFilter = (now = new Date()) => ({
  status: "published" as const,
  published_at: { $lte: now },
  $or: [
    { expired_at: { $exists: false } },
    { expired_at: null },
    { expired_at: { $gt: now } },
  ],
});

export const getPublicProjectFilter = () => ({
  status: "completed" as const,
});

export const getPublicCategoryFilter = () => ({
  status: "active" as const,
});

export const withPublicCategories = <T extends Record<string, unknown>>(
  filter: T,
  categoryIds: readonly unknown[]
) => ({
  ...filter,
  category: { $in: categoryIds },
});

export const getPublicProjectResourceFilter = (project?: unknown) => ({
  is_private: { $ne: true },
  ...(project === undefined ? {} : { project }),
});

export const getPublicReviewFilter = (
  publicTargetConditions: Array<Record<string, unknown>>
) => ({
  status: "approved" as const,
  $or: publicTargetConditions,
});
