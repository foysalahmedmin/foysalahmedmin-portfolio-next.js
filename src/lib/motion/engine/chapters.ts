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

export type Anchor = Readonly<{ edge: number; screen: number }>;

const EDGES: Readonly<Record<string, number>> = {
  top: 0,
  center: 0.5,
  bottom: 1,
};

/** `"top 80%"`: the element's top edge (0), centre (0.5) or bottom edge (1) against a fraction of the screen. */
const parseAnchor = (value: string | undefined, fallback: Anchor): Anchor => {
  const match = /^(top|center|bottom)\s+(\d+(?:\.\d+)?)%$/.exec(
    (value ?? "").trim()
  );
  return match
    ? { edge: EDGES[match[1]!]!, screen: Number(match[2]) / 100 }
    : fallback;
};

/** 0 when the start anchor is reached, 1 at the end anchor, linear in scroll in between. */
export const progressFor = (
  top: number,
  height: number,
  viewport: number,
  start: Anchor,
  end: Anchor
): number => {
  const passed = viewport * start.screen - (top + height * start.edge);
  const length =
    height * (end.edge - start.edge) + viewport * (start.screen - end.screen);
  return length > 0 ? Math.min(1, Math.max(0, passed / length)) : 1;
};

export const parseRange = (value: string | undefined): [Anchor, Anchor] => {
  const [start, end] = (value ?? "").split(",");
  return [
    parseAnchor(start, { edge: 0, screen: 0.8 }),
    parseAnchor(end, { edge: 1, screen: 0.55 }),
  ];
};

/**
 * `--progress` from the element's own position, linear in scroll and eased toward the target with the
 * scrub lag. It deliberately does not use ScrollTrigger: a trigger makes ScrollTrigger refresh the page
 * (scroll to the top and back) whenever one is created or the page changes size, which moved a visitor who
 * had already scrolled far on a page that has no pinned scene. Reading the element's box once per frame,
 * only while it is near the screen, needs no refresh and cannot move the page.
 */
const bindProgress = (element: HTMLElement): Cleanup => {
  const [start, end] = parseRange(element.dataset.progressRange);
  let target = 0;
  let current = 0;
  let near = false;
  let frame = 0;
  let last = 0;

  const read = () => {
    const box = element.getBoundingClientRect();
    target = progressFor(box.top, box.height, window.innerHeight, start, end);
  };
  const write = () =>
    element.style.setProperty("--progress", current.toFixed(4));

  const tick = (time: number) => {
    frame = 0;
    const dt = Math.min(0.1, (time - last) / 1000 || 0.016);
    last = time;
    if (near) read();
    // Time constant of a third of the scrub lag: the value has caught up after about the lag
    current += (target - current) * (1 - Math.exp(-dt / (scrubLag / 3)));
    if (Math.abs(target - current) < 0.0005) current = target;
    write();
    if (near || current !== target) schedule();
  };
  const schedule = () => {
    if (!frame) frame = window.requestAnimationFrame(tick);
  };

  // Only measure while the element is within a screen of the viewport; beyond it the value is 0 or 1
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        near = entry.isIntersecting;
        if (!near) target = entry.boundingClientRect.top < 0 ? 1 : 0;
      }
      schedule();
    },
    { rootMargin: "100% 0px 100% 0px", threshold: 0 }
  );
  observer.observe(element);
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);
  read();
  current = target;
  write();

  return () => {
    observer.disconnect();
    window.removeEventListener("scroll", schedule);
    window.removeEventListener("resize", schedule);
    if (frame) window.cancelAnimationFrame(frame);
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
