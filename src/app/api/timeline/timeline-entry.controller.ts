import { createRecordController } from "../repeatable-content/record.controller";
import { TimelineEntryService } from "./timeline-entry.service";

export const TimelineEntryController =
  createRecordController(TimelineEntryService);
