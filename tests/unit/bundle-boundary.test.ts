import { describe, expect, it } from "vitest";
import { readImports, reachableFrom } from "../helpers/import-graph";
import { REPO_ROOT, walkFiles } from "../helpers/source-scan";
import { readFileSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * Bundle boundary (docs plan 6.1, risk R18): the animation libraries live in the deferred motion
 * chunk, loaded only for full motion with a fine pointer. This keeps them out of the admin and out of
 * the initial bundle by construction:
 *  1. only src/lib/motion/engine imports gsap or lenis;
 *  2. nothing the admin can reach touches the engine;
 *  3. outside the engine, nothing imports it except through one dynamic import (or its types).
 *
 * Three.js follows the same idea (docs plan 3.8, 6.1): it is imported by exactly two modules of the
 * hero scene, and the scene is loaded by one dynamic import, after hydration and only when the visitor
 * qualifies for the canvas. Nothing a public page imports statically reaches it.
 */
const sourceFiles = walkFiles("src", [".ts", ".tsx"]).map((file) =>
  relative(REPO_ROOT, file).split("\\").join("/")
);

const ENGINE_DIR = "src/lib/motion/engine/";
const ENGINE_TYPES = "src/lib/motion/engine/types.ts";
const LIBRARIES = /^(gsap(\/.*)?|lenis(\/.*)?|three(\/.*)?|@gsap\/.*)$/;
const ENGINE_LIBRARIES = /^(gsap(\/.*)?|lenis(\/.*)?|@gsap\/.*)$/;
const THREE = /^three(\/.*)?$/;

const SCENE_DIR = "src/components/three/";
const SCENE_MODULES = [
  `${SCENE_DIR}topology-scene.ts`,
  `${SCENE_DIR}materials.ts`,
];
const SCENE_ENTRY = `${SCENE_DIR}topology-scene.ts`;
const SCENE_LOADER = `${SCENE_DIR}hero-canvas.tsx`;

/** Files reachable through static imports only: what a chunk contains without any dynamic import(). */
const staticClosure = (roots: readonly string[]) => {
  const seen = new Set<string>();
  const queue = [...roots];
  while (queue.length > 0) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    for (const edge of readImports(file)) {
      if (!edge.dynamic && edge.target) queue.push(edge.target);
    }
  }
  return seen;
};

describe("animation library boundary", () => {
  it("only the engine imports gsap or lenis", () => {
    const offenders = sourceFiles.flatMap((file) =>
      readImports(file)
        .filter((edge) => ENGINE_LIBRARIES.test(edge.specifier))
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
        .filter((edge) => ENGINE_LIBRARIES.test(edge.specifier))
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

  it("only the two hero scene modules import three", () => {
    const offenders = sourceFiles.flatMap((file) =>
      readImports(file)
        .filter((edge) => THREE.test(edge.specifier))
        .filter(() => !SCENE_MODULES.includes(file))
        .map((edge) => `${file} imports ${edge.specifier}`)
    );
    expect(offenders).toEqual([]);
    // and they really do: the allow-list above must not rot into a dead exception
    for (const file of SCENE_MODULES) {
      expect(
        readImports(file).some((edge) => THREE.test(edge.specifier)),
        file
      ).toBe(true);
    }
  });

  it("the admin never loads three: the preview renders the hero but never mounts the engine provider", () => {
    // The admin's page preview renders public sections, hero included, so the canvas component is
    // reachable from it through the one dynamic import. The canvas waits for the engine provider's
    // state, and only the public surface mounts that provider, so the admin stays on the poster.
    const adminRoots = walkFiles("src/app/admin", [".ts", ".tsx"])
      .concat(walkFiles("src/components/admin", [".ts", ".tsx"]))
      .concat(walkFiles("src/components/ui", [".ts", ".tsx"]))
      .map((file) => relative(REPO_ROOT, file).split("\\").join("/"));
    const reach = staticClosure(adminRoots);
    expect(SCENE_MODULES.filter((file) => reach.has(file))).toEqual([]);
    expect(reach.has("src/components/surface/public-surface.tsx")).toBe(false);

    const providers = sourceFiles.filter((file) =>
      readImports(file).some(
        (edge) =>
          edge.target === "src/components/motion/engine-provider.tsx" &&
          readFileSync(join(REPO_ROOT, file), "utf8").includes(
            "<EngineProvider"
          )
      )
    );
    expect(providers).toEqual(["src/components/surface/public-surface.tsx"]);
  });

  it("the scene is loaded by one dynamic import, from the canvas component only", () => {
    const importers = sourceFiles.flatMap((file) =>
      readImports(file)
        .filter((edge) => edge.target === SCENE_ENTRY)
        .map((edge) => ({ file, dynamic: edge.dynamic }))
    );
    const loaders = importers.filter((importer) => importer.dynamic);
    expect(loaders).toEqual([{ file: SCENE_LOADER, dynamic: true }]);
    // The only static importer is the lab route that renders posters, never a public page
    expect(
      importers.filter((importer) => !importer.dynamic).map((i) => i.file)
    ).toEqual([`${SCENE_DIR}poster-stage.tsx`]);
  });

  it("nothing a public page or the layout imports statically reaches three", () => {
    const pageRoots = sourceFiles.filter(
      (file) =>
        file.startsWith("src/app/(common)/") ||
        file === "src/components/surface/public-surface.tsx"
    );
    const reach = staticClosure(pageRoots);
    expect(SCENE_MODULES.filter((file) => reach.has(file))).toEqual([]);
    // the canvas component itself is a static dependency of the hero; it must stay free of three
    expect(reach.has(SCENE_LOADER)).toBe(true);
    for (const file of staticClosure([SCENE_LOADER])) {
      expect(
        readImports(file).filter(
          (edge) => !edge.dynamic && THREE.test(edge.specifier)
        ),
        file
      ).toEqual([]);
    }
  });

  it("the poster route is the only place that renders the scene without the canvas gate", () => {
    const stage = "src/components/three/poster-stage.tsx";
    const users = sourceFiles.filter((file) =>
      readImports(file).some((edge) => edge.target === stage)
    );
    expect(users).toEqual(["src/app/(lab)/lab/hero/poster/page.tsx"]);
  });
});
