import type { gsap } from "gsap";
import type { ScrollTrigger } from "gsap/ScrollTrigger";
import type Lenis from "lenis";

/**
 * The shapes the rest of the app sees. Components import these types only (never the libraries),
 * so GSAP, ScrollTrigger, SplitText and Lenis stay in the deferred motion chunk
 * (docs plan 6.1, enforced by tests/unit/bundle-boundary.test.ts).
 */
export type Cleanup = () => void;

export type PointerSnapshot = Readonly<{
  /** Viewport coordinates of the last pointer event. */
  x: number;
  y: number;
  /** False until the pointer has moved once, and after it has left the window. */
  active: boolean;
}>;

export type ScrollToOptions = Readonly<{
  /** Extra offset in px (negative scrolls less far). The header offset is always applied. */
  offset?: number;
  immediate?: boolean;
  /** Move focus to the target heading when the scroll ends. */
  focus?: boolean;
}>;

export type CounterOptions = Readonly<{
  value: number;
  decimals: number;
  prefix: string;
  suffix: string;
  locale: string;
}>;

export type MagneticOptions = Readonly<{
  /** Fraction of the pointer offset the element follows (0 to 1). */
  strength: number;
  /** Extra reach around the element in px. */
  radius: number;
}>;

export type PinSceneOptions = Readonly<{
  /** Pin length in viewport heights (clamped to 100..300). */
  length: number;
  beats: number;
}>;

export type EngineBehaviors = {
  /** Masked line reveal of a heading (M02). Skips text that is already in view. */
  textReveal(element: HTMLElement): Cleanup;
  /** Count-up of a numeric span (M10), once, when it first enters the view. */
  counter(element: HTMLElement, options: CounterOptions): Cleanup;
  /** Pointer-following offset (M14) through `quickTo`, with no React work per pointer event. */
  magnetic(element: HTMLElement, options: MagneticOptions): Cleanup;
  /** Reticle that trails the pointer (M16). */
  cursor(element: HTMLElement): Cleanup;
  /** Pin a scene and drive `--pin-progress` and `data-beat` from scroll (3.7.4). */
  pinScene(element: HTMLElement, options: PinSceneOptions): Cleanup;
};

export type MotionEngine = Readonly<{
  gsap: typeof gsap;
  ScrollTrigger: typeof ScrollTrigger;
  /** Null when smooth scroll is not running. */
  lenis: Lenis | null;
  pointer(): PointerSnapshot;
  /** Called once per animation frame in which the pointer moved. */
  onPointer(listener: (pointer: PointerSnapshot) => void): Cleanup;
  /** Called after every ScrollTrigger refresh (sizes changed), so cached geometry can be re-measured. */
  onRefresh(listener: () => void): Cleanup;
  scrollTo(target: string | Element | number, options?: ScrollToOptions): void;
  /** One debounced `ScrollTrigger.refresh` (rule F10). */
  refresh(): void;
  stop(): void;
  start(): void;
  behaviors: EngineBehaviors;
  destroy(): void;
}>;

export type EngineStatus = "idle" | "loading" | "ready" | "failed" | "disabled";
