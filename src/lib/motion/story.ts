/**
 * The scroll story clock (docs plan 3.7.4, M36). A story has N beats; each beat holds for 0.7 of a unit
 * and changes into the next over 0.3, and nothing changes after the last. So a story of N beats is
 * N - 0.3 units long (2.7 for the three role beats), and scroll progress 0..1 maps linearly onto it.
 * The pin behaviour, the hero copy (in CSS) and the 3D camera all read the same clock, so the title,
 * the capability lines and the camera move together.
 */
export const HOLD = 0.7;
export const CHANGE = 0.3;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const smoothstep = (edge0: number, edge1: number, x: number): number => {
  const k = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return k * k * (3 - 2 * k);
};

/** Length of a story in units. */
export const storyLength = (beats: number): number =>
  Math.max(1, Math.floor(beats)) - CHANGE;

/** Story time for a scroll progress in 0..1. */
export const storyTime = (progress: number, beats: number): number =>
  clamp(Number.isFinite(progress) ? progress : 0, 0, 1) * storyLength(beats);

/** The beat that is on stage: the changeover is centred on the end of each hold, `i + 0.85`. */
export const activeBeat = (time: number, beats: number): number =>
  clamp(
    Math.floor(time + (1 - HOLD) / 2),
    0,
    Math.max(1, Math.floor(beats)) - 1
  );

/**
 * How much of each beat is on stage, summing to 1: beat i is full from its start until `i + HOLD`,
 * then hands over to beat i + 1 with a smooth step across `CHANGE`.
 */
export const beatWeights = (time: number, beats: number): number[] => {
  const count = Math.max(1, Math.floor(beats));
  const handover = Array.from({ length: count - 1 }, (_, index) =>
    smoothstep(index + HOLD, index + 1, time)
  );
  return Array.from({ length: count }, (_, index) => {
    const arriving = index === 0 ? 1 : handover[index - 1]!;
    const leaving = index === count - 1 ? 0 : handover[index]!;
    return arriving * (1 - leaving);
  });
};
