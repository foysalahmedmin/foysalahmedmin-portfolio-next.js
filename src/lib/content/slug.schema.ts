import { z } from "zod";
import { CONTENT_SLUG_PATTERN, MAX_CONTENT_SLUG_LENGTH } from "./slug";

// Kept out of slug.ts so client-reachable slug helpers do not pull zod into the initial JavaScript.
export const canonicalSlugSchema = z
  .string()
  .min(1)
  .max(MAX_CONTENT_SLUG_LENGTH)
  .regex(CONTENT_SLUG_PATTERN, "Use a canonical lowercase slug");
