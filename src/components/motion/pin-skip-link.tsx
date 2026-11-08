/**
 * Every pinned scene has a way past it (docs plan 3.7.4, 6.4): a link that appears on keyboard focus and
 * jumps to the anchor placed right after the scene. Both are server markup, so they work without
 * JavaScript and add nothing to the initial bundle.
 */
export function PinSkipLink({ target }: { target: string }) {
  return (
    <a
      href={`#${target}`}
      className="bg-foreground text-background fixed top-3 left-3 z-[2000] -translate-y-24 px-4 py-3 font-semibold transition-transform focus-visible:translate-y-0"
    >
      Skip past this scroll scene
    </a>
  );
}

export function PinSkipTarget({ id }: { id: string }) {
  return <span id={id} tabIndex={-1} />;
}
