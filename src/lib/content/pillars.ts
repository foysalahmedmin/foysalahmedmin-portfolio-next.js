export const PILLAR_CONTRACT_VERSION = 1 as const;

// The portfolio presents three client-facing roles. Each one answers "what
// problem can this person take off my hands?" rather than "which tools are
// known?", so labels name a role and the technology detail lives in skills.
export const PILLAR_CONTRACT = Object.freeze([
  Object.freeze({
    key: "system_architect",
    label: "System Architect",
    order: 1,
    fallback_visual_key: "system-blueprint",
    default_icon_key: "system-blueprint",
    default_accent: "amber",
  }),
  Object.freeze({
    key: "software_developer",
    label: "Software Developer",
    order: 2,
    fallback_visual_key: "full-stack-layers",
    default_icon_key: "full-stack-layers",
    default_accent: "emerald",
  }),
  Object.freeze({
    key: "ai_automation",
    label: "AI Automation Developer",
    order: 3,
    fallback_visual_key: "automation-flow",
    default_icon_key: "automation-node",
    default_accent: "violet",
  }),
] as const);

export const PILLAR_KEYS = Object.freeze(
  PILLAR_CONTRACT.map(({ key }) => key)
) as readonly ["system_architect", "software_developer", "ai_automation"];

export type PillarKey = (typeof PILLAR_KEYS)[number];

export const PILLAR_ICON_KEYS = Object.freeze(
  PILLAR_CONTRACT.map(({ default_icon_key }) => default_icon_key)
) as readonly ["system-blueprint", "full-stack-layers", "automation-node"];

// Shared palette: every accent has a matching design token, so a pillar may
// only pick from this list.
export const PILLAR_ACCENTS = [
  "cyan",
  "blue",
  "violet",
  "amber",
  "emerald",
] as const;

export type PillarIconKey = (typeof PILLAR_ICON_KEYS)[number];
export type PillarAccent = (typeof PILLAR_ACCENTS)[number];

export const getPillarLabel = (key: PillarKey): string =>
  PILLAR_CONTRACT.find((pillar) => pillar.key === key)!.label;

export const PILLAR_RELATIONSHIP_OPTIONS = Object.freeze(
  PILLAR_CONTRACT.map(({ key, label, order }) => ({ key, label, order }))
);

export const getPillarContract = (key: PillarKey) =>
  PILLAR_CONTRACT.find((pillar) => pillar.key === key)!;

export const normalizePillarRelationships = (
  primary: PillarKey | undefined,
  secondary: readonly PillarKey[] | undefined
): PillarKey[] =>
  [...new Set(secondary ?? [])].filter((key) => key !== primary);
