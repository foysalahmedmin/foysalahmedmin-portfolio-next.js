# Motion

The motion engine, registry and smoothness harness are Phase 2. This file records what exists now and the rules everything must follow (plan 3.7).

## Tokens (CSS, in `tokens.css`)

| Token           | Value                             | Use                              |
| --------------- | --------------------------------- | -------------------------------- |
| `--dur-micro`   | 120 ms                            | Hover, press                     |
| `--dur-fast`    | 200 ms                            | Toggles, chips                   |
| `--dur-base`    | 360 ms                            | Reveals, panels                  |
| `--dur-slow`    | 640 ms                            | Line reveals, wipes              |
| `--dur-scene`   | 1100 ms                           | Chapter entrances                |
| `--ease-signal` | `cubic-bezier(0.16, 1, 0.3, 1)`   | Default entrance (expo-out feel) |
| `--ease-settle` | `cubic-bezier(0.22, 0.8, 0.2, 1)` | Layout settle                    |
| `--ease-snap`   | `cubic-bezier(0.7, 0, 0.2, 1)`    | Exits and wipes                  |

`src/lib/motion/tokens.ts` mirrors them from Phase 2. The System lab's Motion section previews the easings.

## Present now

- Link underline draw (`.link-draw`), chrome tone cross-fade (`[data-chrome]`), accordion glyph, the existing `Reveal` and `ParallaxLayer` baseline. All stop under `prefers-reduced-motion`.
- The GSAP, Lenis and Three adapters are not installed yet (ADR 0011 allows them, Phase 2 and 3 add them). Nothing in `src/app/admin`, `src/components/admin` or `src/components/ui` may ever import them.

## Rules

1. Every effect declares a trigger, a meaning (transmit, resolve, assemble, respond) and a reduced variant.
2. Only `transform`, `opacity` and `clip-path` animate. No layout properties.
3. Never hide the LCP element or primary content before JavaScript.
4. Pointer effects are fine-pointer only; all hover-revealed information has a focus and tap equivalent.
5. Reduced renders the end frame; off renders the end frame with no transitions.
