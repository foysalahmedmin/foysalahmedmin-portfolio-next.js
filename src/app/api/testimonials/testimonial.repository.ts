import { createRecordRepository } from "../repeatable-content/record.repository";
import { testimonialDefinition } from "./testimonial.definition";

export const TestimonialRepository = createRecordRepository(
  testimonialDefinition
);
