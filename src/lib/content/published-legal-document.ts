import { LegalDocumentService } from "@/app/api/legal-documents/legal-document.service";
import type {
  TLegalDocumentType,
  TPublicLegalDocumentDto,
} from "@/app/api/legal-documents/legal-document.type";
import { ENV } from "@/config";

const PUBLIC_LEGAL_DOCUMENT_LIMIT = 50;
const DATABASE_CONFIGURATION_ERROR =
  "Please define the DATABASE_URL environment variable";
const DATABASE_UNAVAILABLE_ERROR_NAMES = new Set([
  "MongoNetworkError",
  "MongoNetworkTimeoutError",
  "MongoNotConnectedError",
  "MongoPoolClearedError",
  "MongoPoolClosedError",
  "MongoServerClosedError",
  "MongoServerSelectionError",
  "MongoTopologyClosedError",
  "MongooseServerSelectionError",
]);
const DATABASE_UNAVAILABLE_ERROR_CODES = new Set<string | number>([
  "EAI_AGAIN",
  "ECONNREFUSED",
  "ECONNRESET",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "ENOTFOUND",
  "ETIMEDOUT",
  6, // HostUnreachable
  7, // HostNotFound
  89, // NetworkTimeout
  91, // ShutdownInProgress
  189, // PrimarySteppedDown
  9001, // SocketException
  11600, // InterruptedAtShutdown
  11602, // InterruptedDueToReplStateChange
  13435, // NotPrimaryNoSecondaryOk
  13436, // NotPrimaryOrSecondary
]);

type ErrorRecord = {
  cause?: unknown;
  code?: unknown;
  name?: unknown;
  message?: unknown;
};

const asErrorRecord = (error: unknown): ErrorRecord | null =>
  error && (typeof error === "object" || typeof error === "function")
    ? (error as ErrorRecord)
    : null;

/**
 * Only connectivity and topology failures are safe to translate to the
 * unpublished fallback. Query, mapping, validation and programming errors
 * must still surface so a broken legal-content contract cannot be hidden.
 */
const isDatabaseUnavailableError = (error: unknown): boolean => {
  const visited = new Set<unknown>();
  let current: unknown = error;

  while (current && !visited.has(current)) {
    visited.add(current);
    const record = asErrorRecord(current);
    if (!record) return false;

    if (
      typeof record.name === "string" &&
      DATABASE_UNAVAILABLE_ERROR_NAMES.has(record.name)
    ) {
      return true;
    }
    if (
      (typeof record.code === "string" || typeof record.code === "number") &&
      DATABASE_UNAVAILABLE_ERROR_CODES.has(record.code)
    ) {
      return true;
    }
    if (record.message === DATABASE_CONFIGURATION_ERROR) return true;

    current = record.cause;
  }

  return false;
};

const reportUnavailableReader = (
  type: TLegalDocumentType,
  reason: "database_not_configured" | "database_unavailable"
): void => {
  console.error("legal_document_published_reader_unavailable", {
    error_code: reason,
    document_type: type,
  });
};

/**
 * Returns the latest reviewed, published document whose effective date has
 * arrived. Future revisions remain private until their effective date.
 */
export const readPublishedLegalDocument = async (
  type: TLegalDocumentType
): Promise<TPublicLegalDocumentDto | null> => {
  if (!ENV.database_url?.trim()) {
    reportUnavailableReader(type, "database_not_configured");
    return null;
  }

  try {
    const result = await LegalDocumentService.getPublicList({
      page: 1,
      limit: PUBLIC_LEGAL_DOCUMENT_LIMIT,
      sort: "effective_at",
      direction: -1,
      filters: { type },
      deleted_scope: "active",
    });

    return result.data[0] ?? null;
  } catch (error) {
    if (!isDatabaseUnavailableError(error)) throw error;
    reportUnavailableReader(type, "database_unavailable");
    return null;
  }
};
