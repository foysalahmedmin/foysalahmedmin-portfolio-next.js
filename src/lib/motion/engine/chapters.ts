import { gsap } from "gsap";
import { scrubLag } from "../tokens";
import type { Cleanup } from "./types";

const noop: Cleanup = () => undefined;

const FOCUS_SELECTOR = "[data-scroll-focus]";
const PROGRESS_SELECTOR = "[data-scroll-progress]";

/**
 * Scroll-linked chapter behaviours that need no component of their own. A chapter marks its server markup
 * with a data attribute and the engine (loaded after idle, absent for reduced, off and touch) binds it, so
 * the home route's initial JavaScript does not grow with each chapter:
 *
 *  - `data-scroll-focus` on a list, `data-focus-row` on each row (optionally `data-group`): the row that
 *    crosses the middle of the screen gets `data-active="true"`; the list gets `data-focus-index` and
 *    `data-focus-group`. The first row is active from the start and the last stays active at the end.
 *  - `data-scroll-progress` on any element: `--progress` (0 to 1, linear in scroll, smoothed by the scrub
 *    lag) while the element crosses the screen. `data-progress-range="top 80%,bottom 55%"` overrides the
 *    trigger positions.
 *
 * Without the engine nothing is bound: CSS must treat an unbound list as fully shown and an unbound
 * `--progress` as finished (engine.css sets `--progress: 1`).
 */
export type FocusController = Readonly<{
  activate(index: number): void;
  clear(): void;
}>;

/** Writes the active row onto the DOM; kept apart from the observer so it can be tested without a browser. */
export const createFocusController = (
  container: HTMLElement,
  rows: readonly HTMLElement[]
): FocusController => {
  let current = -1;
  return {
    activate(index) {
      if (index === current || index < 0 || index >= rows.length) return;
      current = index;
      rows.forEach((row, position) => {
        if (position === index) row.dataset.active = "true";
        else row.removeAttribute("data-active");
      });
      container.dataset.focusIndex = String(index);
      const group = rows[index]?.dataset.group;
      if (group) container.dataset.focusGroup = group;
      else container.removeAttribute("data-focus-group");
    },
    clear() {
      current = -1;
      rows.forEach((row) => row.removeAttribute("data-active"));
      container.removeAttribute("data-focus-index");
      container.removeAttribute("data-focus-group");
    },
  };
};

const bindFocus = (container: HTMLElement): Cleanup => {
  const rows = Array.from(
    container.querySelectorAll<HTMLElement>("[data-focus-row]")
  );
  if (rows.length === 0) return noop;

  const controller = createFocusController(container, rows);
  controller.activate(0);

  // A thin band across the middle of the screen: rows do not overlap, so one row crosses it at a time
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        controller.activate(rows.indexOf(entry.target as HTMLElement));
      }
    },
    { rootMargin: "-49% 0px -49% 0px", threshold: 0 }
  );
  rows.forEach((row) => observer.observe(row));

  return () => {
    observer.disconnect();
    controller.clear();
  };
};

const parseRange = (value: string | undefined): [string, string] => {
  const [start, end] = (value ?? "").split(",").map((part) => part.trim());
  return [start || "top 80%", end || "bottom 55%"];
};

const bindProgress = (element: HTMLElement): Cleanup => {
  const [start, end] = parseRange(element.dataset.progressRange);
  const state = { value: 0 };
  const write = () =>
    element.style.setProperty("--progress", state.value.toFixed(4));
  write();

  const tween = gsap.to(state, {
    value: 1,
    ease: "none",
    onUpdate: write,
    scrollTrigger: {
      trigger: element,
      start,
      end,
      scrub: scrubLag,
      invalidateOnRefresh: true,
    },
  });

  return () => {
    tween.scrollTrigger?.kill();
    tween.kill();
    element.style.removeProperty("--progress");
  };
};

/**
 * Binds every chapter marker in the document, now and as the page changes (a client navigation or a
 * streamed section adds markers later), and releases the ones that left the document.
 */
export function bindChapters(): Cleanup {
  const bound = new Map<Element, Cleanup>();

  const scan = () => {
    for (const [element, cleanup] of bound) {
      if (element.isConnected) continue;
      cleanup();
      bound.delete(element);
    }
    document
      .querySelectorAll<HTMLElement>(`${FOCUS_SELECTOR}, ${PROGRESS_SELECTOR}`)
      .forEach((element) => {
        if (bound.has(element)) return;
        const cleanups: Cleanup[] = [];
        if (element.matches(FOCUS_SELECTOR)) cleanups.push(bindFocus(element));
        if (element.matches(PROGRESS_SELECTOR))
          cleanups.push(bindProgress(element));
        bound.set(element, () => cleanups.forEach((cleanup) => cleanup()));
      });
  };
  scan();

  let frame = 0;
  const mutations = new MutationObserver(() => {
    if (frame) return;
    frame = window.requestAnimationFrame(() => {
      frame = 0;
      scan();
    });
  });
  mutations.observe(document.body, { childList: true, subtree: true });

  return () => {
    mutations.disconnect();
    if (frame) window.cancelAnimationFrame(frame);
    bound.forEach((cleanup) => cleanup());
    bound.clear();
  };
}
