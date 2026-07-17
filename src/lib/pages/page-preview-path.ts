import type { TPageRouteKey } from "@/app/api/pages/page.type";

export const getAdminPagePreviewPath = (routeKey: TPageRouteKey): string =>
  `/admin/preview/pages/${routeKey}`;
