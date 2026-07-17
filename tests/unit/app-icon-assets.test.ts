import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

const pngMetadata = (relativePath: string) =>
  sharp(fs.readFileSync(path.resolve(relativePath)), { failOn: "error" })
    .metadata()
    .then(({ format, width, height }) => ({ format, width, height }));

describe("app icon assets", () => {
  it("ships final icon and apple-icon assets through Next metadata conventions", async () => {
    await expect(pngMetadata("src/app/icon.png")).resolves.toEqual({
      format: "png",
      width: 512,
      height: 512,
    });
    await expect(pngMetadata("src/app/apple-icon.png")).resolves.toEqual({
      format: "png",
      width: 180,
      height: 180,
    });
  });
});
