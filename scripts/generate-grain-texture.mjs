// Generates public/textures/grain.png: a static 160 px greyscale noise tile (docs plan 3.4).
// Deterministic (seeded) and quantised to 8 levels so the PNG stays small (about 10 to 16 KB).
// Usage: node scripts/generate-grain-texture.mjs
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const SIZE = 160;
const LEVELS = 8;
let seed = 0x5eed1234;
const rand = () => {
  // mulberry32
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const pixels = Buffer.alloc(SIZE * SIZE * 2); // grey + alpha
for (let i = 0; i < SIZE * SIZE; i += 1) {
  const level = Math.floor(rand() * LEVELS);
  const grey = Math.round((level / (LEVELS - 1)) * 255);
  pixels[i * 2] = grey;
  pixels[i * 2 + 1] = 255;
}

mkdirSync("public/textures", { recursive: true });
await sharp(pixels, { raw: { width: SIZE, height: SIZE, channels: 2 } })
  .png({ compressionLevel: 9, palette: false })
  .toFile("public/textures/grain.png");
console.log("written public/textures/grain.png");
