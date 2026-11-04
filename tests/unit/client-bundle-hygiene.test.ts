import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Modules that client components import must not pull heavy server-side libraries into the initial
 * JavaScript of every public route (ADR 0009 budget: 180 KB gzip; zod alone is about 49 KB).
 * Schemas live in `*.schema.ts` siblings that only server code imports.
 */
const clientReachable = [
  "src/lib/content/pillars.ts",
  "src/lib/content/slug.ts",
  "src/lib/content/portfolio-contract.ts",
  "src/components/ui/icon.tsx",
  "src/components/ui/button-variants.ts",
];

describe("client bundle hygiene", () => {
  it.each(clientReachable)(
    "%s imports neither zod, sanitize-html nor the lucide namespace",
    (path) => {
      const source = readFileSync(join(process.cwd(), path), "utf8");
      expect(source).not.toMatch(/from\s+["']zod["']/);
      expect(source).not.toMatch(/from\s+["']sanitize-html["']/);
      expect(source).not.toMatch(
        /import\s+\*\s+as\s+\w+\s+from\s+["']lucide-react["']/
      );
    }
  );

  it("no source file imports the lucide-react namespace (ADR 0002, ADR 0011)", () => {
    const hits = execSync(
      'grep -rlE "import \\* as [A-Za-z_]+ from [\'\\"]lucide-react[\'\\"]" src || true',
      { cwd: process.cwd(), encoding: "utf8" }
    ).trim();
    expect(hits).toBe("");
  });
});
