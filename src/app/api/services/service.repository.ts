import { createRecordRepository } from "../repeatable-content/record.repository";
import { serviceDefinition } from "./service.definition";

export const ServiceRepository = createRecordRepository(serviceDefinition);
