type PublicPaginationOptions = {
  defaultLimit?: number;
  maxLimit?: number;
};

const toPositiveInteger = (value: unknown, fallback: number) => {
  const parsed =
    typeof value === 'string' || typeof value === 'number'
      ? Number(value)
      : Number.NaN;

  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
};

export const withPublicPagination = (
  queryParams: Record<string, unknown>,
  options: PublicPaginationOptions = {},
) => {
  const safeQueryParams = { ...queryParams };
  delete safeQueryParams.fields;

  const defaultLimit = Math.max(1, options.defaultLimit ?? 20);
  const maxLimit = Math.max(defaultLimit, options.maxLimit ?? 50);
  const page = toPositiveInteger(queryParams.page, 1);
  const requestedLimit = toPositiveInteger(queryParams.limit, defaultLimit);

  return {
    ...safeQueryParams,
    page: String(page),
    limit: String(Math.min(requestedLimit, maxLimit)),
  };
};
