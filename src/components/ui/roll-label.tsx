/**
 * A button or link label that rolls up inside a clip on hover and focus (M27): the same text sits one
 * line below and takes its place. The copy is aria-hidden, so assistive technology reads the label once.
 * Only the public surface styles it (marks.css); reduced and off motion show the plain label.
 */
export function RollLabel({ children }: { children: string }) {
  return (
    <span className="roll-label">
      <span>{children}</span>
      <span aria-hidden="true">{children}</span>
    </span>
  );
}
