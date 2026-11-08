import { PublicRoutePage } from "@/components/pages/public-route-page";
import { payload } from "./fixtures";

export const metadata = { title: "Chapters lab" };

/**
 * The real home composition (template, chapter rail and every chapter, tier 2 included) rendered from
 * fixtures, so the chapters can be tested without a seeded database. Served where the Motion lab is
 * (development, or MOTION_LAB=1).
 */
export default function ChaptersLabPage() {
  return <PublicRoutePage payload={payload} />;
}
