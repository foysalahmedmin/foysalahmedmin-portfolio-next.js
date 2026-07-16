import { createRecordController } from "../repeatable-content/record.controller";
import { LegalDocumentService } from "./legal-document.service";

export const LegalDocumentController =
  createRecordController(LegalDocumentService);
