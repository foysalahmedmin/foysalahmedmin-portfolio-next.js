import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// The inline video player passes the real pixel size of its box to the
// YouTube embed. The stock youtube-video-element hardcodes width/height of
// "100%", which makes YouTube assume a landscape layout and pillarbox portrait
// (Shorts) videos. The patch also re-applies the size when `config` arrives
// after the iframe was built, which happens on the first, slowest mount. These
// checks fail loudly if a dependency change ever drops the patch.
const installedYoutubeElement = (): string => {
  const reactPlayerEntry = fileURLToPath(import.meta.resolve("react-player"));
  const fromReactPlayer = createRequire(reactPlayerEntry);
  // The package does not export its own package.json, so find the root by
  // walking up from the entry point react-player resolves.
  let directory = path.dirname(
    fromReactPlayer.resolve("youtube-video-element")
  );
  const isPackageRoot = (candidate: string): boolean => {
    const manifest = path.join(candidate, "package.json");
    return (
      fs.existsSync(manifest) &&
      JSON.parse(fs.readFileSync(manifest, "utf8")).name ===
        "youtube-video-element"
    );
  };
  while (!isPackageRoot(directory)) {
    const parent = path.dirname(directory);
    if (parent === directory) {
      throw new Error("youtube-video-element not found");
    }
    directory = parent;
  }
  return directory;
};

describe("youtube-video-element patch", () => {
  it("is registered with pnpm and shipped in the repository", () => {
    const manifest = JSON.parse(fs.readFileSync("package.json", "utf8")) as {
      pnpm?: { patchedDependencies?: Record<string, string> };
    };
    const patch =
      manifest.pnpm?.patchedDependencies?.["youtube-video-element@1.9.0"];
    expect(patch).toBe("patches/youtube-video-element@1.9.0.patch");
    expect(fs.existsSync(patch!)).toBe(true);
  });

  it("is applied to the copy react-player actually loads", () => {
    const root = installedYoutubeElement();
    for (const file of [
      "dist/youtube-video-element.js",
      "dist/cjs/youtube-video-element.js",
    ]) {
      const source = fs.readFileSync(path.join(root, file), "utf8");
      expect(source).toMatch(
        /props\.config\)?\s*==\s*null\s*\?\s*void 0\s*:\s*_a\.width/
      );
      expect(source).not.toMatch(/width: "100%",\s*\n\s*height: "100%"/);
      // A late `config` still resizes an iframe that already exists.
      expect(source).toMatch(
        /set config\(value\) \{[\s\S]*?querySelector\("iframe"\)[\s\S]*?setAttribute\("width"/
      );
    }
    expect(
      fs.readFileSync(path.join(root, "youtube-video-element.d.ts"), "utf8")
    ).toContain("width?: number");
  });
});
