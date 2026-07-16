import { sanitizeRichHtml } from "@/lib/content/rich-content";

type TrustedRichTextProps = {
  html: string;
  className?: string;
};

/**
 * The sole editorial HTML sink. Every render is sanitized again so legacy
 * records and data written under an older policy remain safe.
 */
export default function TrustedRichText({
  html,
  className,
}: TrustedRichTextProps) {
  const sanitized = sanitizeRichHtml(html);

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}
