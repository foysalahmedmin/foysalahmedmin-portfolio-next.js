import { createRecordController } from "../repeatable-content/record.controller";
import { FAQService } from "./faq.service";

export const FAQController = createRecordController(FAQService);
