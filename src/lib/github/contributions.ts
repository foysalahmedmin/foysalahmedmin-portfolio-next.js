/**
 * The contribution calendar for the home page's open-code section. GitHub only serves it to a signed-in
 * client or through its GraphQL API with a token, so the page reads a public mirror of the calendar on
 * the server (never from the visitor's browser) and degrades to a plain profile link when it is
 * unavailable. Everything that comes back is validated: only dates and non-negative counts are kept.
 */
export type ContributionDay = Readonly<{
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}>;

export type ContributionWeek = ReadonlyArray<ContributionDay | null>;

export type ContributionCalendar = Readonly<{
  total: number;
  weeks: readonly ContributionWeek[];
  /** Index of the first week of each month, for the labels above the grid. */
  months: ReadonlyArray<Readonly<{ label: string; week: number }>>;
}>;

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

const levelFor = (count: number, max: number): ContributionDay["level"] => {
  if (count <= 0) return 0;
  const ratio = count / Math.max(1, max);
  if (ratio > 0.75) return 4;
  if (ratio > 0.5) return 3;
  if (ratio > 0.25) return 2;
  return 1;
};

/** Parses the mirror's response into weeks (Sunday first). Returns null when nothing usable is in it. */
export function parseContributionCalendar(
  payload: unknown
): ContributionCalendar | null {
  const rows = (payload as { contributions?: unknown } | null)?.contributions;
  if (!Array.isArray(rows)) return null;

  const days = rows
    .flatMap((row): { date: string; count: number }[] => {
      const { date, count } = (row ?? {}) as Record<string, unknown>;
      return typeof date === "string" &&
        DATE.test(date) &&
        typeof count === "number" &&
        Number.isFinite(count) &&
        count >= 0
        ? [{ date, count: Math.floor(count) }]
        : [];
    })
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-371);
  if (days.length < 28) return null;

  const max = Math.max(...days.map((day) => day.count));
  const weeks: Array<Array<ContributionDay | null>> = [];
  let total = 0;
  for (const day of days) {
    total += day.count;
    // getUTCDay: the date string is a calendar date, not an instant
    const weekday = new Date(`${day.date}T00:00:00Z`).getUTCDay();
    if (weeks.length === 0 || weekday === 0) {
      weeks.push(Array.from({ length: 7 }, () => null));
    }
    weeks[weeks.length - 1]![weekday] = {
      date: day.date,
      count: day.count,
      level: levelFor(day.count, max),
    };
  }

  const months: Array<{ label: string; week: number }> = [];
  let lastMonth = -1;
  weeks.forEach((week, index) => {
    const first = week.find((day) => day !== null);
    if (!first) return;
    const month = Number(first.date.slice(5, 7)) - 1;
    if (month !== lastMonth) {
      // The label sits over the first week that starts in the month; the very first label needs room
      months.push({ label: MONTHS[month]!, week: index });
      lastMonth = month;
    }
  });

  // A first month that has only a day or two in the grid would print on top of the next label
  if (months.length > 1 && months[1]!.week - months[0]!.week < 3)
    months.shift();

  return { total, weeks, months };
}

/** Reads the public calendar for a handle. Never throws; null means "show the profile link only". */
export async function readContributionCalendar(
  handle: string
): Promise<ContributionCalendar | null> {
  if (!/^[A-Za-z0-9-]{1,39}$/.test(handle)) return null;
  try {
    const response = await fetch(
      `https://github-contributions-api.jogruber.de/v4/${handle}?y=last`,
      {
        next: { revalidate: 6 * 60 * 60 },
        signal: AbortSignal.timeout(4_000),
        headers: { accept: "application/json" },
      }
    );
    if (!response.ok) return null;
    return parseContributionCalendar(await response.json());
  } catch {
    return null;
  }
}
