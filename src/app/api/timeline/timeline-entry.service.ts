import { createRecordService } from "../repeatable-content/record.service";
import { timelineEntryDefinition } from "./timeline-entry.definition";
import { TimelineEntryRepository } from "./timeline-entry.repository";

export const TimelineEntryService = createRecordService(
  timelineEntryDefinition,
  TimelineEntryRepository
);
