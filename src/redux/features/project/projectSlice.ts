import { TProject } from "@/types/project.type";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

type Pagination = {
  total: number;
  page: number;
  limit: number;
  pages: number;
};

interface ProjectState {
  projects: TProject[];
  project: TProject | null;
  featuredProjects: TProject[];
  pagination: Pagination | null;
  loading: boolean;
  error: string | null;
}

const initialState: ProjectState = {
  projects: [],
  project: null,
  featuredProjects: [],
  pagination: null,
  loading: false,
  error: null,
};

const projectSlice = createSlice({
  name: "project",
  initialState,
  reducers: {
    fetchProjectsStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchProjectsSuccess: (
      state,
      action: PayloadAction<{ projects: TProject[]; pagination: Pagination }>
    ) => {
      state.loading = false;
      state.projects = action.payload.projects;
      state.pagination = action.payload.pagination;
      state.error = null;
    },
    fetchProjectSuccess: (state, action: PayloadAction<TProject>) => {
      state.loading = false;
      state.project = action.payload;
      state.error = null;
    },
    fetchFeaturedProjectsSuccess: (state, action: PayloadAction<TProject[]>) => {
      state.loading = false;
      state.featuredProjects = action.payload;
      state.error = null;
    },
    projectFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    clearProjectError: (state) => {
      state.error = null;
    },
  },
});

export const {
  fetchProjectsStart,
  fetchProjectsSuccess,
  fetchProjectSuccess,
  fetchFeaturedProjectsSuccess,
  projectFailure,
  clearProjectError,
} = projectSlice.actions;

export default projectSlice.reducer;