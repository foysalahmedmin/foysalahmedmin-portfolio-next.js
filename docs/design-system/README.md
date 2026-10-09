# Signal design system

One monochrome system on two surfaces. The plan is [`docs/plans/2026-10-08-monochrome-systems-ui-overhaul.md`](../plans/2026-10-08-monochrome-systems-ui-overhaul.md) and the decision record is [ADR 0011](../architecture/0011-monochrome-surfaces-motion-and-3d.md). These files describe what is built; they change in the same PR as any system change.

| File                                   | Contents                                                                   |
| -------------------------------------- | -------------------------------------------------------------------------- |
| [`tokens.md`](./tokens.md)             | Ramp, semantic tokens, tones, density, radius, glass, focus, state, layers |
| [`archetypes.md`](./archetypes.md)     | The page archetypes, their templates, page anatomy and how to add a route  |
| [`archetypes.json`](./archetypes.json) | The contract the consistency probe and a unit test read                    |
| [`components.md`](./components.md)     | The component contract and what exists today                               |
| [`motion.md`](./motion.md)             | Motion tokens and rules (the engine and registry arrive in Phase 2)        |

## Where to look

- **System lab:** `/admin/design-system` (private) renders every token, type step, glass tier and component in ink and paper, comfortable and compact, public and console. It is the fastest consistency regression target.
- **Source:** tokens and styles in `src/assets/styles/public/`, primitives in `src/components/ui/`, templates in `src/components/templates/`, the System lab in `src/components/design-system/`.

## How consistency is enforced

| Check                                      | What it proves                                                                                                                           |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `tests/unit/token-contrast.test.ts`        | Contrast is computed from `tokens.css`: text pairs, control borders, focus ring, glass rules                                             |
| `tests/unit/monochrome-guard.test.ts`      | No hue in any public style file, no legacy colour token reaches the public surface un-remapped                                           |
| `tests/unit/design-lint.test.ts`           | No colour literal, palette utility, arbitrary radius/shadow/background or large radius outside the allowlist; the allowlist only shrinks |
| `tests/unit/archetypes.test.ts`            | `archetypes.json`, the template registry and the route tree agree                                                                        |
| `tests/unit/client-bundle-hygiene.test.ts` | Client-reachable modules never import zod, sanitize-html or the lucide namespace                                                         |
| `tests/unit/font-fallbacks.test.ts`        | The calibrated display fallbacks stay wired to the type classes                                                                          |
| `tests/e2e/consistency.spec.ts`            | Every public route, both themes: header, H1, container edge, padding, CtaBand, footer                                                    |
| `tests/e2e/chrome-tone.spec.ts`            | Fixed chrome adopts the band beneath it and stays legible                                                                                |
| `tests/e2e/public-quality.spec.ts`         | Landmarks, axe (WCAG 2.2 AA tags) and no overflow on every public route, both themes                                                     |

## Measuring

`node scripts/measure-initial-js.mjs <routes> [--base url]` itemises initial JavaScript (gzip level 9 is the budget figure, brotli is what a CDN serves). `node scripts/measure-baseline.mjs <base> <out.json>` records load metrics and scroll smoothness. Both run against a production server.
