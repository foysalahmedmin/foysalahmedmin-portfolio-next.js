import { createRecordService } from "../repeatable-content/record.service";
import { legalDocumentDefinition } from "./legal-document.definition";
import { LegalDocumentRepository } from "./legal-document.repository";

export const LegalDocumentService = createRecordService(
  legalDocumentDefinition,
  LegalDocumentRepository
);
