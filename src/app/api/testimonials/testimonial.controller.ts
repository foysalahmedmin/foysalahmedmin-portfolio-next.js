import { createRecordController } from "../repeatable-content/record.controller";
import { TestimonialService } from "./testimonial.service";

export const TestimonialController = createRecordController(TestimonialService);
