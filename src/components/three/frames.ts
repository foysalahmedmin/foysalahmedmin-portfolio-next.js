/**
 * Camera framing (docs plan 3.8). The poster and the live canvas must show the same composition at any
 * viewport size, or the cross-fade would jump. Both are the same virtual frame (one fixed aspect ratio
 * per orientation) cropped to the viewport the way CSS `object-fit: cover` crops an image, so the
 * canvas uses a camera view offset that selects exactly the part of the virtual frame the poster
 * shows. The scene sits in the right of the landscape frame so the copy keeps the left half.
 */
export type FrameName = "landscape" | "portrait";

export type Frame = Readonly<{
  name: FrameName;
  /** Width over height of the virtual frame (and the poster image). */
  aspect: number;
  /** Vertical field of view in degrees. */
  fov: number;
  /** Horizontal shift of the scene inside the frame, as a fraction of the frame width (positive moves it right). */
  shiftX: number;
  /** Vertical shift as a fraction of the frame height (positive moves it down). */
  shiftY: number;
  /** One camera keyframe per role beat. */
  keys: ReadonlyArray<
    Readonly<{
      position: readonly [number, number, number];
      target: readonly [number, number, number];
    }>
  >;
}>;

export const FRAMES: Readonly<Record<FrameName, Frame>> = {
  landscape: {
    name: "landscape",
    aspect: 16 / 9,
    fov: 30,
    shiftX: 0.14,
    shiftY: -0.02,
    keys: [
      { position: [3.6, 14.5, 25], target: [2.4, 0.2, 0.2] },
      { position: [-1.5, 8.5, 14.5], target: [-0.6, 0.5, 0] },
      { position: [9.2, 6.2, 12.5], target: [6.3, 0.6, 1.2] },
    ],
  },
  portrait: {
    name: "portrait",
    aspect: 9 / 16,
    fov: 38,
    shiftX: 0,
    shiftY: 0.12,
    keys: [
      { position: [-1.2, 12, 20], target: [-1.6, 0.2, 0.2] },
      { position: [-1.2, 8.5, 15.5], target: [-0.6, 0.5, 0] },
      { position: [6.8, 7, 14], target: [6.3, 0.6, 1.2] },
    ],
  },
};

/** Landscape when wider than tall, portrait otherwise (the same test as the CSS `orientation: landscape` media query). */
export const frameFor = (width: number, height: number): Frame =>
  width > height ? FRAMES.landscape : FRAMES.portrait;

/**
 * The view offset (in CSS pixels of the viewport) that crops the virtual frame like `object-fit:
 * cover`: returns the size of the virtual frame at that scale and the sub-rectangle to show.
 */
export function coverView(frame: Frame, width: number, height: number) {
  const viewportAspect = width / height;
  const fullWidth =
    viewportAspect >= frame.aspect ? width : height * frame.aspect;
  const fullHeight =
    viewportAspect >= frame.aspect ? width / frame.aspect : height;
  return {
    fullWidth,
    fullHeight,
    x: (fullWidth - width) / 2 - frame.shiftX * fullWidth,
    y: (fullHeight - height) / 2 - frame.shiftY * fullHeight,
    width,
    height,
  };
}
