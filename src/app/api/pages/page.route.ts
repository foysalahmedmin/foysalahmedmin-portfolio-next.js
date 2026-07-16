import type { TPageRouteKey } from "./page.type";
import { pageRouteKeySchema } from "./page.validation";

export type TPageRouteContext = {
  params: Promise<{ routeKey: string }>;
};

export const resolvePageRouteKey = async (
  context: TPageRouteContext
): Promise<TPageRouteKey> =>
  pageRouteKeySchema.parse((await context.params).routeKey);
