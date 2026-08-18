import { z } from "zod";

export const CONTENT_ICON_KEYS = [
  "code-window",
  "server-stack",
  "automation-node",
  "system-blueprint",
  "pipeline-stages",
  "full-stack-layers",
  "layers",
  "shield",
  "gauge",
  "workflow",
  "database",
  "cloud",
  "accessibility",
  "award",
  "book",
  "briefcase",
  "graduation-cap",
  "help-circle",
  "quote",
  "file-text",
] as const;

export type TContentIconKey = (typeof CONTENT_ICON_KEYS)[number];
export const contentIconKeySchema = z.enum(CONTENT_ICON_KEYS);

export const shortTextListSchema = z
  .array(z.string().trim().min(1).max(160))
  .max(30);

export const longTextListSchema = z
  .array(z.string().trim().min(1).max(600))
  .max(30);
