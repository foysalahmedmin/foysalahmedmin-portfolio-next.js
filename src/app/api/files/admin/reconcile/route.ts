import { auth } from "@/middleware/auth.middleware";
import { errorHandler } from "@/utils/error-handler";
import type { NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import * as FileController from "../../file.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const hasReconcileSecret = (req: NextRequest): boolean => {
  const configured = process.env.MEDIA_RECONCILE_SECRET;
  const submitted = req.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");
  if (!configured || !submitted) return false;
  const expected = Buffer.from(configured);
  const actual = Buffer.from(submitted);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
};

export async function POST(req: NextRequest) {
  try {
    if (hasReconcileSecret(req)) {
      return await FileController.reconcileFailedMedia(req);
    }
    return await auth("super-admin")(req, FileController.reconcileFailedMedia);
  } catch (error) {
    return errorHandler(error, req);
  }
}
