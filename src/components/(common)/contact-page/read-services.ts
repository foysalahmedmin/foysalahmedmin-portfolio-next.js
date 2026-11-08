import { ServiceService } from "@/app/api/services/service.service";
import { serviceDefinition } from "@/app/api/services/service.definition";
import type { TPublicServiceDto } from "@/app/api/services/service.type";
import { unstable_cache } from "next/cache";

/** The published services, cached like the page composition reads them; empty if the read fails. */
export const readTopicServices = async (): Promise<
  readonly TPublicServiceDto[]
> => {
  try {
    return await unstable_cache(
      () => ServiceService.getPublicForComposition({ limit: 24, filters: {} }),
      ["portfolio", "contact-topic-services"],
      { tags: [serviceDefinition.cache_tag], revalidate: 60 * 60 }
    )();
  } catch {
    return [];
  }
};
