import { z } from "zod";

export const PILLAR_CONTRACT_VERSION = 1 as const;

export const PILLAR_CONTRACT = Object.freeze([
  Object.freeze({
    key: "frontend",
    label: "Frontend Engineering",
    order: 1,
    fallback_visual_key: "frontend-grid",
    default_icon_key: "code-window",
    default_accent: "cyan",
  }),
  Object.freeze({
    key: "backend",
    label: "Backend Engineering",
    order: 2,
    fallback_visual_key: "backend-nodes",
    default_icon_key: "server-stack",
    default_accent: "blue",
  }),
  Object.freeze({
    key: "ai_automation",
    label: "AI Automation",
    order: 3,
    fallback_visual_key: "automation-flow",
    default_icon_key: "automation-node",
    default_accent: "violet",
  }),
  Object.freeze({
    key: "system_design",
    label: "System Design",
    order: 4,
    fallback_visual_key: "system-blueprint",
    default_icon_key: "system-blueprint",
    default_accent: "amber",
  }),
  Object.freeze({
    key: "devops_cloud",
    label: "DevOps & Cloud",
    order: 5,
    fallback_visual_key: "pipeline-stages",
    default_icon_key: "pipeline-stages",
    default_accent: "rose",
  }),
  Object.freeze({
    key: "full_stack",
    label: "Full-Stack Development",
    order: 6,
    fallback_visual_key: "full-stack-layers",
    default_icon_key: "full-stack-layers",
    default_accent: "emerald",
  }),
] as const);

export const PILLAR_KEYS = Object.freeze(
  PILLAR_CONTRACT.map(({ key }) => key)
) as readonly [
  "frontend",
  "backend",
  "ai_automation",
  "system_design",
  "devops_cloud",
  "full_stack",
];

export type PillarKey = (typeof PILLAR_KEYS)[number];

export const PILLAR_ICON_KEYS = Object.freeze(
  PILLAR_CONTRACT.map(({ default_icon_key }) => default_icon_key)
) as readonly [
  "code-window",
  "server-stack",
  "automation-node",
  "system-blueprint",
  "pipeline-stages",
  "full-stack-layers",
];

export const PILLAR_ACCENTS = [
  "cyan",
  "blue",
  "violet",
  "amber",
  "rose",
  "emerald",
] as const;

export type PillarIconKey = (typeof PILLAR_ICON_KEYS)[number];
export type PillarAccent = (typeof PILLAR_ACCENTS)[number];

export const pillarKeySchema = z.enum(PILLAR_KEYS);

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
