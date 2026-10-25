# Components

One implementation per component, used by both surfaces; density comes from the surface. Variants are declared with `class-variance-authority`. No component accepts a raw colour, radius or shadow.

## Built in Phase 1

| Group      | Component                                                                          | File                                                                       | Notes                                                                                                           |
| ---------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Actions    | `Button`, `buttonVariants`                                                         | `ui/button.tsx`, `ui/button-variants.ts`                                   | Hover reads `--btn-hover-*` (legacy values as fallback). Carries `data-variant`.                                |
| Actions    | `TextLink`                                                                         | `ui/text-link.tsx`                                                         | `inline` keeps an underline at rest (WCAG 1.4.1); `quiet` draws in on hover and focus.                          |
| Inputs     | `FormControl`, `formControlVariants`, `FieldError`                                 | `ui/form-control.tsx`, `ui/form-control-variants.ts`, `ui/field-error.tsx` | Invalid is a dashed border plus an `Error:` message with a glyph.                                               |
| Display    | `Panel`, `Tag`, `Metric`, `Glass`, `Hairline`, `CornerTicks`, `MonoLabel`          | `ui/*.tsx`                                                                 | `Panel` variants flat, glass, inverse; `ticks` adds corner marks.                                               |
| Display    | `StatusMark`                                                                       | `ui/status-mark.tsx`                                                       | Ten states, shape plus a required text label. Used for metric verification now; the admin adopts it in Phase 7. |
| Navigation | `SystemPath`, `Tabs`, `Breadcrumb`                                                 | `ui/system-path.tsx`, `ui/tabs.tsx`, `ui/breadcrumb.tsx`                   | `SystemPath` replaces the visual breadcrumb on public pages.                                                    |
| Feedback   | `Toast`, `Skeleton`, `EmptyState`, `ErrorState`, `StaleState`, `ArchetypeSkeleton` | `ui/toast.tsx`, `ui/async-state.tsx`, `templates/archetype-skeleton.tsx`   | `Toast` is presentational; the queue arrives with the console shell.                                            |
| Disclosure | `Accordion`, `AccordionItem`                                                       | `ui/accordion.tsx`                                                         | Native `<details>`: works without JavaScript.                                                                   |
| Overlay    | `Modal`, `Drawer`                                                                  | `ui/modal.tsx`, `ui/drawer.tsx`                                            | Tokenised through `--overlay`; glass tier 3 and the palette arrive with Phase 2 and 7.                          |
| Data       | `Table`, `DataTable`                                                               | `ui/table.tsx`, `ui/data-table.tsx`                                        | Restyled with the console `DataTable` in Phase 7.                                                               |
| Templates  | `PageHeader`, `CtaBand`, the eight public templates, six console stubs             | `templates/*`                                                              | See [archetypes.md](./archetypes.md).                                                                           |
| Surface    | `SurfaceMarker`, `ChromeToneController`                                            | `surface/*`                                                                | Keep `<html>` and the font classes right; flip chrome tone without React state.                                 |

## Built in Phase 2

| Group       | Component                                                                   | File                                                            | Notes                                                                                                         |
| ----------- | --------------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Motion      | `Reveal` (server), `AnimationApplier`                                       | `motion/reveal.tsx`, `appliers/animation-applier.tsx`           | Below-the-fold blocks rise 16 px and fade; the first screen is never marked. `variant="wipe"` for media.      |
| Motion      | `TextReveal`, `Counter`, `Magnetic`, `Cursor`                               | `motion/*.tsx`                                                  | Need the engine; plain text, final number, plain wrapper and nothing without it. Magnetic and cursor: tier 3. |
| Motion      | `PinScene`, `PinBeat`, `TraceRail`                                          | `motion/pin-scene.tsx`, `motion/trace-rail.tsx`                 | Sticky track, not a fixed pin. The rail needs no engine.                                                      |
| Navigation  | `RouteTransitions`, `ScrollRestoration`                                     | `motion/route-transitions.tsx`, `motion/scroll-restoration.tsx` | The route shutter on View Transitions; exact scroll restoration on back and forward.                          |
| Overlay     | `CommandPalette`                                                            | `motion/command-palette.tsx`                                    | Dialog plus combobox plus listbox. Ctrl/Cmd+K or the header button. A deferred chunk.                         |
| Preferences | `MotionPreferences`                                                         | `ui/motion-preferences.tsx`                                     | Motion (Auto, Full, Reduced, Off) and 3D scene (Live, Still), in the footer; also in the palette.             |
| Engine      | `EngineProvider`, `MotionEngineHost`, `PublicEnhancements`, `PublicSurface` | `motion/*.tsx`, `surface/public-surface.tsx`                    | The engine reaches components through `useEngine()`; none of them import the animation libraries.             |

See [`motion.md`](./motion.md) for usage, the engine, the harness and the registry.

## Client boundary rule

`*-variants.ts` files hold the `cva` definitions of client modules (`button-variants.ts`, `form-control-variants.ts`) so server components can style a link or native control without crossing the client boundary. A server component that calls a function exported from a `"use client"` file fails at render.

## Coming

`IconButton`, `LinkButton`, combobox, checkbox, radio, switch, `Timeline`, `CodeBlock`, `MediaFrame`, `DiagramFrame`, `DefinitionList`, `Pagination` restyle, `LabSwitcher`, `NavIndicator`, `Sidebar`, `Alert`, `ProgressLine`, `Tooltip`, `Popover`, `List`, `RowPreview` arrive with the phase that first needs them (Phases 3, 5, 6, 7) and each is added to the System lab with every state.

## Review gate

The anti-template checklist (plan Appendix D) applies to every PR that touches UI.
