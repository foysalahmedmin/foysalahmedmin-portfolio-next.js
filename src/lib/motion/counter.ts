export type CountFormat = Readonly<{
  decimals: number;
  prefix: string;
  suffix: string;
  locale: string;
}>;

export const DEFAULT_COUNT_FORMAT: CountFormat = {
  decimals: 0,
  prefix: "",
  suffix: "",
  locale: "en",
};

/**
 * Format a number the way the Counter prints it. The server render and every animation frame use
 * this one function, so the end frame of the count-up is the server text, character for character.
 */
export function formatCount(
  value: number,
  format: Partial<CountFormat> = {}
): string {
  const { decimals, prefix, suffix, locale } = {
    ...DEFAULT_COUNT_FORMAT,
    ...format,
  };
  const digits = Math.min(6, Math.max(0, Math.floor(decimals)));
  const safe = Number.isFinite(value) ? value : 0;
  const body = new Intl.NumberFormat(locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(safe);
  return `${prefix}${body}${suffix}`;
}
