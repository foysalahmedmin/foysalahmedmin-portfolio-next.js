import { describe, expect, it } from "vitest";
import {
  readSource,
  scanDesignRules,
  walkFiles,
  type DesignRule,
} from "../helpers/source-scan";

/**
 * Token-only lint (docs plan 3.15). Components and routes must not carry colour literals, Tailwind
 * palette utilities, arbitrary radius/shadow/background values or the large "card" radii: the surfaces
 * own those through tokens.
 *
 * The allowlist is the only way out and it only shrinks. Each entry names the rules it exempts and why;
 * the second test fails when an entry no longer has any violation, so finished work must remove its
 * entry. Phase 7 and 8 empty the admin rows; Phase 7 removes the `status-badge` row.
 */
type AllowEntry = Readonly<{
  /** A file path, or a directory prefix ending in "/". */
  path: string;
  rules: readonly DesignRule[];
  reason: string;
}>;

const ALLOWLIST: readonly AllowEntry[] = [
  {
    path: "src/components/admin/",
    rules: ["palette", "literal", "arbitrary", "rounded-large"],
    reason:
      "Admin keeps its legacy styling until the console shell (Phase 7) and workspace sweep (Phase 8)",
  },
  {
    path: "src/app/admin/",
    rules: ["palette", "literal", "arbitrary", "rounded-large"],
    reason: "Admin routes keep legacy styling until Phase 7 and 8",
  },
  {
    path: "src/components/ui/status-badge.tsx",
    rules: ["palette"],
    reason: "Shared with the admin; becomes StatusMark tones in Phase 7",
  },
  {
    path: "src/components/ui/data-table.tsx",
    rules: ["rounded-large"],
    reason:
      "Shared with the admin; restyled with the console DataTable in Phase 7",
  },
  {
    path: "src/app/global-error.tsx",
    rules: ["literal"],
    reason:
      "Replaces the root layout, so no stylesheet or token is available; the greys mirror mono-950 and mono-50",
  },
];

const isAllowed = (path: string, rule: DesignRule) =>
  ALLOWLIST.some(
    (entry) =>
      entry.rules.includes(rule) &&
      (entry.path.endsWith("/")
        ? path.startsWith(entry.path)
        : path === entry.path)
  );

const scanned = [
  ...walkFiles("src/components", [".ts", ".tsx"]),
  ...walkFiles("src/app", [".ts", ".tsx"]),
].map(readSource);

const violations = scanned.flatMap(({ path, text }) =>
  Object.entries(scanDesignRules(text)).map(([rule, count]) => ({
    path,
    rule: rule as DesignRule,
    count: count as number,
  }))
);

describe("design lint (token-only)", () => {
  it("has no violations outside the allowlist", () => {
    const outside = violations.filter(
      ({ path, rule }) => !isAllowed(path, rule)
    );
    expect(
      outside.map(({ path, rule, count }) => `${path}: ${rule} x${count}`)
    ).toEqual([]);
  });

  it("has no stale allowlist entries (the list only shrinks)", () => {
    const stale = ALLOWLIST.filter(
      (entry) =>
        !violations.some(
          ({ path, rule }) =>
            entry.rules.includes(rule) &&
            (entry.path.endsWith("/")
              ? path.startsWith(entry.path)
              : path === entry.path)
        )
    );
    expect(stale.map((entry) => entry.path)).toEqual([]);
  });

  it("detects every rule on a known-bad sample", () => {
    expect(
      scanDesignRules(
        'className="bg-red-500 rounded-3xl shadow-[0_0_4px_#ffffff] rounded-[2rem]" style={{ color: "rgb(1 2 3)" }}'
      )
    ).toEqual({ palette: 1, literal: 2, arbitrary: 2, "rounded-large": 1 });
    expect(
      scanDesignRules(
        'className="bg-card rounded-xl shadow-[var(--shadow-sm)] text-fg-secondary"'
      )
    ).toEqual({});
  });

  it("scans the whole component tree", () => {
    expect(scanned.length).toBeGreaterThan(100);
  });
});
