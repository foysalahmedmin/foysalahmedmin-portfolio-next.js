"use client";

import type { TPageRouteKey } from "@/app/api/pages/page.type";
import {
  EditorialPanel,
  EditorialStatus,
} from "@/components/admin/editorial-editor-primitives";
import { Button } from "@/components/ui/button";
import { getAdminPagePreviewPath } from "@/lib/pages/page-preview-path";
import { clearAdminPagePreviewBestEffort } from "@/services/site-page-admin.service";
import {
  Accessibility,
  Activity,
  Monitor,
  Moon,
  Smartphone,
  Sun,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type TPreviewViewport = "desktop" | "mobile";
type TPreviewTheme = "light" | "dark";
type TPreviewMotion = "normal" | "reduced";

const VIEWPORT_WIDTH: Readonly<Record<TPreviewViewport, number>> = {
  desktop: 1440,
  mobile: 390,
};

export default function PageRendererPreview({
  routeKey,
  revision,
  expiresAt,
  onClose,
  onExpired,
}: Readonly<{
  routeKey: TPageRouteKey;
  revision: number;
  expiresAt: string;
  onClose: () => void;
  onExpired: () => void;
}>) {
  const [viewport, setViewport] = useState<TPreviewViewport>("desktop");
  const [theme, setTheme] = useState<TPreviewTheme>("light");
  const [motion, setMotion] = useState<TPreviewMotion>("normal");
  const [frameActive, setFrameActive] = useState(true);
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const endedRef = useRef(false);
  const onExpiredRef = useRef(onExpired);
  useEffect(() => {
    onExpiredRef.current = onExpired;
  }, [onExpired]);
  const previewUrl = useMemo(() => {
    const query = new URLSearchParams({ theme, motion });
    return `${getAdminPagePreviewPath(routeKey)}?${query.toString()}`;
  }, [motion, routeKey, theme]);
  const width = VIEWPORT_WIDTH[viewport];
  const expiresAtMs = useMemo(() => Date.parse(expiresAt), [expiresAt]);
  const expiresAtLabel = useMemo(() => {
    if (!Number.isFinite(expiresAtMs)) return "invalid";
    return `${new Date(expiresAtMs).toISOString().slice(11, 16)} UTC`;
  }, [expiresAtMs]);
  const expire = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    setFrameActive(false);
    clearAdminPagePreviewBestEffort(routeKey);
    onExpiredRef.current();
  }, [routeKey]);

  useEffect(() => {
    const refreshRemaining = () => {
      const remaining = Number.isFinite(expiresAtMs)
        ? Math.max(0, Math.ceil((expiresAtMs - Date.now()) / 1_000))
        : 0;
      setSecondsRemaining(remaining);
      if (remaining === 0) {
        expire();
        return false;
      }
      return true;
    };
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        setFrameActive(false);
      } else {
        const valid = refreshRemaining();
        if (valid && !endedRef.current && document.hasFocus()) {
          setFrameActive(true);
        }
      }
    };
    const handleFocus = () => {
      if (
        document.visibilityState !== "hidden" &&
        refreshRemaining() &&
        !endedRef.current
      ) {
        setFrameActive(true);
      }
    };
    const handleBlur = () => {
      if (!document.hasFocus()) setFrameActive(false);
    };

    refreshRemaining();
    const interval = window.setInterval(refreshRemaining, 1_000);
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("pagehide", expire);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("pagehide", expire);
    };
  }, [expire, expiresAtMs]);

  return (
    <EditorialPanel
      id="page-renderer-preview"
      title="Public renderer preview"
      description="This sandboxed frame resolves the saved draft through the same bounded data pipeline and renders the same public section components. Width changes resize a real browser viewport, so responsive breakpoints—not a scaled imitation—are exercised."
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <EditorialStatus tone="success">Renderer parity</EditorialStatus>
          <EditorialStatus>Saved r{revision}</EditorialStatus>
          <EditorialStatus>
            {secondsRemaining === null
              ? `Expires at ${expiresAtLabel}`
              : `Expires in ${Math.max(1, Math.ceil(secondsRemaining / 60))} min · ${expiresAtLabel}`}
          </EditorialStatus>
        </div>
        <Button type="button" variant="ghost" onClick={onClose}>
          <X className="size-4" />
          End preview
        </Button>
      </div>

      <div
        className="border-border bg-muted/30 mb-5 flex flex-wrap gap-4 rounded-xl border p-3"
        aria-label="Preview display controls"
      >
        <fieldset className="flex flex-wrap gap-2">
          <legend className="sr-only">Viewport width</legend>
          <Button
            type="button"
            variant={viewport === "desktop" ? "default" : "outline"}
            aria-pressed={viewport === "desktop"}
            onClick={() => setViewport("desktop")}
          >
            <Monitor className="size-4" />
            Desktop · 1440px
          </Button>
          <Button
            type="button"
            variant={viewport === "mobile" ? "default" : "outline"}
            aria-pressed={viewport === "mobile"}
            onClick={() => setViewport("mobile")}
          >
            <Smartphone className="size-4" />
            Mobile · 390px
          </Button>
        </fieldset>

        <fieldset className="flex flex-wrap gap-2">
          <legend className="sr-only">Color theme</legend>
          <Button
            type="button"
            variant={theme === "light" ? "default" : "outline"}
            aria-pressed={theme === "light"}
            onClick={() => setTheme("light")}
          >
            <Sun className="size-4" />
            Light
          </Button>
          <Button
            type="button"
            variant={theme === "dark" ? "default" : "outline"}
            aria-pressed={theme === "dark"}
            onClick={() => setTheme("dark")}
          >
            <Moon className="size-4" />
            Dark
          </Button>
        </fieldset>

        <fieldset className="flex flex-wrap gap-2">
          <legend className="sr-only">Motion mode</legend>
          <Button
            type="button"
            variant={motion === "normal" ? "default" : "outline"}
            aria-pressed={motion === "normal"}
            onClick={() => setMotion("normal")}
          >
            <Activity className="size-4" />
            Normal motion
          </Button>
          <Button
            type="button"
            variant={motion === "reduced" ? "default" : "outline"}
            aria-pressed={motion === "reduced"}
            onClick={() => setMotion("reduced")}
          >
            <Accessibility className="size-4" />
            Reduced motion
          </Button>
        </fieldset>
      </div>

      <p className="text-muted-foreground mb-3 text-xs">
        Frame viewport: {width}px. Forms, popups and top-level navigation are
        blocked by the preview sandbox.
      </p>
      <div className="border-border bg-muted max-w-full overflow-x-auto rounded-xl border p-3">
        {frameActive ? (
          <iframe
            key={previewUrl}
            title={`${routeKey} Page public renderer preview`}
            src={previewUrl}
            width={width}
            height={900}
            sandbox="allow-scripts"
            referrerPolicy="no-referrer"
            className="bg-background mx-auto block max-w-none rounded-lg border-0 shadow-[var(--shadow-md)]"
          />
        ) : (
          <div
            role="status"
            className="bg-background text-muted-foreground grid h-[28rem] place-items-center rounded-lg px-6 text-center text-sm"
          >
            Preview paused while this admin window is not focused.
          </div>
        )}
      </div>
    </EditorialPanel>
  );
}
