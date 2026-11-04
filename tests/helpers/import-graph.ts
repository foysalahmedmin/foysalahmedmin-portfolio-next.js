import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { REPO_ROOT, walkFiles } from "./source-scan";

export type ImportEdge = Readonly<{
  specifier: string;
  /** Resolved repo-relative path for project files; null for packages and unresolved paths. */
  target: string | null;
  dynamic: boolean;
}>;

const EXTENSIONS = [".ts", ".tsx", ".mts", ".js", ".jsx"] as const;

const resolveProjectFile = (base: string): string | null => {
  const candidates = [
    base,
    ...EXTENSIONS.map((extension) => `${base}${extension}`),
    ...EXTENSIONS.map((extension) => join(base, `index${extension}`)),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate) && statSync(candidate).isFile()) {
      return relative(REPO_ROOT, candidate).split("\\").join("/");
    }
  }
  return null;
};

/**
 * Import edges of a source file. Type-only imports are erased by the compiler and ship nothing, so they
 * are not edges. Dynamic `import()` is an edge flagged `dynamic`: it loads a separate chunk, but the
 * chunk still exists in the build.
 */
export function readImports(path: string): ImportEdge[] {
  const text = readFileSync(join(REPO_ROOT, path), "utf8");
  const edges: ImportEdge[] = [];

  const add = (specifier: string, dynamic: boolean) => {
    let target: string | null = null;
    if (specifier.startsWith("@/")) {
      target = resolveProjectFile(join(REPO_ROOT, "src", specifier.slice(2)));
    } else if (specifier.startsWith(".")) {
      target = resolveProjectFile(
        resolve(dirname(join(REPO_ROOT, path)), specifier)
      );
    }
    edges.push({ specifier, target, dynamic });
  };

  const staticPattern =
    /(?:^|\n)\s*(?:import|export)\s+(type\s+)?(?:[^;"']*?\sfrom\s+)?["']([^"']+)["']/g;
  for (const match of text.matchAll(staticPattern)) {
    if (match[1]) continue; // `import type` / `export type`
    add(match[2]!, false);
  }
  for (const match of text.matchAll(/\bimport\(\s*["']([^"']+)["']\s*\)/g)) {
    add(match[1]!, true);
  }
  return edges;
}

/** Every project file reachable from the given roots (files or directories), following all edges. */
export function reachableFrom(roots: readonly string[]): Map<string, string[]> {
  const files = roots.flatMap((root) => {
    const absolute = join(REPO_ROOT, root);
    return statSync(absolute).isDirectory()
      ? walkFiles(root, [".ts", ".tsx"]).map((file) =>
          relative(REPO_ROOT, file).split("\\").join("/")
        )
      : [root];
  });

  /** reached file -> the chain of files that led to it */
  const reached = new Map<string, string[]>();
  const queue: Array<[string, string[]]> = files.map((file) => [file, [file]]);
  while (queue.length > 0) {
    const [file, chain] = queue.shift()!;
    if (reached.has(file)) continue;
    reached.set(file, chain);
    for (const edge of readImports(file)) {
      if (edge.target && !reached.has(edge.target)) {
        queue.push([edge.target, [...chain, edge.target]]);
      }
    }
  }
  return reached;
}
