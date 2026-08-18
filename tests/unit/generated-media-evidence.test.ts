import { PILLAR_KEYS, type PillarKey } from "@/lib/content/pillars";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

type GeneratedHeroAsset = Readonly<{
  asset_id: string;
  media_key: string;
  pillar: PillarKey;
  source: {
    local_path: string;
    raw_local_path: string;
    sha256: string;
    raw_sha256: string;
  };
  derivatives: {
    desktop_webp: {
      local_path: string;
      bytes: number;
      sha256: string;
      budget_gate: string;
    };
    mobile_webp: {
      local_path: string;
      bytes: number;
      sha256: string;
      budget_gate: string;
    };
    desktop_avif: {
      local_path: string;
      bytes: number;
      sha256: string;
      budget_gate: string;
    };
    mobile_avif: {
      local_path: string;
      bytes: number;
      sha256: string;
      budget_gate: string;
    };
  };
  review: {
    status: string;
    notes: string[];
  };
  editorial_metadata: {
    focal_point: { x: number; y: number };
    dominant_color: string;
    blur_data_url: string;
    alt_text: string;
    is_decorative: boolean;
  };
}>;

type GeneratedHeroEvidence = Readonly<{
  manifest_contract: string;
  prompt_contract: string;
  owner_feedback: { status: string };
  shared_gates: Record<string, string>;
  assets: GeneratedHeroAsset[];
}>;

const evidencePath = path.resolve(
  "docs/content/generated-media-evidence/hero-candidates.v1.json"
);

const readEvidence = (): GeneratedHeroEvidence =>
  JSON.parse(fs.readFileSync(evidencePath, "utf8")) as GeneratedHeroEvidence;

const sha256 = (relativePath: string): string =>
  createHash("sha256")
    .update(fs.readFileSync(path.resolve(relativePath)))
    .digest("hex");

const publicMirrorPath = (relativePath: string): string =>
  relativePath.replace(/^seed-assets\/heroes/, "public/images/heroes");

describe("generated hero media evidence", () => {
  it("documents the accepted candidate set without fake publication approval", () => {
    const evidence = readEvidence();

    expect(evidence.manifest_contract).toBe("portfolio-generated-media/1.0.0");
    expect(evidence.prompt_contract).toBe("architected-intelligence/1.0.0");
    expect(evidence.owner_feedback.status).toBe("accepted_for_continuation");
    expect(evidence.shared_gates.owner_visual_acceptance).toBe(
      "pass_candidate"
    );
    expect(evidence.shared_gates.avif_derivatives).toBe("pass_candidate");
    expect(evidence.shared_gates.manual_negative_prompt_review).toBe(
      "pass_candidate"
    );
    // A pillar without generated art yet is legitimate; it falls back to the
    // neutral hero. Evidence must never claim art that was not produced.
    const documented = evidence.assets.map((asset) => asset.pillar);
    expect(documented).toEqual(
      PILLAR_KEYS.filter((key) => documented.includes(key))
    );
    expect(new Set(documented).size).toBe(documented.length);
    expect(documented.length).toBeGreaterThan(0);

    for (const asset of evidence.assets) {
      expect(asset.review.status).toMatch(/^pass_candidate/);
      expect(asset.review.notes.join(" ")).toMatch(/No obvious/i);
      expect(asset.editorial_metadata.alt_text).toBe("");
      expect(asset.editorial_metadata.is_decorative).toBe(true);
      expect(asset.editorial_metadata.dominant_color).toMatch(
        /^#[0-9a-f]{6}$/i
      );
      expect(asset.editorial_metadata.blur_data_url).toMatch(
        /^data:image\/webp;base64,/
      );
      expect(asset.editorial_metadata.focal_point).toEqual({
        x: 0.72,
        y: 0.5,
      });
    }
  });

  it("keeps tracked seed assets and public preview mirrors checksum-aligned", () => {
    const evidence = readEvidence();

    for (const asset of evidence.assets) {
      const trackedFiles = [
        { path: asset.source.local_path, checksum: asset.source.sha256 },
        {
          path: asset.source.raw_local_path,
          checksum: asset.source.raw_sha256,
        },
        {
          path: asset.derivatives.desktop_webp.local_path,
          checksum: asset.derivatives.desktop_webp.sha256,
        },
        {
          path: asset.derivatives.mobile_webp.local_path,
          checksum: asset.derivatives.mobile_webp.sha256,
        },
        {
          path: asset.derivatives.desktop_avif.local_path,
          checksum: asset.derivatives.desktop_avif.sha256,
        },
        {
          path: asset.derivatives.mobile_avif.local_path,
          checksum: asset.derivatives.mobile_avif.sha256,
        },
      ];

      for (const file of trackedFiles) {
        expect(fs.existsSync(path.resolve(file.path))).toBe(true);
        expect(sha256(file.path)).toBe(file.checksum);
        expect(fs.existsSync(path.resolve(publicMirrorPath(file.path)))).toBe(
          true
        );
        expect(sha256(publicMirrorPath(file.path))).toBe(file.checksum);
      }

      expect(asset.derivatives.desktop_webp.budget_gate).toBe("pass");
      expect(asset.derivatives.mobile_webp.budget_gate).toBe("pass");
      expect(asset.derivatives.desktop_avif.budget_gate).toBe("pass");
      expect(asset.derivatives.mobile_avif.budget_gate).toBe("pass");
      expect(asset.derivatives.desktop_webp.bytes).toBeLessThanOrEqual(350_000);
      expect(asset.derivatives.mobile_webp.bytes).toBeLessThanOrEqual(200_000);
      expect(asset.derivatives.desktop_avif.bytes).toBeLessThanOrEqual(350_000);
      expect(asset.derivatives.mobile_avif.bytes).toBeLessThanOrEqual(200_000);
    }
  });
});
