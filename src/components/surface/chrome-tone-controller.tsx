"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

type BandTone = "ink" | "paper" | "invert";

const isDark = () => document.documentElement.classList.contains("dark");

const resolveTone = (tone: BandTone): "ink" | "paper" => {
  if (tone === "invert") return isDark() ? "paper" : "ink";
  return tone;
};

const readTone = (band: Element): BandTone => {
  const value = band.getAttribute("data-tone");
  return value === "paper" || value === "invert" ? value : "ink";
};

/**
 * Chrome tone (docs plan 3.2): fixed glass such as the header, trace rail and dock adopts the tone of
 * the band beneath it, otherwise dark glass over a paper band is unreadable.
 *
 * Bands are `[data-band]` elements (the page templates render them); chrome is any `[data-chrome]`
 * element. For every chrome element an IntersectionObserver watches a one-pixel line through the
 * element's vertical centre and sets `data-tone` on it directly, so scrolling never touches React state.
 * With no band under the line the attribute is removed and the chrome follows the page theme.
 */
export function ChromeToneController() {
  const pathname = usePathname();

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    let mutation: MutationObserver | null = null;
    let raf = 0;

    const setup = () => {
      observers.splice(0).forEach((observer) => observer.disconnect());
      const bands = Array.from(
        document.querySelectorAll<HTMLElement>("[data-band]")
      );
      const chromes = Array.from(
        document.querySelectorAll<HTMLElement>("[data-chrome]")
      );
      if (!bands.length || !chromes.length) {
        chromes.forEach((chrome) => chrome.removeAttribute("data-tone"));
        return;
      }

      for (const chrome of chromes) {
        const rect = chrome.getBoundingClientRect();
        const lineY = Math.round(rect.top + rect.height / 2);
        const viewport = window.innerHeight;
        const under = new Set<Element>();

        const apply = () => {
          const active = bands.find((band) => under.has(band));
          if (!active) {
            chrome.removeAttribute("data-tone");
            return;
          }
          chrome.setAttribute("data-tone", resolveTone(readTone(active)));
        };

        const observer = new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (entry.isIntersecting) under.add(entry.target);
              else under.delete(entry.target);
            }
            apply();
          },
          {
            rootMargin: `${-lineY}px 0px ${-(viewport - lineY - 1)}px 0px`,
            threshold: 0,
          }
        );
        bands.forEach((band) => observer.observe(band));
        observers.push(observer);

        // Re-resolve when the theme flips (an "invert" band changes meaning)
        (chrome as HTMLElement & { __applyTone?: () => void }).__applyTone =
          apply;
      }
    };

    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(setup);
    };

    setup();
    window.addEventListener("resize", schedule, { passive: true });
    window.addEventListener("load", schedule, { once: true });
    mutation = new MutationObserver(() => {
      document
        .querySelectorAll<
          HTMLElement & { __applyTone?: () => void }
        >("[data-chrome]")
        .forEach((chrome) => chrome.__applyTone?.());
    });
    mutation.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("load", schedule);
      mutation?.disconnect();
      observers.forEach((observer) => observer.disconnect());
      document
        .querySelectorAll("[data-chrome]")
        .forEach((chrome) => chrome.removeAttribute("data-tone"));
    };
  }, [pathname]);

  return null;
}
