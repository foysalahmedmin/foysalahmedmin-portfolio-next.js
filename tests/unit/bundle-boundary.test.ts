import { describe, expect, it } from "vitest";
import { readImports, reachableFrom } from "../helpers/import-graph";
import { REPO_ROOT, walkFiles } from "../helpers/source-scan";
import { relative } from "node:path";

/**
 * Bundle boundary (docs plan 6.1, risk R18): the animation libraries live in the deferred motion
 * chunk, loaded only for full motion with a fine pointer. This keeps them out of the admin and out of
 * the initial bundle by construction:
 *  1. only src/lib/motion/engine imports gsap or lenis;
 *  2. nothing the admin can reach touches the engine;
 *  3. outside the engine, nothing imports it except through one dynamic import (or its types).
 */
const sourceFiles = walkFiles("src", [".ts", ".tsx"]).map((file) =>
  relative(REPO_ROOT, file).split("\\").join("/")
);

const ENGINE_DIR = "src/lib/motion/engine/";
const ENGINE_TYPES = "src/lib/motion/engine/types.ts";
const LIBRARIES = /^(gsap(\/.*)?|lenis(\/.*)?|three(\/.*)?|@gsap\/.*)$/;

describe("animation library boundary", () => {
  it("only the engine imports gsap or lenis", () => {
    const offenders = sourceFiles.flatMap((file) =>
      readImports(file)
        .filter((edge) => LIBRARIES.test(edge.specifier))
        // type-only imports are erased and were already skipped by readImports
        .filter(() => !file.startsWith(ENGINE_DIR) || file === ENGINE_TYPES)
        .map((edge) => `${file} imports ${edge.specifier}`)
    );
    expect(offenders).toEqual([]);
  });

  it("the engine types module carries no runtime import of the libraries", () => {
    const edges = readImports(ENGINE_TYPES).filter((edge) =>
      LIBRARIES.test(edge.specifier)
    );
    expect(edges).toEqual([]);
  });

  it("nothing the admin or the shared UI can reach touches the engine", () => {
    const reached = reachableFrom([
      "src/app/admin",
      "src/components/admin",
      "src/components/ui",
    ]);
    const leaks = [...reached.entries()]
      .filter(([file]) => file.startsWith(ENGINE_DIR) && file !== ENGINE_TYPES)
      .map(([file, chain]) => `${file} via ${chain.join(" -> ")}`);
    expect(leaks).toEqual([]);

    const imported = [...reached.keys()].flatMap((file) =>
      readImports(file)
        .filter((edge) => LIBRARIES.test(edge.specifier))
        .map((edge) => `${file} imports ${edge.specifier}`)
    );
    expect(imported).toEqual([]);
  });

  it("the engine is imported only dynamically, and only by the engine host", () => {
    const offenders = sourceFiles
      .filter((file) => !file.startsWith(ENGINE_DIR))
      .flatMap((file) =>
        readImports(file)
          .filter(
            (edge) =>
              edge.target?.startsWith(ENGINE_DIR) &&
              edge.target !== ENGINE_TYPES &&
              !(
                edge.dynamic &&
                file === "src/components/motion/motion-engine-host.tsx"
              )
          )
          .map((edge) => `${file} imports ${edge.specifier}`)
      );
    expect(offenders).toEqual([]);
  });

  it("the public layout reaches the engine only through the deferred enhancements", () => {
    // Static edges only: anything statically reachable from the layout would be in the initial bundle
    const staticReach = new Set<string>();
    const queue = ["src/components/surface/public-surface.tsx"];
    while (queue.length > 0) {
      const file = queue.pop()!;
      if (staticReach.has(file)) continue;
      staticReach.add(file);
      for (const edge of readImports(file)) {
        if (!edge.dynamic && edge.target) queue.push(edge.target);
      }
    }
    expect(
      [...staticReach].filter(
        (file) => file.startsWith(ENGINE_DIR) && file !== ENGINE_TYPES
      )
    ).toEqual([]);
    // the palette and the engine host load after hydration, not with the page
    expect(staticReach.has("src/components/motion/command-palette.tsx")).toBe(
      false
    );
    expect(staticReach.has("src/components/motion/enhancements.tsx")).toBe(
      false
    );
  });
});
