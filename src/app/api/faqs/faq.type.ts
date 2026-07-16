import type {
  TAdminRepeatableBaseDto,
  TPublicMediaDto,
  TPublicRepeatableBaseDto,
  TRepeatableRecord,
} from "../repeatable-content/record.type";

export const FAQ_CATEGORIES = [
  "general",
  "services",
  "process",
  "engagement",
  "technical",
] as const;
export type TFaqCategory = (typeof FAQ_CATEGORIES)[number];

export type TFAQ = TRepeatableRecord & {
  answer: string;
  category: TFaqCategory;
  keywords: string[];
  visual_file?: unknown;
};

export type TPublicFAQDto = TPublicRepeatableBaseDto & {
  question: string;
  answer: string;
  category: TFaqCategory;
  keywords: string[];
  visual?: TPublicMediaDto;
};

export type TAdminFAQDto = TAdminRepeatableBaseDto & {
  answer: string;
  category: TFaqCategory;
  keywords: string[];
  visual_file?: string;
};
