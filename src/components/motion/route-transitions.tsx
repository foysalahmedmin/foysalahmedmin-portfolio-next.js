"use client";

import { resolveTransitionTarget } from "@/lib/motion/route-transition";
import { useMotion } from "@/providers/motion-provider";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useEngine } from "./engine-provider";

/**
 * The route shutter (M18) and the page-enter preset.
 *
 * With full motion and View Transitions, a click on an internal link runs the navigation inside
 * `document.startViewTransition`: the header persists and the page wipes in over 420 ms (see
 * engine.css). The click is intercepted in the capture phase, before next/link, which respects
 * `defaultPrevented`; prefetching, history and scroll restoration stay Next's. Everywhere else
 * (reduced and off motion, browsers without View Transitions, back and forward) the settled page
 * eases in with a CSS preset, and a skeleton never animates. The page is complete and navigable
 * without any of this.
 */
export function RouteTransitions() {
  const router = useRouter();
  const pathname = usePathname();
  const { effectiveMotion } = useMotion();
  const engine = useEngine();
  const engineRef = useRef(engine);
  const settle = useRef<(() => void) | null>(null);
  // The path the last navigation effect saw. A ref of the path, not a "first run" flag, so React strict
  // mode (which runs effects twice in development) cannot mistake the first load for a navigation.
  const lastPath = useRef(pathname);

  useEffect(() => {
    engineRef.current = engine;
  }, [engine]);

  // Runs once per committed navigation
  useEffect(() => {
    settle.current?.();
    settle.current = null;
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    // The page changed height and content: pins and triggers measure again once things settle
    engineRef.current?.refresh();

    const root = document.documentElement;
    // The shutter animates this navigation; the preset is for the ones it does not
    if (root.dataset.vt) return;
    root.dataset.nav = "enter";
    const timer = window.setTimeout(() => {
      delete root.dataset.nav;
    }, 500);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    if (
      effectiveMotion !== "full" ||
      typeof document.startViewTransition !== "function"
    ) {
      return;
    }

    const onClick = (event: MouseEvent) => {
      const anchor =
        event.target instanceof Element
          ? event.target.closest<HTMLAnchorElement>("a[href]")
          : null;
      if (!anchor) return;

      const target = resolveTransitionTarget({
        event,
        anchor: {
          href: anchor.href,
          target: anchor.target,
          download: anchor.hasAttribute("download"),
          rel: anchor.rel,
          optOut: anchor.hasAttribute("data-no-transition"),
        },
        location: window.location,
      });
      if (!target) return;

      event.preventDefault();
      const root = document.documentElement;
      root.dataset.vt = "running";
      const transition = document.startViewTransition(
        () =>
          new Promise<void>((resolve) => {
            settle.current = resolve;
            router.push(target);
            // Never hold the page if the navigation does not change the path
            window.setTimeout(resolve, 1_500);
          })
      );
      void transition.finished
        .catch(() => undefined)
        .finally(() => {
          delete root.dataset.vt;
        });
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [effectiveMotion, router]);

  return null;
}
