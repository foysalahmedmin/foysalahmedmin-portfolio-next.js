import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const evidencePath = path.resolve(
  "docs/content/generated-media-evidence/hero-candidates.v1.json"
);

const DESKTOP_AVIF_QUALITY = 55;
const MOBILE_AVIF_QUALITY = 52;
const DESKTOP_BUDGET_BYTES = 350_000;
const MOBILE_BUDGET_BYTES = 200_000;

type DerivativeRecord = {
  local_path: string;
  width: number;
  height: number;
  quality: number;
  bytes: number;
  sha256: string;
  budget_gate: "pass" | "fail";
};

type EvidenceAsset = {
  asset_id: string;
  derivatives: {
    desktop_webp: DerivativeRecord;
    mobile_webp: DerivativeRecord;
    desktop_avif?: DerivativeRecord;
    mobile_avif?: DerivativeRecord;
  };
};

type Evidence = {
  shared_gates?: Record<string, string>;
  assets: EvidenceAsset[];
};

const publicMirrorPath = (relativePath: string): string =>
  relativePath.replace(/^seed-assets\/heroes/, "public/images/heroes");

const sha256 = (buffer: Buffer): string =>
  createHash("sha256").update(buffer).digest("hex");

const desktopPngPath = (webpPath: string): string =>
  webpPath.replace(/\.q\d+\.webp$/, ".png");

const mobilePngPath = (webpPath: string): string =>
  webpPath.replace(/\.mobile\.q\d+\.webp$/, ".mobile-crop.png");

const avifOutputPath = (webpPath: string, quality: number): string =>
  webpPath.replace(/\.q\d+\.webp$/, `.q${quality}.avif`);

const exportAvif = async ({
  inputPath,
  outputPath,
  quality,
  budgetBytes,
}: {
  inputPath: string;
  outputPath: string;
  quality: number;
  budgetBytes: number;
}): Promise<DerivativeRecord> => {
  const absoluteOutput = path.resolve(outputPath);
  await fs.mkdir(path.dirname(absoluteOutput), { recursive: true });
  const buffer = await sharp(path.resolve(inputPath), {
    failOn: "error",
    sequentialRead: true,
  })
    .avif({ quality, effort: 6 })
    .toBuffer();
  await fs.writeFile(absoluteOutput, buffer);

  const metadata = await sharp(buffer, { failOn: "error" }).metadata();
  const publicPath = publicMirrorPath(outputPath);
  await fs.mkdir(path.dirname(path.resolve(publicPath)), { recursive: true });
  await fs.writeFile(path.resolve(publicPath), buffer);

  return {
    local_path: outputPath,
    width: metadata.width ?? 0,
    height: metadata.height ?? 0,
    quality,
    bytes: buffer.byteLength,
    sha256: sha256(buffer),
    budget_gate: buffer.byteLength <= budgetBytes ? "pass" : "fail",
  };
};

const main = async (): Promise<void> => {
  const evidence = JSON.parse(
    await fs.readFile(evidencePath, "utf8")
  ) as Evidence;

  for (const asset of evidence.assets) {
    asset.derivatives.desktop_avif = await exportAvif({
      inputPath: desktopPngPath(asset.derivatives.desktop_webp.local_path),
      outputPath: avifOutputPath(
        asset.derivatives.desktop_webp.local_path,
        DESKTOP_AVIF_QUALITY
      ),
      quality: DESKTOP_AVIF_QUALITY,
      budgetBytes: DESKTOP_BUDGET_BYTES,
    });
    asset.derivatives.mobile_avif = await exportAvif({
      inputPath: mobilePngPath(asset.derivatives.mobile_webp.local_path),
      outputPath: avifOutputPath(
        asset.derivatives.mobile_webp.local_path,
        MOBILE_AVIF_QUALITY
      ),
      quality: MOBILE_AVIF_QUALITY,
      budgetBytes: MOBILE_BUDGET_BYTES,
    });
  }

  evidence.shared_gates = {
    ...evidence.shared_gates,
    avif_derivatives: "pass_candidate",
  };

  await fs.writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
};

await main();
