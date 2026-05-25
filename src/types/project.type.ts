import type { TFilePopulated } from './file.type';

export type TProjectStatus =
  | 'planned'
  | 'in_progress'
  | 'on_hold'
  | 'completed'
  | 'cancelled';

export type TUserPopulated = {
  _id: string;
  name: string;
  email: string;
  image?: TFilePopulated | null;
};

export type TProjectCategoryPopulated = {
  _id: string;
  name: string;
  slug: string;
};

export type TProject = {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  content: string;
  thumbnail?: TFilePopulated | null;
  images?: TFilePopulated[];
  tags?: string[];
  category: TProjectCategoryPopulated;
  author: TUserPopulated;
  collaborators?: TUserPopulated[];
  client?: TUserPopulated;
  status: TProjectStatus;
  is_featured: boolean;
  is_premium: boolean;
  started_at?: string;
  ended_at?: string;
  layout?: string;
  created_at?: string;
  updated_at?: string;
};

export type TProjectResponse = {
  success: boolean;
  status: number;
  message?: string;
  data: TProject;
};

export type TProjectsResponse = {
  success: boolean;
  status: number;
  message?: string;
  data: TProject[];
  meta?: {
    total: number;
    page: number;
    limit: number;
  };
};
