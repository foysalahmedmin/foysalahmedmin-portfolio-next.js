import { createRecordController } from "../repeatable-content/record.controller";
import { ServiceService } from "./service.service";

export const ServiceController = createRecordController(ServiceService);
