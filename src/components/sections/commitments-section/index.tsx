import type { TPublicSiteDto } from "@/app/api/site/site.type";

type Props = Readonly<{
  site: TPublicSiteDto;
  heading?: string;
  /** `default` reads `site.commitments`; `principles` reads `site.principles`. */
  layout?: string;
}>;

/** Chapters 7 and 7a, commitments and how I think (docs plan 4.1). Stub: the slice that owns it replaces this body. */
export default function CommitmentsSection(props: Props) {
  void props;
  return null;
}
