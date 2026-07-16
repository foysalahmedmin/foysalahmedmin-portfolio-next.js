import { errorHandler } from "@/utils/error-handler";
import type { NextRequest } from "next/server";
import * as AuthController from "../auth.controller";

export async function POST(req: NextRequest) {
  try {
    return await AuthController.signout(req);
  } catch (error) {
    return errorHandler(error, req);
  }
}
