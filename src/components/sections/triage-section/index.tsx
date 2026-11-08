import type { TPublicServiceDto } from "@/app/api/services/service.type";

type Props = Readonly<{
  services: readonly TPublicServiceDto[];
  heading?: string;
}>;

/** Chapter 1, triage (docs plan 4.1). Stub: the slice that owns it replaces this body. */
export default function TriageSection(props: Props) {
  void props;
  return null;
}
