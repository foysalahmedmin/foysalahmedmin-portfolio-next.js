export { ConsolePageHeader, type ConsolePageHeaderProps } from "./page-header";
export { ConsoleToolbar, type ConsoleToolbarProps } from "./toolbar";
export {
  ConsoleEmpty,
  ConsoleError,
  ConsoleFilteredEmpty,
  ConsoleListSkeleton,
} from "./list-states";
export {
  EditorActionBar,
  EditorHeader,
  EditorSection,
  ValidationSummary,
  type EditorHeaderProps,
  type ValidationIssue,
} from "./editor-parts";
export { SectionIndex, type SectionIndexItem } from "./section-index";
export { UnsavedChangesGuard } from "./unsaved-guard";
// The region templates (C2 list, C3 editor, C4 inbox) live with the other archetypes
export {
  ConsoleEditor,
  ConsoleInbox,
  ConsoleList,
} from "@/components/templates/console-templates";
