import type { Color } from "three";
import {
  AdditiveBlending,
  MeshStandardMaterial,
  NormalBlending,
  ShadowMaterial,
  type MeshBasicMaterial,
  type SpriteMaterial,
} from "three";

/**
 * Greyscale PBR (docs plan 3.8). Dark theme: bodies in the 800 to 900 range, edges and conduits
 * around 300 to 400, pulses emissive white. Light theme: the same scene as matte clay (bodies 100 to
 * 200) with ink conduits and an ink pulse. No hue anywhere.
 */
export function createMaterials() {
  return {
    body: new MeshStandardMaterial({
      color: 0x2a2a2a,
      roughness: 0.42,
      metalness: 0.15,
    }),
    edge: new MeshStandardMaterial({
      color: 0x454545,
      roughness: 0.5,
      metalness: 0.1,
      emissive: 0xffffff,
      emissiveIntensity: 0,
    }),
    core: new MeshStandardMaterial({
      color: 0x9a9a9a,
      roughness: 0.35,
      metalness: 0.05,
      emissive: 0xffffff,
      emissiveIntensity: 0,
    }),
    floor: new ShadowMaterial({ opacity: 0.5 }),
  };
}

export type SceneMaterials = ReturnType<typeof createMaterials>;

export type ThemedParts = Readonly<{
  materials: SceneMaterials;
  gridMaterial: { color: Color; opacity: number };
  pulseSprites: readonly SpriteMaterial[];
  dot: MeshBasicMaterial;
  packets: MeshBasicMaterial;
  ring: MeshBasicMaterial;
  keyLight: { intensity: number };
  scene: { environmentIntensity: number };
}>;

export function applyTheme(parts: ThemedParts, light: boolean) {
  const {
    materials,
    pulseSprites,
    dot,
    packets,
    ring,
    keyLight,
    scene,
    gridMaterial,
  } = parts;
  materials.body.color.set(light ? 0xd4d4d4 : 0x2c2c2c);
  materials.core.color.set(light ? 0x4a4a4a : 0x9a9a9a);
  keyLight.intensity = light ? 1.55 : 2.4;
  scene.environmentIntensity = light ? 0.5 : 0.55;
  materials.floor.opacity = light ? 0.3 : 0.5;

  const ink = light ? 0x0a0a0a : 0xffffff;
  materials.edge.emissive.set(ink);
  gridMaterial.color.set(ink);
  dot.color.set(ink);
  packets.color.set(ink);
  ring.color.set(ink);
  for (const sprite of pulseSprites) {
    // Additive light on ink; plain ink on clay
    sprite.blending = light ? NormalBlending : AdditiveBlending;
    sprite.color.set(ink);
    sprite.needsUpdate = true;
  }
}
