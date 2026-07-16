import { createRecordService } from "../repeatable-content/record.service";
import { serviceDefinition } from "./service.definition";
import { ServiceRepository } from "./service.repository";

export const ServiceService = createRecordService(
  serviceDefinition,
  ServiceRepository
);
