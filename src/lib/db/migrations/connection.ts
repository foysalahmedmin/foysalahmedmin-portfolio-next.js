import { MigrationError } from "./errors.ts";

export function getExplicitMigrationDatabaseName(databaseUrl: string): string {
  const schemeEnd = databaseUrl.indexOf("://");
  const scheme = schemeEnd >= 0 ? databaseUrl.slice(0, schemeEnd) : "";
  if (scheme !== "mongodb" && scheme !== "mongodb+srv") {
    throw new MigrationError(
      "MIGRATION_DATABASE_URL_INVALID",
      "DATABASE_URL must be a valid MongoDB URL with an explicit database name."
    );
  }

  const authorityAndPath = databaseUrl.slice(schemeEnd + 3);
  const pathStart = authorityAndPath.indexOf("/");
  const encodedName =
    pathStart >= 0
      ? authorityAndPath.slice(pathStart + 1).split("?", 1)[0]
      : "";

  let databaseName = "";
  try {
    databaseName = decodeURIComponent(encodedName).trim();
  } catch {
    databaseName = "";
  }

  if (!databaseName || databaseName.includes("/") || databaseName.includes("\0")) {
    throw new MigrationError(
      "MIGRATION_DATABASE_URL_INVALID",
      "DATABASE_URL must be a valid MongoDB URL with an explicit database name."
    );
  }

  return databaseName;
}
