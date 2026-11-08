import { ConsoleAuth } from "@/components/templates/console-templates";
import { FieldError } from "@/components/ui/field-error";
import { Glass } from "@/components/ui/glass";
import { StatusMark } from "@/components/ui/status-mark";
import type { ReactNode } from "react";

/*
 * C6 Auth frame (docs plan 4.3): a centred glass form over the static maquette still. No WebGL, no
 * animation. `AuthFrame` is a server component the three pages wrap their form in; `AuthPanel` and
 * `AuthStatus` hold no state, so the client forms render them directly.
 */

const POSTER_THEMES = ["dark", "light"] as const;

const poster = (theme: string, frame: string, format: string) =>
  `/images/hero/maquette-${theme}-${frame}.${format}`;

/** The decorative still. CSS hides the one for the other theme and, being lazy, it is never fetched. */
function MaquetteStill() {
  return (
    <div className="ca-still" aria-hidden="true">
      {POSTER_THEMES.map((theme) => (
        <picture key={theme} className={`ca-still-${theme}`}>
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

export function AuthFrame({ children }: { children: ReactNode }) {
  return (
    <div className="ca-page">
      <MaquetteStill />
      <ConsoleAuth id="main-content" className="ca-main w-full">
        {children}
      </ConsoleAuth>
    </div>
  );
}

type AuthPanelProps = {
  title: string;
  description: string;
  children: ReactNode;
  /** Quiet text links to the sibling auth pages, set under the form. */
  links?: ReactNode;
};

export function AuthPanel({
  title,
  description,
  children,
  links,
}: AuthPanelProps) {
  return (
    <Glass tier={3} className="ca-panel">
      <header className="ca-head">
        <p className="ca-eyebrow t-eyebrow">Admin console</p>
        <h1 className="ca-title t-h4">{title}</h1>
        <p className="ca-lede">{description}</p>
      </header>
      {children}
      {links ? <div className="ca-links">{links}</div> : null}
    </Glass>
  );
}

/**
 * The error and notice region. The live region is always mounted so a message inserted later is
 * announced; state is a glyph and a label, never colour only (docs plan 3.6).
 */
export function AuthStatus({
  error,
  notice,
}: {
  error?: string;
  notice?: string;
}) {
  return (
    <div aria-live="polite" aria-atomic="true" className="ca-status">
      {error ? (
        <FieldError role="alert">{error}</FieldError>
      ) : notice ? (
        <p className="ca-notice">
          <StatusMark state="success">{notice}</StatusMark>
        </p>
      ) : null}
    </div>
  );
}
