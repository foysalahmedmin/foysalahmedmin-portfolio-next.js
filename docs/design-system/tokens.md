# Portfolio design tokens

The visual system uses semantic tokens. Components should describe intent
(`background`, `surface-raised`, `muted-foreground`, `success`) instead of
choosing a raw color. The five pillar accents are reserved for pillar identity,
diagrams, filters, and short emphasis—not body copy.

## Surfaces and hierarchy

- `background`: page canvas.
- `surface-subtle`: quiet section or input background.
- `surface-raised`: cards, popovers, and elevated navigation.
- `surface-inverse`: rare high-contrast bands.
- `border` / `border-strong`: default and emphasized separation.
- `overlay`: modal/drawer scrim.

## Status colors

Use paired foreground values for filled status surfaces. Never communicate a
state through color alone; keep a text label or icon with an accessible name.

## Pillars

The canonical order is Frontend, Backend, AI Automation, System Design, and
Full-Stack. Each has an accent plus a low-chroma surface token in both themes.
Do not remap colors per page.

## Layout and type

Use the `Container`, `Section`, `Stack`, `Cluster`, `Grid`, and `Bleed`
primitives. `wide` supports the 12-column 1360px composition, `content` supports
normal page narratives, and `reading` bounds long-form copy. Fluid type classes
are `type-display`, `type-heading-1/2/3`, `type-lead`, `type-label`, and
`type-metric`; sanitized long-form content uses `editorial`.

## Motion

Durations, easing, reveal distance, and parallax depths are tokenized. Motion
may change transform and opacity only unless a component-specific review says
otherwise. OS/user reduced motion always wins.
