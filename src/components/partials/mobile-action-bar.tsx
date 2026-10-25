"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import { RollLabel } from "@/components/ui/roll-label";
import { openPalette } from "@/lib/palette/shortcut";
import type { TPublicShellLink } from "@/lib/site/public-shell";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const SHOW_AFTER_PX = 600;
const TYPING =
  "input, textarea, select, [contenteditable=''], [contenteditable='true']";

/**
 * The thumb-zone bar for phones and tablets (docs plan 3.16): after the first screens, a slim bar offers
 * the primary action and the search. It gets out of the way while someone types, on the contact page
 * (where the form is the action) and over the footer. Visibility is a data attribute written by a
 * passive scroll listener, so scrolling never re-renders it.
 */
export function MobileActionBar({ cta }: { cta: TPublicShellLink }) {
  const pathname = usePathname();
  const bar = useRef<HTMLDivElement>(null);
  const onContact = pathname === "/contact" || pathname.startsWith("/admin");

  useEffect(() => {
    const element = bar.current;
    if (!element || onContact) return;

    let pastFold = false;
    let overFooter = false;
    let typing = false;
    const apply = () => {
      element.dataset.visible = String(pastFold && !overFooter && !typing);
    };

    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        pastFold = window.scrollY > SHOW_AFTER_PX;
        apply();
      });
    };
    const onFocusIn = (event: FocusEvent) => {
      typing = event.target instanceof Element && event.target.matches(TYPING);
      apply();
    };
    const onFocusOut = () => {
      typing = false;
      apply();
    };

    const footer = document.querySelector("footer[data-footer]");
    const observer = footer
      ? new IntersectionObserver(([entry]) => {
          overFooter = Boolean(entry?.isIntersecting);
          apply();
        })
      : null;
    if (footer) observer?.observe(footer);

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      observer?.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [onContact, pathname]);

  if (onContact) return null;
  return (
    <div
      ref={bar}
      data-mobile-bar=""
      data-visible="false"
      className="glass-1 border-line-2 fixed inset-x-0 bottom-0 z-[var(--z-chrome)] flex gap-2 border-t px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] xl:hidden"
    >
      <Link
        href={cta.href}
        className={cn(buttonVariants({ size: "lg" }), "flex-1")}
      >
        <RollLabel>Start a project</RollLabel>
      </Link>
      <Button
        type="button"
        variant="outline"
        size="lg"
        shape="icon"
        onClick={openPalette}
        aria-label="Open command palette"
        aria-haspopup="dialog"
      >
        <Search className="size-5" aria-hidden="true" />
      </Button>
    </div>
  );
}
