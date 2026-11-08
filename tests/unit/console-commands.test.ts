import {
  CAPABILITIES,
  getCapabilitiesForRole,
  type Capability,
} from "@/lib/auth/capabilities";
import { PALETTE_GROUPS } from "@/lib/palette/commands";
import {
  CONSOLE_PREFERENCES,
  buildConsoleCommands,
} from "@/lib/palette/console-commands";
import { navigationFor } from "@/components/admin/shell/nav";
import { describe, expect, it } from "vitest";

const labels = (capabilities: readonly Capability[]) =>
  buildConsoleCommands(capabilities).map((command) => command.label);

describe("console command set", () => {
  it("jumps to exactly the workspaces the rail shows", () => {
    for (const role of ["super-admin", "admin", "editor", "author"] as const) {
      const capabilities = getCapabilitiesForRole(role);
      const navigate = buildConsoleCommands(capabilities)
        .filter((command) => command.group === "Navigate")
        .map((command) => command.href);
      const rail = navigationFor(capabilities).flatMap((group) =>
        group.links.map((link) => link.href)
      );
      expect(navigate, role).toEqual(rail);
    }
  });

  it("never offers a workspace the capabilities do not allow", () => {
    const editor = labels(getCapabilitiesForRole("editor"));
    for (const hidden of ["Users", "Audit log", "Contact inbox"]) {
      expect(editor).not.toContain(hidden);
    }
    expect(labels(getCapabilitiesForRole("author"))).not.toContain("Articles");
    expect(labels(["admin:access"])).toEqual(
      expect.arrayContaining(["Dashboard", "Profile settings"])
    );
  });

  it("offers the four create actions on their existing routes, only with content:edit", () => {
    const create = buildConsoleCommands(
      getCapabilitiesForRole("editor")
    ).filter((command) => command.group === "Create");
    expect(create.map((command) => [command.label, command.href])).toEqual([
      ["New article", "/admin/articles/new"],
      ["New project", "/admin/projects/new"],
      ["New case study", "/admin/case-studies/new"],
      ["New video", "/admin/videos/new"],
    ]);
    const withoutEdit = CAPABILITIES.filter(
      (capability) => capability !== "content:edit"
    );
    expect(labels(withoutEdit)).not.toContain("New article");
  });

  it("offers Review and publish site only with site:read", () => {
    const review = (capabilities: readonly Capability[]) =>
      buildConsoleCommands(capabilities).find(
        (command) => command.label === "Review and publish site"
      );
    expect(review(["admin:access", "site:read"])).toMatchObject({
      group: "Actions",
      href: "/admin/site",
    });
    expect(review(["admin:access", "content:read"])).toBeUndefined();
    expect(review(getCapabilitiesForRole("author"))).toBeUndefined();
  });

  it("always offers View site (new tab) and Sign out (handed to the host)", () => {
    const commands = buildConsoleCommands(["admin:access"]);
    expect(commands.find((c) => c.label === "View site")).toMatchObject({
      href: "/",
      external: true,
    });
    expect(commands.find((c) => c.label === "Sign out")).toMatchObject({
      action: "session:signout",
    });
  });

  it("has unique ids and only known groups", () => {
    const commands = [
      ...buildConsoleCommands(CAPABILITIES),
      ...CONSOLE_PREFERENCES,
    ];
    expect(new Set(commands.map((c) => c.id)).size).toBe(commands.length);
    for (const command of commands) {
      expect(PALETTE_GROUPS).toContain(command.group);
    }
  });

  it("keeps the theme in the console preferences and drops motion and the 3D scene", () => {
    const actions = CONSOLE_PREFERENCES.map((command) => command.action);
    expect(actions).toEqual([
      "theme:toggle",
      "theme:dark",
      "theme:light",
      "theme:system",
    ]);
  });
});
