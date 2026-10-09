import localFont from "next/font/local";

// Self-hosted variable fonts (latin subset), loaded only by public routes so the admin pays nothing.
// Display + Text are preloaded (117 KB measured, budget 150 KB, ADR 0011); Mono loads on first use.
// next/font/local generates a size-adjusted fallback face, so the swap does not shift layout.

/** Display: Archivo with the width axis. Width is a semantic axis (statements wide, annotations narrow). */
export const fontDisplay = localFont({
  src: "../../assets/fonts/archivo-latin-wdth-wght.woff2",
  weight: "100 900",
  style: "normal",
  variable: "--font-display-face",
  display: "swap",
  preload: true,
  // Off on purpose: the display fallbacks are calibrated per width step in assets/styles/public/fonts.css
  adjustFontFallback: false,
  declarations: [{ prop: "font-stretch", value: "62% 125%" }],
});

/** Text: Instrument Sans. Quiet and legible, it stays out of the display face's way. */
export const fontText = localFont({
  src: "../../assets/fonts/instrument-sans-latin-wght.woff2",
  weight: "400 700",
  style: "normal",
  variable: "--font-text-face",
  display: "swap",
  preload: true,
});

/** Mono: Martian Mono. Labels, system paths, metrics and annotations. */
export const fontMono = localFont({
  src: "../../assets/fonts/martian-mono-latin-wdth-wght.woff2",
  weight: "100 800",
  style: "normal",
  variable: "--font-mono-face",
  display: "swap",
  preload: false,
  declarations: [{ prop: "font-stretch", value: "75% 112%" }],
});

export const publicFontVariables = [
  fontDisplay.variable,
  fontText.variable,
  fontMono.variable,
].join(" ");
