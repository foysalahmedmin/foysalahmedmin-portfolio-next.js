"use client";

import { getRevealVariantFromClassNames } from "@/lib/motion/reveal";
import { useMotion } from "@/providers/motion-provider";
import { useEffect } from "react";

const REVEAL_SELECTOR =
  "[data-reveal], .fade-up, .fade-down, .fade-left, .fade-right, .skew-up, .scale-in";
const PREVIEW_MOTION_SELECTOR = "[data-preview-motion]";

function getRevealElements(root: ParentNode): Element[] {
  const elements: Element[] = [];
  if (root instanceof Element && root.matches(REVEAL_SELECTOR)) {
    elements.push(root);
  }
  elements.push(...root.querySelectorAll(REVEAL_SELECTOR));
  return elements;
}

/** Wipes play on a decoded image, so the reveal never stalls on a main-thread decode (rule F7). */
const decodeImages = (element: HTMLElement): Promise<unknown> =>
  Promise.all(
    Array.from(element.querySelectorAll("img")).map((image) =>
      image.decode ? image.decode().catch(() => undefined) : undefined
    )
  );

/**
 * Drives the declarative reveal (`data-reveal` and the legacy fade classes). The effect is additive:
 * the server HTML is complete and visible, and a block only gets its start pose once it is known to
 * start below the first screen, so nothing is hidden before JavaScript and the first screen never
 * replays.
 *
 * Which blocks are on the first screen is decided by an observer, not by measuring: reading
 * `getBoundingClientRect` for every block during hydration forces a synchronous layout inside the
 * hydration task (about +100 ms of blocking time on a throttled phone). The classifier observer
 * reports after the layout the browser does anyway.
 */
const AnimationApplier = () => {
  const { capability, effectiveMotion, hydrated, documentVisible } =
    useMotion();

  useEffect(() => {
    if (!hydrated) return;

    const canObserve = capability !== "static";
    const shouldAnimate = (element: Element) => {
      const previewScope = element.closest<HTMLElement>(
        PREVIEW_MOTION_SELECTOR
      );
      return (
        canObserve &&
        (previewScope
          ? previewScope.dataset.previewMotion === "normal"
          : effectiveMotion === "full")
      );
    };
    const observed = new WeakSet<Element>();

    const show = (element: HTMLElement) => {
      if (element.dataset.reveal === "wipe") {
        void decodeImages(element).then(() => {
          element.dataset.revealVisible = "true";
        });
      } else {
        element.dataset.revealVisible = "true";
      }
    };

    // Reveals a block as it enters the view (with the usual margin and threshold)
    const revealObserver = canObserve
      ? new IntersectionObserver(
          (entries) => {
            if (document.visibilityState !== "visible") return;

            for (const entry of entries) {
              const element = entry.target as HTMLElement;
              const repeat = element.dataset.revealRepeat === "true";

              if (entry.isIntersecting) {
                show(element);
                if (!repeat) revealObserver?.unobserve(element);
              } else if (repeat) {
                element.dataset.revealVisible = "false";
              }
            }
          },
          { rootMargin: "0px 0px -10%", threshold: 0.08 }
        )
      : null;

    // Decides once, per block, whether it starts on the first screen
    const classifier = canObserve
      ? new IntersectionObserver((entries) => {
          for (const entry of entries) {
            const element = entry.target as HTMLElement;
            classifier?.unobserve(element);
            const repeat = element.dataset.revealRepeat === "true";
            const forced = element.hasAttribute("data-reveal-force");
            const onScreen = entry.isIntersecting && !forced;

            // On screen already: leave it shown. A repeating or forced reveal is armed regardless.
            if (onScreen) element.dataset.revealVisible = "true";
            if (!onScreen || repeat) {
              element.dataset.revealReady = "true";
              revealObserver?.observe(element);
            }
          }
        })
      : null;

    const register = (root: ParentNode) => {
      for (const element of getRevealElements(root)) {
        if (observed.has(element)) continue;
        observed.add(element);

        const htmlElement = element as HTMLElement;
        if (!htmlElement.dataset.reveal) {
          htmlElement.dataset.reveal =
            getRevealVariantFromClassNames(htmlElement.classList) ?? "fade";
        }

        if (classifier && shouldAnimate(element)) {
          classifier.observe(element);
        } else {
          htmlElement.dataset.revealVisible = "true";
        }
      }
    };

    register(document.body);

    const mutationObserver = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node instanceof Element) register(node);
        }
      }
    });

    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      revealObserver?.disconnect();
      classifier?.disconnect();
      mutationObserver.disconnect();
    };
  }, [capability, documentVisible, effectiveMotion, hydrated]);

  return null;
};

export default AnimationApplier;
