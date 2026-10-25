/**
 * The Motion lab (docs plan Phase 2): a sandbox on the public surface at `/lab/motion` where every
 * built effect runs for real. It cannot live in the admin because no animation library may be
 * imported from the admin (docs plan 6.1), so the System lab links to it. Development serves it
 * always; a production build serves it only with `MOTION_LAB=1` (the smoothness harness in CI).
 */
export function isMotionLabEnabled(
  env: Readonly<{ NODE_ENV?: string; MOTION_LAB?: string }> = process.env
): boolean {
  return env.NODE_ENV !== "production" || env.MOTION_LAB === "1";
}

/** Effects that have a live demo in the sandbox. `tests/unit/motion-registry.test.ts` keeps this in step with the registry. */
export const LAB_DEMO_IDS = [
  "M02",
  "M06",
  "M07",
  "M08",
  "M10",
  "M14",
  "M16",
  "M18",
  "M20",
  "M26",
  "M33",
] as const;
