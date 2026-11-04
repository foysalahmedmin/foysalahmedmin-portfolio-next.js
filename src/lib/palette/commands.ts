/** Actions the palette can run besides navigating. They are plain strings so the server can pass them. */
export type PaletteAction =
  | "theme:dark"
  | "theme:light"
  | "theme:system"
  | "motion:system"
  | "motion:full"
  | "motion:reduce"
  | "motion:off"
  | "scene:auto"
  | "scene:still";

export type PaletteGroup = "Navigate" | "Preferences";

export type PaletteCommand = Readonly<{
  id: string;
  label: string;
  group: PaletteGroup;
  /** Extra words the query can match (for example "dark mode" for the theme command). */
  keywords?: readonly string[];
  /** A path (`/about`), an https URL or a `mailto:` link. Mutually exclusive with `action`. */
  href?: string;
  external?: boolean;
  action?: PaletteAction;
}>;

export const PALETTE_GROUPS: readonly PaletteGroup[] = [
  "Navigate",
  "Preferences",
];

/** The display preferences. Static, so the client adds them itself instead of receiving them in the page. */
export const PREFERENCE_COMMANDS: readonly PaletteCommand[] = [
  {
    id: "theme:dark",
    label: "Theme: dark",
    group: "Preferences",
    keywords: ["ink", "night"],
    action: "theme:dark",
  },
  {
    id: "theme:light",
    label: "Theme: light",
    group: "Preferences",
    keywords: ["paper", "day"],
    action: "theme:light",
  },
  {
    id: "theme:system",
    label: "Theme: follow system",
    group: "Preferences",
    keywords: ["auto", "device"],
    action: "theme:system",
  },
  {
    id: "motion:system",
    label: "Motion: site default",
    group: "Preferences",
    keywords: ["animation", "auto"],
    action: "motion:system",
  },
  {
    id: "motion:full",
    label: "Motion: full",
    group: "Preferences",
    keywords: ["animation", "smooth"],
    action: "motion:full",
  },
  {
    id: "motion:reduce",
    label: "Motion: reduced",
    group: "Preferences",
    keywords: ["animation", "calm", "less"],
    action: "motion:reduce",
  },
  {
    id: "motion:off",
    label: "Motion: off",
    group: "Preferences",
    keywords: ["animation", "none", "static"],
    action: "motion:off",
  },
  {
    id: "scene:auto",
    label: "3D scene: live",
    group: "Preferences",
    keywords: ["3d", "hero", "webgl"],
    action: "scene:auto",
  },
  {
    id: "scene:still",
    label: "3D scene: still image",
    group: "Preferences",
    keywords: ["3d", "hero", "webgl", "poster"],
    action: "scene:still",
  },
];

const normalise = (value: string) => value.toLowerCase().normalize("NFKD");

/** Whether every character of `needle` appears in `haystack`, in order. */
const isSubsequence = (needle: string, haystack: string): boolean => {
  let index = 0;
  for (const character of haystack) {
    if (character === needle[index]) index += 1;
    if (index === needle.length) return true;
  }
  return needle.length === 0;
};

/** 0 means no match. Higher is better: prefix, then word prefix, then substring, then keyword, then fuzzy. */
export function scoreCommand(command: PaletteCommand, query: string): number {
  const needle = normalise(query.trim());
  if (!needle) return 1;
  const label = normalise(command.label);
  if (label === needle) return 120;
  if (label.startsWith(needle)) return 100;
  if (label.split(/[\s:/-]+/).some((word) => word.startsWith(needle)))
    return 80;
  if (label.includes(needle)) return 60;
  if (command.keywords?.some((word) => normalise(word).includes(needle))) {
    return 40;
  }
  return isSubsequence(needle.replace(/\s+/g, ""), label.replace(/\s+/g, ""))
    ? 20
    : 0;
}

/** Matching commands, best first; commands with the same score keep their original order. */
export function filterCommands(
  commands: readonly PaletteCommand[],
  query: string
): PaletteCommand[] {
  return commands
    .map((command, index) => ({
      command,
      index,
      score: scoreCommand(command, query),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((entry) => entry.command);
}

/** Group results for display, keeping the group order and the ranking inside each group. */
export function groupCommands(
  commands: readonly PaletteCommand[]
): Array<{ group: PaletteGroup; commands: PaletteCommand[] }> {
  return PALETTE_GROUPS.map((group) => ({
    group,
    commands: commands.filter((command) => command.group === group),
  })).filter((entry) => entry.commands.length > 0);
}
