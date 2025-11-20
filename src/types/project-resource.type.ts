// Frontend types with populated data (for API responses)

export type TProjectResourceType =
  | 'repository'
  | 'design'
  | 'documentation'
  | 'other';

export type TProjectPopulated = {
  _id: string;
  name: string;
  slug: string;
};

export type TProjectResource = {
  _id: string;
  project: TProjectPopulated;
  sequence: number;
  type: TProjectResourceType;
  title: string;
  url: string;
  description?: string;
  is_private: boolean;
  created_at?: string;
  updated_at?: string;
};

export type TProjectResourceResponse = {
  success: boolean;
  status: number;
  message?: string;
  data: TProjectResource;
};

export type TProjectResourcesResponse = {
  success: boolean;
  status: number;
  message?: string;
  data: TProjectResource[];
  meta?: {
    total: number;
    page: number;
    limit: number;
  };
};
