import { createRecordRepository } from "../repeatable-content/record.repository";
import { faqDefinition } from "./faq.definition";

export const FAQRepository = createRecordRepository(faqDefinition);
