import { createRecordService } from "../repeatable-content/record.service";
import { credentialDefinition } from "./credential.definition";
import { CredentialRepository } from "./credential.repository";

export const CredentialService = createRecordService(
  credentialDefinition,
  CredentialRepository
);
