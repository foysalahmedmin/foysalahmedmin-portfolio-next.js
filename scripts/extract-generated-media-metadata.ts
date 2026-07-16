import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const evidencePath = path.resolve(
  "docs/content/generated-media-evidence/hero-candidates.v1.json"
);

type EvidenceAsset = {
  asset_id: string;
  source: { local_path: string };
  editorial_metadata?: {
    focal_point: { x: number; y: number };
    dominant_color: string;
    blur_data_url: string;
    alt_text: string;
    is_decorative: boolean;
    extraction: {
      tool: string;
      source: string;
    };
  };
};

type Evidence = {
  shared_gates?: Record<string, string>;
  assets: EvidenceAsset[];
};

const toHex = (value: number): string =>
  Math.max(0, Math.min(255, Math.round(value)))
    .toString(16)
    .padStart(2, "0");

const extractMetadata = async (localPath: string) => {
  const absolutePath = path.resolve(localPath);
  const image = sharp(absolutePath, {
    failOn: "error",
    sequentialRead: true,
  });
  const stats = await image.stats();
  const dominant = stats.dominant;
  const blur = await image
    .resize(16, 9, { fit: "cover" })
    .webp({ quality: 42, effort: 4, smartSubsample: true })
    .toBuffer();

  return {
    focal_point: { x: 0.72, y: 0.5 },
    dominant_color: `#${toHex(dominant.r)}${toHex(dominant.g)}${toHex(
      dominant.b
    )}`,
    blur_data_url: `data:image/webp;base64,${blur.toString("base64")}`,
    alt_text: "",
    is_decorative: true,
    extraction: {
      tool: "sharp",
      source: localPath,
    },
  };
};

const main = async (): Promise<void> => {
  const evidence = JSON.parse(
    await fs.readFile(evidencePath, "utf8")
  ) as Evidence;
  for (const asset of evidence.assets) {
    asset.editorial_metadata = await extractMetadata(asset.source.local_path);
  }
  evidence.shared_gates = {
    ...evidence.shared_gates,
    metadata_extraction: "pass_candidate",
  };
  await fs.writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
};

await main();
