import type { FullConfig } from "@playwright/test";

const EXPECTED_MARKERS = [
  'data-motion-capability="static"',
  'id="contact-form-status"',
] as const;

const readBaseURL = (config: FullConfig) => {
  const baseURL = config.projects[0]?.use.baseURL;
  if (typeof baseURL !== "string") {
    throw new Error("Playwright requires a string baseURL for browser tests.");
  }

  return baseURL;
};

export default async function verifyPortfolioServer(config: FullConfig) {
  const contactURL = new URL("/contact", readBaseURL(config));
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), 20_000);

  try {
    const response = await fetch(contactURL, {
      headers: { "x-playwright-health-check": "portfolio-e2e" },
      redirect: "error",
      signal: abortController.signal,
    });
    if (!response.ok) {
      throw new Error(`received HTTP ${response.status}`);
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.toLowerCase().includes("text/html")) {
      throw new Error(
        `received unexpected content type ${contentType || "none"}`
      );
    }

    const html = await response.text();
    const missingMarkers = EXPECTED_MARKERS.filter(
      (marker) => !html.includes(marker)
    );
    if (missingMarkers.length > 0) {
      throw new Error(
        `missing application markers: ${missingMarkers.join(", ")}`
      );
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Playwright server verification failed for ${contactURL.origin}. ` +
        `Refusing to test an unverified application: ${reason}`
    );
  } finally {
    clearTimeout(timeout);
  }
}
