import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { easeFn } from "../tokens";
import type { Cleanup, ScrollToOptions } from "./types";

const REFRESH_DEBOUNCE_MS = 250;
const REFRESH_SETTLE_MS = 300;

type ScrollController = Readonly<{
  lenis: Lenis | null;
  scrollTo(target: string | Element | number, options?: ScrollToOptions): void;
  refresh(): void;
  onRefresh(listener: () => void): Cleanup;
  stop(): void;
  start(): void;
  destroy(): void;
}>;

const readHeaderOffset = (): number => {
  const value = Number.parseFloat(
    getComputedStyle(document.documentElement).scrollPaddingTop
  );
  return Number.isFinite(value) ? value : 0;
};

const resolveTarget = (target: string | Element): HTMLElement | null => {
  if (typeof target !== "string") return target as HTMLElement;
  const id = target.startsWith("#") ? target.slice(1) : target;
  try {
    return document.getElementById(decodeURIComponent(id));
  } catch {
    return null;
  }
};

/** Move focus to the destination so keyboard and screen-reader users land where the page scrolled. */
const focusTarget = (element: HTMLElement) => {
  if (
    !element.hasAttribute("tabindex") &&
    !element.matches("a, button, input, select, textarea")
  ) {
    element.setAttribute("tabindex", "-1");
  }
  element.focus({ preventScroll: true });
};

/**
 * Smooth scroll on the single GSAP clock (docs plan 3.7.1, "one clock"): Lenis is advanced from the
 * GSAP ticker, ScrollTrigger is updated from Lenis, and nothing else owns a frame loop.
 * Native scroll position is never replaced, so find-in-page, anchors and keyboard scrolling keep working.
 */
export function createScroll(options: { smooth: boolean }): ScrollController {
  const refreshListeners = new Set<() => void>();
  let lastRefreshAt = 0;
  let refreshTimer: number | undefined;
  const cleanups: Cleanup[] = [];

  let lenis: Lenis | null = null;
  if (options.smooth) {
    lenis = new Lenis({
      autoRaf: false,
      lerp: 0.1,
      smoothWheel: true,
      // Touch keeps its native momentum; the engine is not loaded for touch visitors anyway
      syncTouch: false,
      // Anchors are handled below so they get the header offset and move focus
      anchors: false,
    });
    const instance = lenis;
    const onScroll = () => ScrollTrigger.update();
    instance.on("scroll", onScroll);
    const raf = (time: number) => instance.raf(time * 1000);
    gsap.ticker.add(raf);
    cleanups.push(() => {
      instance.off("scroll", onScroll);
      gsap.ticker.remove(raf);
      instance.destroy();
    });
  }

  const runRefresh = () => {
    lastRefreshAt = performance.now();
    ScrollTrigger.refresh();
    refreshListeners.forEach((listener) => listener());
  };

  // F10: one debounced refresh for resize-adjacent events, fonts and late media
  const refresh = () => {
    window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(runRefresh, REFRESH_DEBOUNCE_MS);
  };
  cleanups.push(() => window.clearTimeout(refreshTimer));

  void document.fonts?.ready.then(refresh);
  window.addEventListener("load", refresh);
  cleanups.push(() => window.removeEventListener("load", refresh));

  // Content that changes the page height after trigger positions were measured (lazy media, streamed
  // sections) invalidates pins. Ignore the echo of our own refresh to avoid a feedback loop.
  if (typeof ResizeObserver !== "undefined") {
    const observer = new ResizeObserver(() => {
      if (performance.now() - lastRefreshAt < REFRESH_SETTLE_MS) return;
      refresh();
    });
    observer.observe(document.documentElement);
    cleanups.push(() => observer.disconnect());
  }

  const scrollTo: ScrollController["scrollTo"] = (
    target,
    scrollOptions = {}
  ) => {
    const element = typeof target === "number" ? null : resolveTarget(target);
    if (typeof target !== "number" && !element) return;

    const offset = -(readHeaderOffset() + (scrollOptions.offset ?? 0));
    const finish = () => {
      if (element && scrollOptions.focus !== false) focusTarget(element);
    };

    if (lenis && !scrollOptions.immediate) {
      lenis.scrollTo(element ?? (target as number), {
        offset: element ? offset : 0,
        easing: easeFn.signal,
        duration: 1.1,
        onComplete: finish,
      });
      return;
    }

    const top = element
      ? element.getBoundingClientRect().top + window.scrollY + offset
      : (target as number);
    if (lenis) lenis.scrollTo(top, { immediate: true, force: true });
    else window.scrollTo({ top, behavior: "auto" });
    finish();
  };

  // Same-page hash links: scroll with the header offset, update the URL, move focus
  const onClick = (event: MouseEvent) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      !(event.target instanceof Element)
    ) {
      return;
    }
    const anchor = event.target.closest<HTMLAnchorElement>("a[href]");
    if (
      !anchor ||
      anchor.target === "_blank" ||
      anchor.hasAttribute("download")
    ) {
      return;
    }
    const url = new URL(anchor.href, window.location.href);
    if (
      url.origin !== window.location.origin ||
      url.pathname !== window.location.pathname ||
      url.search !== window.location.search ||
      !url.hash ||
      url.hash === "#"
    ) {
      return;
    }
    const element = resolveTarget(url.hash);
    if (!element) return;

    // preventDefault only: next/link respects it, and the link's own onClick (closing a menu) still runs
    event.preventDefault();
    window.history.pushState(window.history.state, "", url.hash);
    scrollTo(element);
  };
  document.addEventListener("click", onClick, true);
  cleanups.push(() => document.removeEventListener("click", onClick, true));

  // Overlays lock page scroll with `body { overflow: hidden }`; smooth scroll must stop with it
  if (lenis) {
    const instance = lenis;
    const syncLock = () => {
      if (document.body.style.overflow === "hidden") instance.stop();
      else instance.start();
    };
    const observer = new MutationObserver(syncLock);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["style"],
    });
    syncLock();
    cleanups.push(() => observer.disconnect());
  }

  return {
    lenis,
    scrollTo,
    refresh,
    onRefresh(listener) {
      refreshListeners.add(listener);
      return () => refreshListeners.delete(listener);
    },
    stop: () => lenis?.stop(),
    start: () => lenis?.start(),
    destroy() {
      cleanups
        .splice(0)
        .reverse()
        .forEach((cleanup) => cleanup());
      refreshListeners.clear();
    },
  };
}
