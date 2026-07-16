import { createRecordRepository } from "../repeatable-content/record.repository";
import { timelineEntryDefinition } from "./timeline-entry.definition";

export const TimelineEntryRepository = createRecordRepository(
  timelineEntryDefinition
);
