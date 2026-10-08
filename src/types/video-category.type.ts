export type TVideoCategoryStatus = "active" | "inactive";

export type TVideoCategoryPopulated = {
  _id: string;
  name: string;
  slug?: string;
};

export type TVideoCategory = {
  _id: string;
  sequence: number;
  icon?: string;
  name: string;
  slug: string;
  slug_history?: Array<{ slug: string; changed_at: string }>;
  description?: string;
  status?: TVideoCategoryStatus;
  tags: string[];
  parent?: TVideoCategoryPopulated | null;
  layout?: string;
  created_at?: string;
  updated_at?: string;
};
