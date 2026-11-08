import { navigationFor } from "@/components/admin/shell/nav";
import type { Capability } from "@/lib/auth/capabilities";
import { PREFERENCE_COMMANDS, type PaletteCommand } from "./commands";

/** The "new" routes that exist under `src/app/admin/(protected)`; creating needs `content:edit`. */
const CREATE_COMMANDS: readonly PaletteCommand[] = [
  { label: "New article", href: "/admin/articles/new", keywords: ["write"] },
  { label: "New project", href: "/admin/projects/new", keywords: ["work"] },
  {
    label: "New case study",
    href: "/admin/case-studies/new",
    keywords: ["story"],
  },
  { label: "New video", href: "/admin/videos/new", keywords: ["film"] },
].map(
  (command): PaletteCommand => ({
    ...command,
    id: `create:${command.href}`,
    group: "Create",
    keywords: ["create", "add", ...command.keywords],
  })
);

/** The console keeps the theme only: motion and the 3D scene are public-site preferences. */
export const CONSOLE_PREFERENCES: readonly PaletteCommand[] = [
  {
    id: "theme:toggle",
    label: "Toggle theme",
    group: "Preferences",
    keywords: ["dark", "light", "appearance", "mode"],
    action: "theme:toggle",
  },
  ...PREFERENCE_COMMANDS.filter((command) =>
    command.action?.startsWith("theme:")
  ),
];

/**
 * The console command set (docs plan 4.3): every workspace the capabilities allow, the create actions,
 * "Review and publish site", View site and sign out. Built from the same nav data as the rail, so the
 * palette never offers a workspace the rail hides. The display preferences are `CONSOLE_PREFERENCES`.
 */
export function buildConsoleCommands(
  capabilities: readonly Capability[]
): readonly PaletteCommand[] {
  const navigate = navigationFor(capabilities).flatMap((group) =>
    group.links.map(
      (link): PaletteCommand => ({
        id: `nav:${link.href}`,
        label: link.name,
        group: "Navigate",
        href: link.href,
        keywords: [group.label],
      })
    )
  );
  const actions: PaletteCommand[] = [];
  if (capabilities.includes("site:read")) {
    actions.push({
      id: "action:review-publish",
      label: "Review and publish site",
      group: "Actions",
      href: "/admin/site",
      keywords: ["publish", "draft", "release", "revision"],
    });
  }
  actions.push(
    {
      id: "action:view-site",
      label: "View site",
      group: "Actions",
      href: "/",
      external: true,
      keywords: ["public", "open", "website"],
    },
    {
      id: "action:sign-out",
      label: "Sign out",
      group: "Actions",
      keywords: ["log out", "logout", "exit"],
      action: "session:signout",
    }
  );
  return [
    ...navigate,
    ...(capabilities.includes("content:edit") ? CREATE_COMMANDS : []),
    ...actions,
  ];
}
