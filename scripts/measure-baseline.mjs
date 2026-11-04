// Records load metrics and scroll smoothness for the public routes against a running
// production server (`pnpm build && pnpm start -p 3107`). It is the first version of the
// smoothness harness described in docs/plans/2026-10-08-monochrome-systems-ui-overhaul.md (3.7.1).
//
// Usage: node scripts/measure-baseline.mjs [baseUrl] [outFile]
import { chromium } from "@playwright/test";
import { writeFileSync } from "node:fs";

const base = process.argv[2] ?? "http://127.0.0.1:3107";
const outFile = process.argv[3] ?? "docs/baseline/phase-0-baseline.json";
const routes = [
  "/",
  "/about",
  "/contact",
  "/projects",
  "/case-studies",
  "/articles",
  "/videos",
  "/privacy",
  "/terms",
];
const smoothRoutes = new Set(["/", "/about", "/case-studies"]);
const SCROLL_MS = 10_000;

const profiles = {
  // ADR 0009: 1440x900, no throttle.
  desktop: {
    viewport: { width: 1440, height: 900 },
    dpr: 1,
    mobile: false,
    cpu: 1,
    net: null,
  },
  // ADR 0009: 360x800, DPR 2, 4x CPU, 150 ms RTT, 1.6 Mbps down, 750 Kbps up.
  mobile: {
    viewport: { width: 360, height: 800 },
    dpr: 2,
    mobile: true,
    cpu: 4,
    net: {
      offline: false,
      latency: 150,
      downloadThroughput: (1.6 * 1024 * 1024) / 8,
      uploadThroughput: (750 * 1024) / 8,
    },
  },
};

const pct = (sorted, p) =>
  sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))] ??
  0;

async function measure(browser, name, profile, route) {
  const context = await browser.newContext({
    viewport: profile.viewport,
    deviceScaleFactor: profile.dpr,
    isMobile: profile.mobile,
    hasTouch: profile.mobile,
    reducedMotion: "no-preference",
  });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");
  if (profile.net)
    await cdp.send("Network.emulateNetworkConditions", profile.net);
  if (profile.cpu > 1)
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: profile.cpu });

  let jsBytes = 0;
  let jsCount = 0;
  let htmlBytes = 0;
  const types = new Map();
  cdp.on("Network.responseReceived", (e) => types.set(e.requestId, e.type));
  cdp.on("Network.loadingFinished", (e) => {
    const type = types.get(e.requestId);
    if (type === "Script") {
      jsBytes += e.encodedDataLength;
      jsCount += 1;
    } else if (type === "Document") htmlBytes += e.encodedDataLength;
  });

  await page.addInitScript(() => {
    window.__vitals = { lcp: 0, cls: 0, fcp: 0, tbt: 0 };
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) window.__vitals.lcp = e.startTime;
    }).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver((l) => {
      for (const e of l.getEntries())
        if (!e.hadRecentInput) window.__vitals.cls += e.value;
    }).observe({ type: "layout-shift", buffered: true });
    new PerformanceObserver((l) => {
      for (const e of l.getEntries())
        if (e.name === "first-contentful-paint")
          window.__vitals.fcp = e.startTime;
    }).observe({ type: "paint", buffered: true });
    new PerformanceObserver((l) => {
      for (const e of l.getEntries())
        window.__vitals.tbt += Math.max(0, e.duration - 50);
    }).observe({ type: "longtask", buffered: true });
  });

  await page.goto(base + route, { waitUntil: "load", timeout: 90_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1500);
  const vitals = await page.evaluate(() => ({ ...window.__vitals }));
  const docHeight = await page.evaluate(
    () => document.documentElement.scrollHeight
  );

  let smooth = null;
  if (smoothRoutes.has(route)) {
    smooth = await page.evaluate(async (ms) => {
      const frames = [];
      const loaf = [];
      try {
        new PerformanceObserver((l) => {
          for (const e of l.getEntries()) loaf.push(e.duration);
        }).observe({ type: "long-animation-frame", buffered: false });
      } catch {
        /* long-animation-frame is Chromium only */
      }
      const max = document.documentElement.scrollHeight - innerHeight;
      const t0 = performance.now();
      let last = t0;
      await new Promise((resolve) => {
        const tick = (now) => {
          frames.push(now - last);
          last = now;
          const p = Math.min(1, (now - t0) / ms);
          scrollTo(0, max * p);
          if (p < 1) requestAnimationFrame(tick);
          else resolve();
        };
        requestAnimationFrame(tick);
      });
      return { frames, loaf };
    }, SCROLL_MS);
    const f = smooth.frames.slice(1).sort((a, b) => a - b);
    const budget = profile.mobile ? 50 : 25; // > 1.5 frames at 60 Hz (30 Hz floor on mobile profile)
    smooth = {
      frames: f.length,
      p50_ms: +pct(f, 50).toFixed(1),
      p95_ms: +pct(f, 95).toFixed(1),
      max_ms: +f[f.length - 1].toFixed(1),
      dropped_pct: +(
        (f.filter((x) => x > budget).length / f.length) *
        100
      ).toFixed(1),
      long_animation_frames_over_50ms: smooth.loaf.filter((d) => d > 50).length,
    };
  }

  await context.close();
  return {
    profile: name,
    route,
    html_kb: +(htmlBytes / 1024).toFixed(1),
    js_kb_transferred: +(jsBytes / 1024).toFixed(1),
    js_requests: jsCount,
    fcp_ms: Math.round(vitals.fcp),
    lcp_ms: Math.round(vitals.lcp),
    cls: +vitals.cls.toFixed(3),
    tbt_ms: Math.round(vitals.tbt),
    doc_height_px: docHeight,
    ...(smooth ? { smoothness: smooth } : {}),
  };
}

// PW_CHROMIUM lets a machine without the pinned Playwright browser reuse another Chromium build.
const browser = await chromium.launch(
  process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}
);
const results = [];
for (const [name, profile] of Object.entries(profiles)) {
  for (const route of routes) {
    const r = await measure(browser, name, profile, route);
    results.push(r);
    console.log(
      `${name.padEnd(7)} ${route.padEnd(14)} js ${String(r.js_kb_transferred).padStart(6)} KB  lcp ${String(r.lcp_ms).padStart(5)} ms  cls ${r.cls}  tbt ${String(r.tbt_ms).padStart(4)} ms` +
        (r.smoothness
          ? `  p95 ${r.smoothness.p95_ms} ms  dropped ${r.smoothness.dropped_pct}%  loaf ${r.smoothness.long_animation_frames_over_50ms}`
          : "")
    );
  }
}
await browser.close();
writeFileSync(
  outFile,
  JSON.stringify(
    {
      measured_at: new Date().toISOString(),
      base,
      node: process.version,
      results,
    },
    null,
    2
  )
);
console.log("written", outFile);
