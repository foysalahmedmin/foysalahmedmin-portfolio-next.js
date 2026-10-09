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

## Client boundary rule

`*-variants.ts` files hold the `cva` definitions of client modules (`button-variants.ts`, `form-control-variants.ts`) so server components can style a link or native control without crossing the client boundary. A server component that calls a function exported from a `"use client"` file fails at render.

## Coming

`IconButton`, `LinkButton`, combobox, checkbox, radio, switch, `Timeline`, `CodeBlock`, `MediaFrame`, `DiagramFrame`, `DefinitionList`, `Pagination` restyle, `LabSwitcher`, `NavIndicator`, `Sidebar`, `Alert`, `ProgressLine`, `Tooltip`, `CommandPalette`, `Popover`, `List`, `RowPreview` arrive with the phase that first needs them (Phases 2, 3, 5, 6, 7) and each is added to the System lab with every state.

## Review gate

The anti-template checklist (plan Appendix D) applies to every PR that touches UI.
