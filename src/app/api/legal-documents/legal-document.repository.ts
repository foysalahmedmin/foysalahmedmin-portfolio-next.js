import { createRecordRepository } from "../repeatable-content/record.repository";
import { legalDocumentDefinition } from "./legal-document.definition";

export const LegalDocumentRepository = createRecordRepository(
  legalDocumentDefinition
);
