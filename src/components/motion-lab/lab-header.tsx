"use client";

import { Button } from "@/components/ui/button";
import MotionPreferences from "@/components/ui/motion-preferences";
import { openPalette } from "@/lib/palette/shortcut";
import { toggleTheme } from "@/state/setting-store";
import Link from "next/link";
import { Search, SunMoon } from "lucide-react";

/** A minimal chrome for the sandbox: it persists across the route shutter like the real header will. */
export function LabHeader() {
  return (
    <header
      data-chrome=""
      className="bg-background/85 border-line-2 sticky top-0 z-[var(--z-header)] border-b backdrop-blur-xl"
    >
      <div className="container flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-3">
        <nav
          aria-label="Motion lab"
          className="flex items-center gap-5 text-sm"
        >
          <Link href="/lab/motion" className="link-draw font-semibold">
            Motion lab
          </Link>
          <Link href="/lab/motion/next" className="link-draw">
            Second page
          </Link>
        </nav>
        <div className="flex flex-wrap items-center gap-3">
          <MotionPreferences />
          <Button
            type="button"
            variant="ghost"
            shape="icon"
            onClick={openPalette}
            aria-label="Open command palette"
            aria-haspopup="dialog"
            aria-keyshortcuts="Control+K Meta+K"
          >
            <Search className="size-5" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            shape="icon"
            onClick={toggleTheme}
            aria-label="Change color theme"
          >
            <SunMoon className="size-5" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </header>
  );
}
