import { createRecordService } from "../repeatable-content/record.service";
import { testimonialDefinition } from "./testimonial.definition";
import { TestimonialRepository } from "./testimonial.repository";

export const TestimonialService = createRecordService(
  testimonialDefinition,
  TestimonialRepository
);
