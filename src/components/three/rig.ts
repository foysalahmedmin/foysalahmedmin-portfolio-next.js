import { beatWeights } from "@/lib/motion/story";
import type { Frame } from "./frames";

export type Vec3 = [number, number, number];

/**
 * The camera for a moment in the story (docs plan 3.8): one keyframe per role, blended with the story
 * weights (hold 0.7, move 0.3, eased), so the camera glides from role to role and never cuts. Pure
 * numbers, so it is tested without three.
 */
export function blendCamera(frame: Frame, storyTime: number) {
  const weights = beatWeights(storyTime, frame.keys.length);
  const position: Vec3 = [0, 0, 0];
  const target: Vec3 = [0, 0, 0];
  frame.keys.forEach((key, index) => {
    const weight = weights[index]!;
    for (let axis = 0; axis < 3; axis += 1) {
      position[axis] = position[axis]! + key.position[axis]! * weight;
      target[axis] = target[axis]! + key.target[axis]! * weight;
    }
  });
  return { position, target, weights };
}

/** The pointer rig: the camera drifts by up to about a unit toward the pointer (tier 3, fine pointer). */
export function pointerOffset(
  pointerX: number,
  pointerY: number,
  strength = 1
) {
  return { x: pointerX * 0.9 * strength, y: -pointerY * 0.5 * strength };
}
