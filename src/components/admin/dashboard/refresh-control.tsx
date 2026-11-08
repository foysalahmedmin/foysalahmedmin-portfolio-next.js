"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useTransition } from "react";
import { formatClock } from "./format";

/** The dashboard is server-rendered; coming back to the tab after this long re-reads it. */
export const STALE_AFTER_MS = 60_000;

/**
 * "refreshed 10:42" plus a Refresh button, and the one piece of client behaviour the dashboard has:
 * `router.refresh()` when the tab regains focus after 60 s. The label and the button have fixed
 * boxes (see `.cd-refresh`), so a new time or the pending state never moves the layout.
 */
export function RefreshControl({ generatedAt }: { generatedAt: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const lastRefresh = useRef(0);

  const refresh = useCallback(() => {
    lastRefresh.current = Date.now();
    startTransition(() => router.refresh());
  }, [router]);

  // A new snapshot arrived (by any route): the 60 s clock starts again.
  useEffect(() => {
    lastRefresh.current = Date.now();
  }, [generatedAt]);

  useEffect(() => {
    const onReturn = () => {
      if (
        document.visibilityState === "visible" &&
        Date.now() - lastRefresh.current >= STALE_AFTER_MS
      ) {
        refresh();
      }
    };
    document.addEventListener("visibilitychange", onReturn);
    window.addEventListener("focus", onReturn);
    return () => {
      document.removeEventListener("visibilitychange", onReturn);
      window.removeEventListener("focus", onReturn);
    };
  }, [refresh]);

  return (
    <span className="cd-refresh">
      <span className="cd-refresh__time t-mono">
        refreshed <time dateTime={generatedAt}>{formatClock(generatedAt)}</time>
      </span>
      <button
        type="button"
        className="cd-refresh__button"
        onClick={refresh}
        disabled={pending}
        aria-busy={pending}
      >
        Refresh
      </button>
      <span role="status" className="sr-only">
        {pending ? "Refreshing the dashboard" : ""}
      </span>
    </span>
  );
}
