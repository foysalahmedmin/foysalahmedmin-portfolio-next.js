import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CONSOLE_ARCHETYPES,
  PUBLIC_ARCHETYPES,
} from "@/components/templates/archetypes";
import * as templates from "@/components/templates";

const contract = JSON.parse(
  readFileSync(
    join(process.cwd(), "docs/design-system/archetypes.json"),
    "utf8"
  )
) as {
  public: {
    archetypes: Record<
      string,
      { name: string; template: string; routes?: string[] }
    >;
  };
  console: { archetypes: Record<string, { name: string; template: string }> };
};

describe("archetype contract", () => {
  it("keeps docs/design-system/archetypes.json in step with the template registry", () => {
    const publicFromJson = Object.fromEntries(
      Object.entries(contract.public.archetypes).map(([id, a]) => [
        id,
        { name: a.name, template: a.template },
      ])
    );
    expect(publicFromJson).toEqual(PUBLIC_ARCHETYPES);
    expect(contract.console.archetypes).toEqual(CONSOLE_ARCHETYPES);
  });

  it("exports exactly one template per archetype", () => {
    const exported = Object.keys(templates);
    for (const { template } of [
      ...Object.values(PUBLIC_ARCHETYPES),
      ...Object.values(CONSOLE_ARCHETYPES),
    ]) {
      expect(exported, template).toContain(template);
    }
  });

  it("assigns every public page route to an archetype", () => {
    const routed = new Set(
      Object.values(contract.public.archetypes).flatMap((a) => a.routes ?? [])
    );
    const appDirectory = join(process.cwd(), "src/app/(common)");
    const pages: string[] = [];
    const visit = (directory: string, prefix: string) => {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const segment = entry.name;
        const isGroup = segment.startsWith("(");
        const next = isGroup ? prefix : `${prefix}/${segment}`;
        const hasPage = readdirSync(join(directory, segment)).some(
          (file) => file === "page.tsx"
        );
        if (hasPage && !segment.startsWith("[")) pages.push(next || "/");
        if (hasPage && isGroup) pages.push(prefix || "/");
        visit(join(directory, segment), next);
      }
    };
    visit(appDirectory, "");
    const missing = [...new Set(pages)].filter((route) => !routed.has(route));
    expect(missing).toEqual([]);
  });
});
