"use client";

import { useEffect } from "react";

export const UNSAVED_LEAVE_MESSAGE =
  "You have unsaved changes. Leave this page and lose them?";

/**
 * Warns before an editor with unsaved changes is left: the browser's own prompt for a reload, a close or a
 * typed address, and a confirm for clicks on in-app links (a capture listener, so it runs before the App Router
 * link handler). Renders nothing. Limit (plan R21): the browser back and forward buttons cannot be intercepted
 * from here, so they leave without a prompt; upgrade path is a local draft saved as the user types.
 */
export function UnsavedChangesGuard({ dirty }: { dirty: boolean }) {
  useEffect(() => {
    if (!dirty) return;

    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Older engines show the prompt only when a return value is set.
      event.returnValue = "";
    };
    const confirmLeave = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      const link = (event.target as Element | null)?.closest?.("a[href]");
      if (!(link instanceof HTMLAnchorElement)) return;
      if (link.target && link.target !== "_self") return;
      if (link.hasAttribute("download")) return;
      const next = new URL(link.href, window.location.href);
      if (next.origin !== window.location.origin) return;
      // A hash link on the same page (the section index) is not leaving.
      if (
        next.pathname === window.location.pathname &&
        next.search === window.location.search
      ) {
        return;
      }
      if (!window.confirm(UNSAVED_LEAVE_MESSAGE)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", confirmLeave, true);
    return () => {
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("click", confirmLeave, true);
    };
  }, [dirty]);

  return null;
}
