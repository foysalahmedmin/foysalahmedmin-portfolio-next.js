import { StatusMark } from "@/components/ui/status-mark";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { SectionSpy } from "./section-spy";

export type SectionIndexItem = {
  /** The id of the `EditorSection` this entry jumps to. */
  id: string;
  label: ReactNode;
  /** The section holds unsaved edits (half-filled square, "Edited"). */
  dirty?: boolean;
  /** The section holds a validation error (triangle, "Error"); wins over dirty. */
  error?: boolean;
};

/**
 * C3 section index. A left rail from 1280 px up, a sticky strip below. Plain anchors to the sections
 * (the focus binder of the public engine is not loaded in the admin); SectionSpy adds the current mark.
 */
export function SectionIndex({
  sections,
  label = "Sections",
  className,
}: {
  sections: readonly SectionIndexItem[];
  label?: string;
  className?: string;
}) {
  return (
    <nav
      data-cp="section-index"
      aria-label={label}
      className={cn("cp-index", className)}
    >
      <ul className="cp-index__list">
        {sections.map((section) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              className="cp-index__link"
              data-dirty={section.dirty || undefined}
              data-error={section.error || undefined}
            >
              <span className="cp-index__label">{section.label}</span>
              {section.error ? (
                <StatusMark state="error">Error</StatusMark>
              ) : section.dirty ? (
                <StatusMark state="pending">Edited</StatusMark>
              ) : null}
            </a>
          </li>
        ))}
      </ul>
      <SectionSpy ids={sections.map((section) => section.id)} />
    </nav>
  );
}
