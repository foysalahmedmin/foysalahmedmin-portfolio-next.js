// Regenerates the effect tables in docs/design-system/motion.md from src/lib/motion/registry.ts.
//   pnpm exec tsx scripts/motion-registry-doc.ts          print the tables
//   pnpm exec tsx scripts/motion-registry-doc.ts --write  update the document in place
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  REGISTRY_END,
  REGISTRY_START,
  registryMarkdown,
} from "../src/lib/motion/registry-doc";

const table = registryMarkdown();
if (!process.argv.includes("--write")) {
  console.log(table);
} else {
  const path = join(process.cwd(), "docs/design-system/motion.md");
  const text = readFileSync(path, "utf8");
  const start = text.indexOf(REGISTRY_START);
  const end = text.indexOf(REGISTRY_END);
  if (start < 0 || end < start) {
    throw new Error(
      `${path} needs ${REGISTRY_START} and ${REGISTRY_END} markers`
    );
  }
  writeFileSync(
    path,
    `${text.slice(0, start + REGISTRY_START.length)}\n\n${table}\n\n${text.slice(end)}`
  );
  console.log("docs/design-system/motion.md updated");
}
