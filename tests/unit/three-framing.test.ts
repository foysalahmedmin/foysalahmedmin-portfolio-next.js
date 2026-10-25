import { coverView, FRAMES, frameFor } from "@/components/three/frames";
import { SCENE_LABELS } from "@/components/three/labels";
import { QUALITY } from "@/components/three/quality";
import { blendCamera, pointerOffset } from "@/components/three/rig";
import { describe, expect, it } from "vitest";

describe("framing", () => {
  it("is landscape only when wider than tall, the same test as the CSS orientation query", () => {
    expect(frameFor(1440, 900).name).toBe("landscape");
    expect(frameFor(900, 1440).name).toBe("portrait");
    expect(frameFor(800, 800).name).toBe("portrait");
  });

  it("crops the virtual frame like object-fit: cover, so the poster and the canvas agree", () => {
    const frame = FRAMES.landscape;
    // A viewport of exactly the frame's aspect shows the whole frame, shifted by the composition offset
    const exact = coverView(frame, 1920, 1080);
    expect(exact.fullWidth).toBeCloseTo(1920, 6);
    expect(exact.fullHeight).toBeCloseTo(1080, 6);
    expect(exact.x).toBeCloseTo(-frame.shiftX * 1920, 6);

    // Wider than the frame: width is matched, the frame is taller than the viewport and crops top and bottom
    const wide = coverView(frame, 2400, 900);
    expect(wide.fullWidth).toBe(2400);
    expect(wide.fullHeight).toBeCloseTo(2400 / frame.aspect, 6);
    expect(wide.fullHeight).toBeGreaterThanOrEqual(900);

    // Taller than the frame: height is matched, the frame is wider and crops the sides
    const tall = coverView(frame, 1000, 900);
    expect(tall.fullHeight).toBe(900);
    expect(tall.fullWidth).toBeCloseTo(900 * frame.aspect, 6);
    expect(tall.fullWidth).toBeGreaterThanOrEqual(1000);
  });

  it("the shown rectangle always lies inside the virtual frame's cover size", () => {
    for (const [width, height] of [
      [1920, 1080],
      [1280, 720],
      [2560, 1080],
      [1024, 1366],
      [390, 844],
      [820, 1180],
    ] as const) {
      const frame = frameFor(width, height);
      const view = coverView(frame, width, height);
      expect(view.fullWidth).toBeGreaterThanOrEqual(width - 1e-6);
      expect(view.fullHeight).toBeGreaterThanOrEqual(height - 1e-6);
      // The frame's own aspect is preserved
      expect(view.fullWidth / view.fullHeight).toBeCloseTo(frame.aspect, 6);
    }
  });
});

describe("camera rig", () => {
  it("rests on the first keyframe at the start and the last at the end of the story", () => {
    for (const frame of Object.values(FRAMES)) {
      const start = blendCamera(frame, 0);
      expect(start.position).toEqual([...frame.keys[0]!.position]);
      expect(start.target).toEqual([...frame.keys[0]!.target]);
      const end = blendCamera(frame, 2.7);
      expect(end.position).toEqual([...frame.keys[2]!.position]);
    }
  });

  it("holds a keyframe for 0.7 and glides between keyframes without ever cutting", () => {
    const frame = FRAMES.landscape;
    expect(blendCamera(frame, 0.69).position).toEqual([
      ...frame.keys[0]!.position,
    ]);
    expect(blendCamera(frame, 1.0).position).toEqual([
      ...frame.keys[1]!.position,
    ]);

    // Between two keyframes no step is larger than a fraction of the distance between them
    const distance = (a: number[], b: number[]) =>
      Math.hypot(...a.map((value, index) => value - b[index]!));
    const total = distance(
      [...frame.keys[0]!.position],
      [...frame.keys[1]!.position]
    );
    let previous = blendCamera(frame, 0.7).position;
    for (let step = 1; step <= 30; step += 1) {
      const next = blendCamera(frame, 0.7 + step * 0.01).position;
      expect(distance(previous, next)).toBeLessThan(total * 0.12);
      previous = next;
    }
  });

  it("drifts toward the pointer by about a unit and no more", () => {
    const corner = pointerOffset(1, 1);
    expect(Math.hypot(corner.x, corner.y)).toBeLessThan(1.2);
    expect(pointerOffset(0, 0)).toEqual({ x: 0, y: -0 });
    expect(pointerOffset(1, 0, 0).x).toBe(0);
  });
});

describe("scene data", () => {
  it("has a label for every role beat, each with text", () => {
    for (const role of [0, 1, 2] as const) {
      expect(
        SCENE_LABELS.filter((label) => label.role === role).length
      ).toBeGreaterThanOrEqual(3);
    }
    expect(new Set(SCENE_LABELS.map((label) => label.id)).size).toBe(
      SCENE_LABELS.length
    );
    for (const label of SCENE_LABELS) expect(label.text.trim()).not.toBe("");
  });

  it("the simplified quality is cheaper than the full one in every way that costs", () => {
    expect(QUALITY.simplified.maxPixelRatio).toBeLessThan(
      QUALITY.full.maxPixelRatio
    );
    expect(QUALITY.simplified.shadowMapSize).toBeLessThan(
      QUALITY.full.shadowMapSize
    );
    expect(QUALITY.simplified.segments).toBeLessThan(QUALITY.full.segments);
    expect(QUALITY.simplified.trail).toBeLessThan(QUALITY.full.trail);
    expect(QUALITY.simplified.fpsCap).toBe(30);
    expect(QUALITY.full.fpsCap).toBeNull();
    expect(QUALITY.simplified.antialias).toBe(false);
    expect(QUALITY.simplified.pointerRig).toBe(false);
  });
});
