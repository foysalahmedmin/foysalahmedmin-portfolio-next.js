import fs from "node:fs";
import path from "node:path";

const root = path.join(process.cwd(), "tests", "fixtures", "media");

/**
 * Tiny clips produced by a real encoder (1 second each, under 2 KB), so the
 * parsers are exercised on genuine container structure, not hand-built bytes.
 *
 * - landscape.mp4: stored and displayed 64×36
 * - portrait.mp4:  stored and displayed 36×64
 * - rotated.mp4:   stored 64×36 with a 90° display matrix, so it plays 36×64
 * - clip.webm:     64×36 VP8
 */
export const readMediaFixture = (
  name: "landscape.mp4" | "portrait.mp4" | "rotated.mp4" | "clip.webm"
): Buffer => fs.readFileSync(path.join(root, name));

export const toUploadFile = (
  name: "landscape.mp4" | "portrait.mp4" | "rotated.mp4" | "clip.webm",
  options: { filename?: string; type?: string } = {}
): File =>
  new File([new Uint8Array(readMediaFixture(name))], options.filename ?? name, {
    type:
      options.type ?? (name.endsWith(".webm") ? "video/webm" : "video/mp4"),
  });
