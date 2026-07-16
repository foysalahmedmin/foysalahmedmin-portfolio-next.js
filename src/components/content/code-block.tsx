"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

export const CodeBlock = ({
  code,
  language,
  caption,
}: {
  code: string;
  language?: string;
  caption?: string;
}) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2_000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <figure className="border-border bg-surface-raised my-10 overflow-hidden rounded-2xl border shadow-[var(--shadow-xs)]">
      <div className="border-border bg-muted flex min-h-11 items-center justify-between gap-4 border-b px-4">
        <span className="text-muted-foreground text-xs font-bold tracking-wide uppercase">
          {language || "Code"}
        </span>
        <button
          type="button"
          onClick={copy}
          className="focus-visible:ring-primary inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-xs font-bold focus-visible:ring-2 focus-visible:outline-none"
          aria-label={copied ? "Code copied" : "Copy code"}
        >
          {copied ? (
            <Check className="size-4" aria-hidden="true" />
          ) : (
            <Copy className="size-4" aria-hidden="true" />
          )}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-5 text-sm leading-7" tabIndex={0}>
        <code>{code}</code>
      </pre>
      {caption && (
        <figcaption className="text-muted-foreground border-border border-t px-5 py-3 text-xs leading-5">
          {caption}
        </figcaption>
      )}
      <span className="sr-only" role="status" aria-live="polite">
        {copied ? "Code copied to clipboard." : ""}
      </span>
    </figure>
  );
};
