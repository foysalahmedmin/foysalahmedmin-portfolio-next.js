/** Shared by the dashboard and the review view. Times are shown in the owner's timezone, like the rest of the admin. */
const TIME_ZONE = "Asia/Dhaka";

const clock = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: TIME_ZONE,
});

const stamp = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: TIME_ZONE,
});

type Instant = string | Date | null | undefined;

const parse = (value: Instant): Date | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** `10:42` */
export const formatClock = (value: Instant): string => {
  const date = parse(value);
  return date ? clock.format(date) : "unknown";
};

/** `08 Nov, 10:42` */
export const formatStamp = (value: Instant): string => {
  const date = parse(value);
  return date ? stamp.format(date) : "Not recorded";
};

/** `2h ago`, measured against a given instant so the same snapshot always reads the same. */
export const formatAge = (value: Instant, now: Instant): string => {
  const date = parse(value);
  const reference = parse(now);
  if (!date || !reference) return "unknown age";
  const minutes = Math.max(
    0,
    Math.floor((reference.getTime() - date.getTime()) / 60_000)
  );
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

export const statusLabel = (value: string): string =>
  value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export const plural = (count: number, one: string, many = `${one}s`): string =>
  count === 1 ? one : many;
