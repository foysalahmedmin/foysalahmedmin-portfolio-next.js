"use client";

import { getRevealVariantFromClassNames } from "@/lib/motion/reveal";
import { useMotion } from "@/providers/motion-provider";
import { useEffect } from "react";

const REVEAL_SELECTOR =
  "[data-reveal], .fade-up, .fade-down, .fade-left, .fade-right, .skew-up, .scale-in";

function getRevealElements(root: ParentNode): Element[] {
  const elements: Element[] = [];
  if (root instanceof Element && root.matches(REVEAL_SELECTOR)) {
    elements.push(root);
  }
  elements.push(...root.querySelectorAll(REVEAL_SELECTOR));
  return elements;
}

const AnimationApplier = () => {
  const { capability, effectiveMotion, hydrated, documentVisible } =
    useMotion();

  useEffect(() => {
    if (!hydrated) return;

    const shouldAnimate = effectiveMotion === "full" && capability !== "static";
    const observed = new WeakSet<Element>();

    const observer = shouldAnimate
      ? new IntersectionObserver(
          (entries) => {
            if (document.visibilityState !== "visible") return;

            for (const entry of entries) {
              const element = entry.target as HTMLElement;
              const repeat = element.dataset.revealRepeat === "true";

              if (entry.isIntersecting) {
                element.dataset.revealVisible = "true";
                if (!repeat) observer?.unobserve(element);
              } else if (repeat) {
                element.dataset.revealVisible = "false";
              }
            }
          },
          { rootMargin: "0px 0px -10%", threshold: 0.08 }
        )
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
        htmlElement.dataset.revealReady = "true";

        if (observer) {
          observer.observe(element);
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
      observer?.disconnect();
      mutationObserver.disconnect();
    };
  }, [capability, documentVisible, effectiveMotion, hydrated]);

  return null;
};

export default AnimationApplier;
