/** Kept tiny on purpose: the header button and the always-loaded shell import this, not the palette. */
export const PALETTE_EVENT = "portfolio:palette";

/** Ask the shell to open (or, if it is open, close) the command palette. */
export function openPalette(): void {
  window.dispatchEvent(new CustomEvent(PALETTE_EVENT));
}

export function isPaletteShortcut(event: KeyboardEvent): boolean {
  return (
    (event.metaKey || event.ctrlKey) &&
    !event.altKey &&
    !event.shiftKey &&
    event.key.toLowerCase() === "k"
  );
}
