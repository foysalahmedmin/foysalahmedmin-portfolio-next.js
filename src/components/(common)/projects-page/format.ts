/** `open_source` -> `Open Source`, `completed` -> `Completed`. */
export const titleCase = (value: string) =>
  value
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");

export const formatProjectType = titleCase;

/** The UTC year of an ISO date, or null when there is no usable date. */
export const projectYear = (value?: string): number | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? null : date.getUTCFullYear();
};
