import { z } from "zod";
import { PILLAR_KEYS } from "./pillars";

// Kept out of pillars.ts: that module is imported by client components, and a zod import there would
// ship zod (about 49 KB gzip) in the initial JavaScript of every public route.
export const pillarKeySchema = z.enum(PILLAR_KEYS);
