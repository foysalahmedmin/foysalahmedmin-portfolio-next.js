import { SystemPage } from "@/components/templates/system-page";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { NOINDEX_ROBOTS_CONTENT } from "@/lib/metadata/noindex";
import { RefreshCw } from "lucide-react";
import Link from "next/link";

const POSTER_THEMES = ["dark", "light"] as const;

const poster = (theme: string, frame: string, format: string) =>
  `/images/hero/maquette-${theme}-${frame}.${format}`;

/**
 * The maquette as a static, decorative still (the posters the home hero starts from). The one for the
 * other theme is hidden by CSS and, being lazy, never fetched.
 */
function MaquetteStill() {
  return (
    <div className="nr-still" aria-hidden="true">
      {POSTER_THEMES.map((theme) => (
        <picture key={theme} className={`nr-still-${theme}`}>
          <source
            media="(orientation: portrait)"
            type="image/avif"
            srcSet={poster(theme, "portrait", "avif")}
          />
          <source
            media="(orientation: portrait)"
            type="image/webp"
            srcSet={poster(theme, "portrait", "webp")}
          />
          <source
            type="image/avif"
            srcSet={poster(theme, "landscape", "avif")}
          />
          <img
            src={poster(theme, "landscape", "webp")}
            alt=""
            width={1920}
            height={1080}
            loading="lazy"
            decoding="async"
          />
        </picture>
      ))}
    </div>
  );
}

/**
 * A8 System: not found. Shared by the root boundary and the public segment boundary. Not-found has no
 * safe access to the requested address, so the path line is fixed. Only the public layout mounts the
 * command palette, so the shortcut hint is left out of the standalone (`fullHeight`) page.
 */
export function NotFoundView({ fullHeight }: { fullHeight?: boolean }) {
  return (
    <SystemPage
      {...(fullHeight ? { className: "min-h-dvh" } : {})}
      backdrop={<MaquetteStill />}
      path="~/no-such-route: no route"
      code="404 · Not found"
      title="This work is not available."
      description="The address may be outdated, or this content may no longer be published."
      actions={
        <>
          <Link href="/" className={buttonVariants({ size: "lg" })}>
            Return home
          </Link>
          {fullHeight ? null : (
            <p className="nr-hint">
              Search the site with <kbd className="nr-kbd">⌘K</kbd> or{" "}
              <kbd className="nr-kbd">Ctrl K</kbd>
            </p>
          )}
        </>
      }
    />
  );
}

/**
 * A8 System: a route threw. In brand and calm: it names what happened and what to do. It never shows
 * the error message or the digest; those stay in the server log. Rendered by a client `error.tsx`.
 */
export function RouteErrorView({
  reset,
  title = "This page could not be loaded",
}: {
  reset: () => void;
  title?: string;
}) {
  return (
    <>
      <meta name="robots" content={NOINDEX_ROBOTS_CONTENT} />
      <SystemPage
        path="~/error: page did not load"
        code="Error"
        title={title}
        description="Try again. If it keeps happening, return home and carry on from there."
        actions={
          <>
            <Button type="button" size="lg" onClick={reset}>
              <RefreshCw className="size-4" aria-hidden="true" />
              Try again
            </Button>
            <Link
              href="/"
              className={buttonVariants({ size: "lg", variant: "outline" })}
            >
              Return home
            </Link>
          </>
        }
      />
    </>
  );
}
