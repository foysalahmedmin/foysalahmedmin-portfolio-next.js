import type { Page } from "@playwright/test";

/**
 * Axe judges whatever frame it lands on. A block that is mid-reveal has a fraction of its final
 * opacity, which reads as insufficient contrast. Reveals start a frame or two after content arrives
 * (an observer decides which blocks are on the first screen), so a single look at "nothing is
 * running" is not enough: wait until three checks in a row, 100 ms apart, find no running
 * transition. Endless loops (the skeleton breathe) are not waited for.
 */
export async function settle(page: Page): Promise<void> {
  let quiet = 0;
  for (let attempt = 0; attempt < 60 && quiet < 3; attempt += 1) {
    const running = await page.evaluate(
      () =>
        new Promise<number>((resolve) =>
          requestAnimationFrame(() =>
            requestAnimationFrame(() =>
              resolve(
                document
                  .getAnimations()
                  .filter(
                    (animation) =>
                      animation.playState === "running" &&
                      animation.effect?.getComputedTiming().iterations !==
                        Infinity
                  ).length
              )
            )
          )
        )
    );
    quiet = running === 0 ? quiet + 1 : 0;
    await page.waitForTimeout(100);
  }
}
