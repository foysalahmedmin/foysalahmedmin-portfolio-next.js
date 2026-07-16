import { createRecordService } from "../repeatable-content/record.service";
import { faqDefinition } from "./faq.definition";
import { FAQRepository } from "./faq.repository";

export const FAQService = createRecordService(faqDefinition, FAQRepository);
