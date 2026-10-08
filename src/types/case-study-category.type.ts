export type TCaseStudyCategoryStatus = "active" | "inactive";

export type TCaseStudyCategoryPopulated = {
  _id: string;
  name: string;
  slug?: string;
};

export type TCaseStudyCategory = {
  _id: string;
  sequence: number;
  icon?: string;
  name: string;
  slug: string;
  slug_history?: Array<{ slug: string; changed_at: string }>;
  description?: string;
  status?: TCaseStudyCategoryStatus;
  tags: string[];
  parent?: TCaseStudyCategoryPopulated | null;
  layout?: string;
  created_at?: string;
  updated_at?: string;
};
