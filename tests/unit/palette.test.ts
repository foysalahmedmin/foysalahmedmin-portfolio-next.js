// @vitest-environment jsdom

import { createEmergencyPublicSite } from "@/app/api/site/site.policy";
import { buildPaletteCommands } from "@/lib/palette/build";
import {
  PREFERENCE_COMMANDS,
  filterCommands,
  groupCommands,
  scoreCommand,
  type PaletteCommand,
} from "@/lib/palette/commands";
import { isPaletteShortcut } from "@/lib/palette/shortcut";
import { describe, expect, it } from "vitest";

const command = (
  label: string,
  overrides: Partial<PaletteCommand> = {}
): PaletteCommand => ({
  id: label,
  label,
  group: "Navigate",
  href: "/x",
  ...overrides,
});

describe("scoreCommand", () => {
  it("ranks exact, prefix, word prefix, substring, keyword, then fuzzy", () => {
    const withKeyword = command("Appearance", { keywords: ["dark"] });
    const scores = [
      scoreCommand(command("About"), "about"),
      scoreCommand(command("About"), "ab"),
      scoreCommand(command("Case studies"), "stu"),
      scoreCommand(command("Open source"), "pen"),
      scoreCommand(withKeyword, "dark"),
      scoreCommand(command("Case studies"), "cst"),
    ];
    expect(scores).toEqual([120, 100, 80, 60, 40, 20]);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
  });

  it("does not match unrelated text and ignores case and surrounding space", () => {
    expect(scoreCommand(command("Contact"), "zzz")).toBe(0);
    expect(scoreCommand(command("Contact"), "  CONTACT ")).toBe(120);
    expect(scoreCommand(command("Contact"), "")).toBeGreaterThan(0);
  });
});

describe("filterCommands", () => {
  const all = [
    command("Home"),
    command("About"),
    command("Articles"),
    command("Case studies"),
    command("Contact"),
  ];

  it("returns every command for an empty query, in order", () => {
    expect(filterCommands(all, "").map((item) => item.label)).toEqual(
      all.map((item) => item.label)
    );
  });

  it("puts the best match first and keeps ties in their original order", () => {
    expect(filterCommands(all, "a").map((item) => item.label)).toEqual([
      "About",
      "Articles",
      "Case studies",
      "Contact",
    ]);
    expect(filterCommands(all, "con").map((item) => item.label)).toEqual([
      "Contact",
    ]);
  });

  it("returns nothing when nothing matches", () => {
    expect(filterCommands(all, "qqq")).toEqual([]);
  });
});

describe("groupCommands", () => {
  it("keeps group order and drops empty groups", () => {
    const groups = groupCommands([
      command("Theme: dark", {
        group: "Preferences",
        href: undefined,
        action: "theme:dark",
      }),
      command("Home"),
    ]);
    expect(groups.map((entry) => entry.group)).toEqual([
      "Navigate",
      "Preferences",
    ]);
    expect(
      groupCommands([command("Home")]).map((entry) => entry.group)
    ).toEqual(["Navigate"]);
  });
});

describe("buildPaletteCommands", () => {
  const commands = buildPaletteCommands(createEmergencyPublicSite());

  it("offers every site page once", () => {
    expect(commands.length).toBeGreaterThan(3);
    expect(commands.every((item) => item.group === "Navigate")).toBe(true);
    const hrefs = commands.map((item) => item.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    expect(hrefs).toContain("/contact");
  });
});

describe("PREFERENCE_COMMANDS", () => {
  it("cover theme, motion and the 3D scene", () => {
    expect(PREFERENCE_COMMANDS.map((item) => item.action)).toEqual(
      expect.arrayContaining([
        "theme:dark",
        "theme:light",
        "theme:system",
        "motion:system",
        "motion:full",
        "motion:reduce",
        "motion:off",
        "scene:auto",
        "scene:still",
      ])
    );
  });

  it("every command navigates or acts, never both, and ids are unique", () => {
    const all = [
      ...buildPaletteCommands(createEmergencyPublicSite()),
      ...PREFERENCE_COMMANDS,
    ];
    for (const item of all) {
      expect(Boolean(item.href) !== Boolean(item.action), item.id).toBe(true);
    }
    expect(new Set(all.map((item) => item.id)).size).toBe(all.length);
  });
});

describe("isPaletteShortcut", () => {
  const key = (init: Partial<KeyboardEventInit> & { key: string }) =>
    new KeyboardEvent("keydown", init);

  it("is Ctrl or Command plus K, and nothing else", () => {
    expect(isPaletteShortcut(key({ key: "k", ctrlKey: true }))).toBe(true);
    expect(isPaletteShortcut(key({ key: "K", metaKey: true }))).toBe(true);
    expect(isPaletteShortcut(key({ key: "k" }))).toBe(false);
    expect(isPaletteShortcut(key({ key: "j", ctrlKey: true }))).toBe(false);
    expect(
      isPaletteShortcut(key({ key: "k", ctrlKey: true, shiftKey: true }))
    ).toBe(false);
    expect(
      isPaletteShortcut(key({ key: "k", metaKey: true, altKey: true }))
    ).toBe(false);
  });
});
