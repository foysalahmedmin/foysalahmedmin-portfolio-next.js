import { createRecordController } from "../repeatable-content/record.controller";
import { CredentialService } from "./credential.service";

export const CredentialController = createRecordController(CredentialService);
