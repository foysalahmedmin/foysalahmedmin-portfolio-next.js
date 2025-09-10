import { TProject } from "@/types/project.type";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface ProjectState {
  projects: TProject[];
  project: TProject | null;
  featuredProjects: TProject[];
  isLoading: boolean;
  error: string | null;
}

const initialState: ProjectState = {
  projects: [],
  project: null,
  featuredProjects: [],
  isLoading: false,
  error: null,
};

const projectSlice = createSlice({
  name: "project",
  initialState,
  reducers: {
    fetchProjectsStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    fetchProjectsSuccess: (state, action: PayloadAction<TProject[]>) => {
      state.isLoading = false;
      state.projects = action.payload;
      state.error = null;
    },
    fetchProjectSuccess: (state, action: PayloadAction<TProject>) => {
      state.isLoading = false;
      state.project = action.payload;
      state.error = null;
    },
    fetchFeaturedProjectsSuccess: (state, action: PayloadAction<TProject[]>) => {
      state.isLoading = false;
      state.featuredProjects = action.payload;
      state.error = null;
    },
    projectFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
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