import { createRecordRepository } from "../repeatable-content/record.repository";
import { credentialDefinition } from "./credential.definition";

export const CredentialRepository =
  createRecordRepository(credentialDefinition);
