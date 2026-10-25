"use client";

import { useEffect, type RefObject } from "react";

/** How far you must keep scrolling down, in px, before the header gets out of the way (M35). */
const HIDE_AFTER = 80;
const SHOW_AT_TOP = 80;
const UPWARD_INTENT = 4;

/**
 * The header gets out of the way after a fast scroll down and returns on upward intent (M35). It writes
 * `data-hidden` straight onto the element (no React state, so scrolling never re-renders the header),
 * never hides while keyboard focus is inside it or while something holds `locked`, and the CSS ignores
 * the attribute under reduced and off motion, so the header is always visible there.
 */
export function useHeaderHide(
  ref: RefObject<HTMLElement | null>,
  locked: boolean
) {
  useEffect(() => {
    const header = ref.current;
    if (!header) return;

    let lastY = window.scrollY;
    let travelled = 0;
    let frame = 0;

    const show = () => {
      travelled = 0;
      if (header.dataset.hidden) delete header.dataset.hidden;
    };
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      const delta = y - lastY;
      lastY = y;

      if (y < SHOW_AT_TOP || locked) return show();
      if (delta > 0) {
        travelled += delta;
        if (
          travelled >= HIDE_AFTER &&
          !header.contains(document.activeElement)
        ) {
          header.dataset.hidden = "true";
        }
      } else if (delta <= -UPWARD_INTENT) {
        show();
      }
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    header.addEventListener("focusin", show);
    return () => {
      window.removeEventListener("scroll", onScroll);
      header.removeEventListener("focusin", show);
      if (frame) window.cancelAnimationFrame(frame);
      show();
    };
  }, [ref, locked]);
}

/**
 * One indicator slides between the navigation links (M28): it rests under the current page and follows
 * hover and focus. It is positioned with CSS variables on the nav element, measured once per resize, so
 * moving it costs a transform and no layout.
 */
export function useNavIndicator(
  ref: RefObject<HTMLElement | null>,
  pathname: string
) {
  useEffect(() => {
    const nav = ref.current;
    if (!nav) return;
    const links = Array.from(
      nav.querySelectorAll<HTMLElement>("a[data-nav-link]")
    );

    const place = (link: HTMLElement | null) => {
      if (!link) {
        nav.style.setProperty("--ind-w", "0");
        return;
      }
      // The text, not the padding: 12 px of padding on each side
      nav.style.setProperty("--ind-x", `${link.offsetLeft + 12}px`);
      nav.style.setProperty(
        "--ind-w",
        String(Math.max(0, link.offsetWidth - 24))
      );
    };
    const current = () =>
      links.find((link) => link.getAttribute("aria-current") === "page") ??
      null;
    const rest = () => place(current());

    rest();
    // No sweep from the left edge on first placement
    const ready = window.requestAnimationFrame(() => {
      nav.dataset.indicator = "ready";
    });

    const cleanups = links.map((link) => {
      const enter = () => place(link);
      link.addEventListener("pointerenter", enter);
      link.addEventListener("focus", enter);
      link.addEventListener("pointerleave", rest);
      link.addEventListener("blur", rest);
      return () => {
        link.removeEventListener("pointerenter", enter);
        link.removeEventListener("focus", enter);
        link.removeEventListener("pointerleave", rest);
        link.removeEventListener("blur", rest);
      };
    });
    const observer = new ResizeObserver(rest);
    observer.observe(nav);

    return () => {
      window.cancelAnimationFrame(ready);
      cleanups.forEach((cleanup) => cleanup());
      observer.disconnect();
    };
  }, [ref, pathname]);
}
