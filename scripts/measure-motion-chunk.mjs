// Measures the deferred motion chunk (GSAP + ScrollTrigger + SplitText + Lenis + behaviours) from the
// production build, and checks it is never part of a route's initial JavaScript.
//
//   pnpm build && node scripts/measure-motion-chunk.mjs                       size only
//   node scripts/measure-motion-chunk.mjs --base http://127.0.0.1:3107       also check routes
//
// Budget: 60 KB gzip (docs plan 6.2, "Deferred enhancement JS"). gzip level 9 matches
// scripts/measure-initial-js.mjs. Exits 1 when the budget is exceeded or a route loads the chunk up front.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const BUDGET_KB = 60;
const args = process.argv.slice(2);
const baseIndex = args.indexOf("--base");
const base = baseIndex >= 0 ? args.splice(baseIndex, 2)[1] : null;
const routes = args.length
  ? args
  : ["/", "/about", "/contact", "/projects", "/admin/signin"];

// Strings that only exist in the animation libraries
const MARKERS = [/ScrollTrigger/, /SplitText/, /lenis-smooth|lenis-stopped/];

const walk = (directory) =>
  readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });

const root = join(process.cwd(), ".next/static/chunks");
const motion = walk(root)
  .filter((file) => file.endsWith(".js"))
  .map((file) => ({ file, body: readFileSync(file) }))
  .filter(({ body }) =>
    MARKERS.some((marker) => marker.test(body.toString("utf8")))
  )
  .map(({ file, body }) => ({
    name: file.slice(root.length + 1),
    raw: body.length,
    gzip: gzipSync(body, { level: 9 }).length,
  }));

if (motion.length === 0) {
  console.error(
    "No motion chunk found in .next/static/chunks. Run `pnpm build` first."
  );
  process.exit(1);
}

const total = motion.reduce((sum, chunk) => sum + chunk.gzip, 0);
console.log(
  `\nMotion chunk: ${motion.length} file(s), ${(total / 1024).toFixed(1)} KB gzip (budget ${BUDGET_KB} KB)`
);
for (const chunk of motion.sort((a, b) => b.gzip - a.gzip)) {
  console.log(
    `  ${(chunk.gzip / 1024).toFixed(1).padStart(6)} KB  ${(chunk.raw / 1024).toFixed(0).padStart(5)} KB raw  ${chunk.name}`
  );
}

let failed = total > BUDGET_KB * 1024;
if (failed)
  console.error(
    `\nOver budget by ${((total - BUDGET_KB * 1024) / 1024).toFixed(1)} KB.`
  );

if (base) {
  console.log(
    "\nInitial scripts per route (the motion chunk must not be among them):"
  );
  const motionNames = new Set(
    motion.map((chunk) => chunk.name.split("/").pop())
  );
  for (const route of routes) {
    const html = await (await fetch(base + route)).text();
    const sources = [...html.matchAll(/<script([^>]+)>/g)]
      .filter((match) => !/noModule|nomodule/.test(match[1]))
      .map((match) => /src="([^"]+)"/.exec(match[1])?.[1])
      .filter(Boolean);
    const leaked = sources.filter((source) =>
      motionNames.has(source.split("/").pop().split("?")[0])
    );
    console.log(
      `  ${route.padEnd(16)} ${leaked.length === 0 ? "absent from the initial scripts" : `LOADED UP FRONT: ${leaked.join(", ")}`}`
    );
    if (leaked.length > 0) failed = true;
  }
}

process.exit(failed ? 1 : 0);
