// Renders the hero posters from the same Three.js scene the live canvas draws (docs plan 3.8).
//   1. start the app where the Motion lab is served (pnpm dev, or a build with MOTION_LAB=1)
//   2. pnpm exec tsx scripts/render-hero-poster.ts --base http://127.0.0.1:3107
// Each poster is the scene alone with a transparent background: the hero supplies the page colour,
// grid and scrim, so the poster and the live canvas composite to the same pixels. The script writes
// AVIF and WebP into public/images/hero and exits non-zero when a file is over its budget.
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

type Variant = {
  theme: "dark" | "light";
  frame: "landscape" | "portrait";
  width: number;
  height: number;
  /** Budget per file in KB (docs plan 6.2: 120 desktop, 60 mobile). */
  budgetKb: number;
  quality: "full" | "simplified";
};

const VARIANTS: Variant[] = [
  { theme: "dark", frame: "landscape", width: 1920, height: 1080, budgetKb: 120, quality: "full" },
  { theme: "light", frame: "landscape", width: 1920, height: 1080, budgetKb: 120, quality: "full" },
  { theme: "dark", frame: "portrait", width: 720, height: 1280, budgetKb: 60, quality: "full" },
  { theme: "light", frame: "portrait", width: 720, height: 1280, budgetKb: 60, quality: "full" },
];

const args = process.argv.slice(2);
const baseIndex = args.indexOf("--base");
const base = baseIndex >= 0 ? args[baseIndex + 1]! : "http://127.0.0.1:3107";
const outDir = join(process.cwd(), "public/images/hero");
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
let failed = false;
const report: string[] = [];

for (const variant of VARIANTS) {
  const context = await browser.newContext({
    viewport: { width: variant.width, height: variant.height },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  await page.goto(`${base}/lab/hero/poster?theme=${variant.theme}&quality=${variant.quality}`, {
    waitUntil: "load",
  });
  await page.waitForSelector("[data-poster-stage][data-ready='true']", { timeout: 120_000 });
  const dataUrl = await page.evaluate(() => window.__heroPoster!.png());
  const stats = await page.evaluate(() => ({
    calls: window.__heroPoster!.calls,
    triangles: window.__heroPoster!.triangles,
  }));
  await context.close();

  const png = Buffer.from(dataUrl.split(",")[1]!, "base64");
  const name = `maquette-${variant.theme}-${variant.frame}`;
  const base_ = sharp(png);
  const webp = await base_.clone().webp({ quality: 74, alphaQuality: 80, effort: 6 }).toBuffer();
  const avif = await base_.clone().avif({ quality: 52, effort: 6 }).toBuffer();
  writeFileSync(join(outDir, `${name}.webp`), webp);
  writeFileSync(join(outDir, `${name}.avif`), avif);

  for (const [format, buffer] of [["webp", webp], ["avif", avif]] as const) {
    const kb = buffer.length / 1024;
    const over = kb > variant.budgetKb;
    if (over) failed = true;
    report.push(
      `${name}.${format}  ${variant.width}x${variant.height}  ${kb.toFixed(1)} KB  (budget ${variant.budgetKb})${over ? "  OVER" : ""}`
    );
  }
  report.push(`  scene: ${stats.calls} draw calls, ${stats.triangles} triangles`);
}

await browser.close();
console.log(report.join("\n"));
if (failed) {
  console.error("\nAt least one poster is over its budget; lower the quality or simplify the scene.");
  process.exit(1);
}
