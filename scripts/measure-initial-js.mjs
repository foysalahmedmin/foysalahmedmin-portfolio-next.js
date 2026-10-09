// Itemises the initial JavaScript of a route against a running production server
// (`pnpm build && pnpm start -p 3107`): every <script src> in the served HTML, its gzip size and a
// best-effort attribution from marker strings. The budget figure is gzip level 9 (ADR 0009, 180 KB);
// production CDNs serve brotli, which is smaller. `nomodule` polyfills are excluded: modern browsers never fetch them.
//
// Usage: node scripts/measure-initial-js.mjs [route ...] [--base http://127.0.0.1:3107]
import { brotliCompressSync, constants, gzipSync } from "node:zlib";

const args = process.argv.slice(2);
const baseIndex = args.indexOf("--base");
const base =
  baseIndex >= 0 ? args.splice(baseIndex, 2)[1] : "http://127.0.0.1:3107";
const routes = args.length ? args : ["/", "/contact", "/admin/signin"];

const markers = [
  ["lucide icons", /lucide lucide-|lucide-react/],
  ["react-dom", /react-dom|ReactDOMClient|scheduler/],
  ["react-redux / toolkit", /redux|toolkit|RTK|immer/i],
  ["next/image", /next\/image|__NEXT_IMAGE/],
  ["next router/app", /app-router|__NEXT_DATA__|next-router/],
  ["zod", /ZodError|zod/],
  ["react-player / media", /react-player|hls\.js|media-chrome|mux/],
];

const attribute = (text) =>
  markers.filter(([, pattern]) => pattern.test(text)).map(([label]) => label);

for (const route of routes) {
  const response = await fetch(base + route);
  const html = await response.text();
  // `nomodule` scripts are legacy polyfills that browsers with ES modules never download
  const sources = [...html.matchAll(/<script([^>]+)>/g)]
    .filter((m) => !/noModule|nomodule/.test(m[1]))
    .map((m) => /src="([^"]+)"/.exec(m[1])?.[1])
    .filter(Boolean);
  const rows = [];
  for (const source of new Set(sources)) {
    const body = Buffer.from(
      await (await fetch(new URL(source, base))).arrayBuffer()
    );
    rows.push({
      file: source.replace("/_next/static/", ""),
      raw: body.length,
      gzip: gzipSync(body, { level: 9 }).length,
      brotli: brotliCompressSync(body, {
        params: { [constants.BROTLI_PARAM_QUALITY]: 11 },
      }).length,
      guess: attribute(body.toString("utf8")).join(", "),
    });
  }
  rows.sort((a, b) => b.gzip - a.gzip);
  const total = rows.reduce((sum, row) => sum + row.gzip, 0);
  const totalBrotli = rows.reduce((sum, row) => sum + row.brotli, 0);
  console.log(
    `\n${route}  ${rows.length} scripts  ${(total / 1024).toFixed(1)} KB gzip (budget measure)  ${(totalBrotli / 1024).toFixed(1)} KB brotli`
  );
  for (const row of rows) {
    console.log(
      `  ${(row.gzip / 1024).toFixed(1).padStart(6)} KB  ${(row.raw / 1024).toFixed(0).padStart(5)} KB raw  ${row.file.slice(0, 44).padEnd(44)} ${row.guess}`
    );
  }
}
