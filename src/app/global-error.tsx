"use client";

import { NOINDEX_ROBOTS_CONTENT } from "@/lib/metadata/noindex";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="robots" content={NOINDEX_ROBOTS_CONTENT} />
      </head>
      <body>
        <main
          style={{
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
            padding: "2rem",
            fontFamily: "system-ui, sans-serif",
            background: "#0d1220",
            color: "#f5f7ff",
          }}
        >
          <section style={{ maxWidth: "38rem", textAlign: "center" }}>
            <p style={{ letterSpacing: ".14em", textTransform: "uppercase" }}>
              Portfolio recovery
            </p>
            <h1 style={{ fontSize: "clamp(2rem, 8vw, 4rem)" }}>
              The application needs a fresh start.
            </h1>
            <p>
              Retry once. If the issue continues, use the contact page and share
              {error.digest
                ? ` reference ${error.digest}`
                : " the page address"}
              .
            </p>
            <button
              type="button"
              onClick={reset}
              style={{
                marginTop: "1.5rem",
                minHeight: "2.75rem",
                border: "2px solid currentColor",
                borderRadius: "999px",
                padding: ".65rem 1.25rem",
                color: "#0d1220",
                background: "#f5f7ff",
                fontWeight: 700,
              }}
            >
              Retry application
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
