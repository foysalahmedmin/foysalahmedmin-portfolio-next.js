/**
 * Page archetypes (docs plan 3.12). Every route belongs to exactly one archetype and every archetype
 * has exactly one template in this directory. `docs/design-system/archetypes.json` is the contract the
 * consistency probe reads; tests/unit/archetypes.test.ts keeps the two in step.
 */
export const PUBLIC_ARCHETYPES = {
  A1: { name: "Chapter", template: "ChapterPage" },
  A2: { name: "Index", template: "IndexLayout" },
  A3: { name: "Story", template: "StoryLayout" },
  A4: { name: "Detail", template: "DetailLayout" },
  A5: { name: "Narrative", template: "NarrativePage" },
  A6: { name: "Conversation", template: "ConversationLayout" },
  A7: { name: "Document", template: "DocumentLayout" },
  A8: { name: "System", template: "SystemPage" },
} as const;

export const CONSOLE_ARCHETYPES = {
  C1: { name: "Overview", template: "ConsoleOverview" },
  C2: { name: "Workspace list", template: "ConsoleList" },
  C3: { name: "Editor", template: "ConsoleEditor" },
  C4: { name: "Inbox", template: "ConsoleInbox" },
  C5: { name: "Settings", template: "ConsoleSettings" },
  C6: { name: "Auth", template: "ConsoleAuth" },
} as const;

export type PublicArchetypeId = keyof typeof PUBLIC_ARCHETYPES;
export type ConsoleArchetypeId = keyof typeof CONSOLE_ARCHETYPES;
export type ArchetypeId = PublicArchetypeId | ConsoleArchetypeId;
