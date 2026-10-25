"use client";

import { Button } from "@/components/ui/button";
import { openPalette } from "@/lib/palette/shortcut";

export function OpenPaletteButton() {
  return (
    <Button type="button" variant="outline" onClick={openPalette}>
      Open the command palette
    </Button>
  );
}
