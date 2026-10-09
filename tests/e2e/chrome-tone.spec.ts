import { expect, test } from "@playwright/test";

/**
 * Chrome tone (docs plan 3.2): fixed glass adopts the tone of the band beneath it, so dark glass is
 * never left over a paper band. The CtaBand is the band on every page that has one.
 */
const luminance = (rgb: string) => {
  const [r, g, b] = (rgb.match(/[\d.]+/g) ?? ["0", "0", "0"]).map(Number) as [
    number,
    number,
    number,
  ];
  const c = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b);
};
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
};

for (const theme of ["dark", "light"] as const) {
  test(`header follows the band beneath it (${theme})`, async ({ page }) => {
    await page.addInitScript((value) => {
      localStorage.setItem(
        "setting",
        JSON.stringify({ theme: value, direction: "ltr", language: "en" })
      );
    }, theme);
    await page.goto("/about");
    await expect(page.locator("main:not([aria-busy])")).toBeVisible();
    const header = page.locator("header[data-chrome]");
    const band = page.locator("[data-cta-band]");
    await expect(band).toHaveAttribute("data-tone", "invert");

    // At the top there is no band under the header: it follows the page tone
    await expect(header).not.toHaveAttribute("data-tone", /.+/);

    // Put the band under the header's centre line
    await band.evaluate((element) => {
      const top = element.getBoundingClientRect().top + window.scrollY;
      window.scrollTo(0, top - 20);
    });
    const expected = theme === "dark" ? "paper" : "ink";
    await expect(header).toHaveAttribute("data-tone", expected);

    // The header text must stay legible over the band
    const colours = await page.evaluate(() => {
      const bandElement = document.querySelector("[data-cta-band]")!;
      const headerElement = document.querySelector("header[data-chrome] a")!;
      return {
        text: getComputedStyle(headerElement).color,
        band: getComputedStyle(bandElement).backgroundColor,
      };
    });
    expect(contrast(colours.text, colours.band)).toBeGreaterThanOrEqual(4.5);

    // Back above the band the header returns to the page tone
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(header).not.toHaveAttribute("data-tone", /.+/);
  });
}
