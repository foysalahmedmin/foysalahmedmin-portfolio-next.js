/**
 * The reading-progress hairline (M34): a 2 px line across the top that fills as the page scrolls. It is
 * pure CSS (a scroll-driven animation on the root scroller), so it is a server component with no script.
 * Where scroll-driven animations are not supported, and for reduced motion, it is not shown at all rather
 * than sitting full or empty. Place it once per reading page (articles, legal documents).
 */
export function ReadingProgress() {
  return <div className="reading-progress" aria-hidden="true" />;
}
