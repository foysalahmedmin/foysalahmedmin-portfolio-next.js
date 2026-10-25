import { gsap } from "gsap";
import { SplitText } from "gsap/SplitText";
import { formatCount } from "../counter";
import { dur, easeFn, scrubLag, staggerLine } from "../tokens";
import type {
  Cleanup,
  CounterOptions,
  EngineBehaviors,
  MagneticOptions,
  PinSceneOptions,
  PointerSnapshot,
} from "./types";

const noop: Cleanup = () => undefined;
const seconds = (ms: number) => ms / 1000;

/** First-screen content is never hidden or replayed (docs plan 3.7, rule 5). */
const isInView = (element: Element): boolean => {
  const rect = element.getBoundingClientRect();
  return rect.bottom > 0 && rect.top < window.innerHeight * 0.9;
};

type BehaviorHost = Readonly<{
  onPointer(listener: (pointer: PointerSnapshot) => void): Cleanup;
  onRefresh(listener: () => void): Cleanup;
  refresh(): void;
}>;

let activePins = 0;
const MAX_PINS = 3;

export function createBehaviors(host: BehaviorHost): EngineBehaviors {
  return {
    textReveal(element) {
      if (isInView(element)) return noop;

      let cancelled = false;
      let split: SplitText | null = null;
      let tween: gsap.core.Animation | null = null;

      // Lines depend on the final font metrics, so split only after fonts are ready
      void (document.fonts?.ready ?? Promise.resolve()).then(() => {
        if (cancelled || isInView(element)) return;
        split = SplitText.create(element, {
          type: "lines",
          mask: "lines",
          linesClass: "t-line",
          // Spans keep the split valid inside a paragraph. The text stays ordinary text for assistive
          // technology: SplitText's own `aria-label` is not allowed on a paragraph or span.
          tag: "span",
          aria: "none",
          autoSplit: true,
          onSplit(self: SplitText) {
            gsap.set(self.lines, { yPercent: 110 });
            tween?.kill();
            tween = gsap.to(self.lines, {
              yPercent: 0,
              duration: seconds(dur.slow),
              ease: easeFn.signal,
              stagger: seconds(staggerLine),
              scrollTrigger: {
                trigger: element,
                start: "top 88%",
                once: true,
              },
              // Back to the original text: the end frame is exactly the server render, and the line
              // masks (which would clip tight descenders) do not outlive the animation
              onComplete: () => {
                self.revert();
                self.kill();
              },
            });
            return tween;
          },
        });
      });

      return () => {
        cancelled = true;
        tween?.scrollTrigger?.kill();
        tween?.kill();
        split?.revert();
        split?.kill();
      };
    },

    counter(element, options: CounterOptions) {
      if (isInView(element)) return noop;

      const format = {
        decimals: options.decimals,
        prefix: options.prefix,
        suffix: options.suffix,
        locale: options.locale,
      };
      // Reserve the final width so digits changing never move the line (CLS)
      const finalText =
        element.textContent ?? formatCount(options.value, format);
      element.style.minInlineSize = `${element.getBoundingClientRect().width}px`;
      element.textContent = formatCount(0, format);

      const progress = { value: 0 };
      const tween = gsap.to(progress, {
        value: options.value,
        duration: seconds(dur.slow),
        ease: easeFn.settle,
        onUpdate() {
          element.textContent = formatCount(progress.value, format);
        },
        onComplete() {
          element.textContent = finalText;
          element.style.minInlineSize = "";
        },
        scrollTrigger: { trigger: element, start: "top 90%", once: true },
      });

      return () => {
        tween.scrollTrigger?.kill();
        tween.kill();
        element.textContent = finalText;
        element.style.minInlineSize = "";
      };
    },

    magnetic(element, options: MagneticOptions) {
      const xTo = gsap.quickTo(element, "x", {
        duration: 0.5,
        ease: easeFn.signal,
      });
      const yTo = gsap.quickTo(element, "y", {
        duration: 0.5,
        ease: easeFn.signal,
      });

      // F2: geometry is measured once and again after a refresh, never inside the pointer callback.
      // Stored in document coordinates so scrolling does not invalidate it.
      let box = { left: 0, top: 0, width: 0, height: 0 };
      const measure = () => {
        gsap.set(element, { x: 0, y: 0 });
        const rect = element.getBoundingClientRect();
        box = {
          left: rect.left + window.scrollX,
          top: rect.top + window.scrollY,
          width: rect.width,
          height: rect.height,
        };
      };
      measure();

      const stopRefresh = host.onRefresh(measure);
      const stopPointer = host.onPointer((pointer) => {
        const x = pointer.x + window.scrollX;
        const y = pointer.y + window.scrollY;
        const centreX = box.left + box.width / 2;
        const centreY = box.top + box.height / 2;
        const inside =
          pointer.active &&
          x > box.left - options.radius &&
          x < box.left + box.width + options.radius &&
          y > box.top - options.radius &&
          y < box.top + box.height + options.radius;
        xTo(inside ? (x - centreX) * options.strength : 0);
        yTo(inside ? (y - centreY) * options.strength : 0);
      });

      return () => {
        stopPointer();
        stopRefresh();
        gsap.killTweensOf(element);
        gsap.set(element, { clearProps: "transform" });
      };
    },

    cursor(element) {
      const xTo = gsap.quickTo(element, "x", {
        duration: seconds(dur.micro),
        ease: "none",
      });
      const yTo = gsap.quickTo(element, "y", {
        duration: seconds(dur.micro),
        ease: "none",
      });
      const interactive =
        'a[href], button, [role="button"], summary, label, [data-cursor]';
      const field = "input, textarea, select, [contenteditable='true']";

      const setState = (state: string) => {
        if (element.dataset.cursorState !== state) {
          element.dataset.cursorState = state;
        }
      };
      const onOver = (event: PointerEvent) => {
        const target = event.target instanceof Element ? event.target : null;
        if (target?.closest(field)) setState("field");
        else if (target?.closest(interactive)) setState("link");
        else setState("idle");
      };
      document.addEventListener("pointerover", onOver, { passive: true });

      setState("idle");
      element.dataset.cursorVisible = "false";
      const stopPointer = host.onPointer((pointer) => {
        element.dataset.cursorVisible = String(pointer.active);
        xTo(pointer.x);
        yTo(pointer.y);
      });

      return () => {
        stopPointer();
        document.removeEventListener("pointerover", onOver);
        gsap.killTweensOf(element);
        element.removeAttribute("data-cursor-visible");
        element.removeAttribute("data-cursor-state");
        gsap.set(element, { clearProps: "transform" });
      };
    },

    pinScene(element, options: PinSceneOptions) {
      const length = Math.min(300, Math.max(100, options.length));
      const beats = Math.max(1, Math.floor(options.beats));

      if (activePins >= MAX_PINS && process.env.NODE_ENV !== "production") {
        console.warn(
          `[motion] More than ${MAX_PINS} pinned scenes are active; the plan caps the page at ${MAX_PINS} (docs plan 3.7).`
        );
      }
      activePins += 1;

      // The pin is CSS `position: sticky` on a stage inside a track that is `length` screens taller
      // than one screen (engine.css). ScrollTrigger only reads progress. It does not move the
      // element, because a ScrollTrigger pin switches the element to `position: fixed`, which
      // browsers report as a full-screen layout shift every time a pin starts or ends.
      element.style.setProperty("--pin-length", String(length));
      element.dataset.pinned = "true";

      const beatElements = Array.from(
        element.querySelectorAll<HTMLElement>("[data-pin-beat]")
      );
      const state = { progress: 0 };
      let beat = -1;
      const write = () => {
        element.style.setProperty("--pin-progress", state.progress.toFixed(4));
        element.style.setProperty(
          "--pin-position",
          (state.progress * beats).toFixed(4)
        );
        const next = Math.min(beats - 1, Math.floor(state.progress * beats));
        if (next !== beat) {
          beat = next;
          element.dataset.beat = String(next);
          // Beats that are off stage take no focus and no clicks while the scene is pinned
          for (const item of beatElements) {
            item.toggleAttribute(
              "inert",
              item.dataset.pinBeat !== String(next)
            );
          }
        }
      };
      write();

      // Late media changes the track's geometry; refresh once when it has loaded (F10)
      const media = Array.from(element.querySelectorAll("img, video"));
      const onLoad = () => host.refresh();
      media.forEach((item) =>
        item.addEventListener("load", onLoad, { once: true })
      );

      // Progress is linear in scroll; the smoothing is the scrub lag, never an eased curve
      const tween = gsap.to(state, {
        progress: 1,
        ease: "none",
        onUpdate: write,
        scrollTrigger: {
          trigger: element,
          start: "top top",
          end: "bottom bottom",
          scrub: scrubLag,
          invalidateOnRefresh: true,
        },
      });

      return () => {
        activePins = Math.max(0, activePins - 1);
        media.forEach((item) => item.removeEventListener("load", onLoad));
        tween.scrollTrigger?.kill();
        tween.kill();
        element.removeAttribute("data-pinned");
        element.removeAttribute("data-beat");
        for (const item of beatElements) item.removeAttribute("inert");
        element.style.removeProperty("--pin-length");
        element.style.removeProperty("--pin-progress");
        element.style.removeProperty("--pin-position");
        host.refresh();
      };
    },
  };
}
