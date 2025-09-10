import { createAsyncThunk } from "@reduxjs/toolkit";
import {
  fetchFeaturedProjectsSuccess,
  fetchProjectsStart,
  fetchProjectsSuccess,
  fetchProjectSuccess,
  projectFailure,
} from "./projectSlice";

// Fetch all projects
export const fetchProjects = createAsyncThunk(
  "projects/fetchProjects",
  async (
    params: { page?: number; limit?: number; category?: string } = {},
    { dispatch }
  ) => {
    try {
      dispatch(fetchProjectsStart());

      const { page = 1, limit = 10, category } = params;
      let url = `/api/projects?page=${page}&limit=${limit}`;

      if (category) {
        url += `&category=${category}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "Failed to fetch projects");
      }

      dispatch(fetchProjectsSuccess(data.data));
      return data.data;
    } catch (error: any) {
      dispatch(projectFailure(error.message || "Failed to fetch projects"));
      throw error;
    }
  }
);

// Fetch featured projects
export const fetchFeaturedProjects = createAsyncThunk(
  "projects/fetchFeaturedProjects",
  async (_, { dispatch }) => {
    try {
      dispatch(fetchProjectsStart());

      const response = await fetch("/api/projects?featured=true&limit=6");
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "Failed to fetch featured projects");
      }

      dispatch(fetchFeaturedProjectsSuccess(data.data.projects));
      return data.data.projects;
    } catch (error: any) {
      dispatch(
        projectFailure(error.message || "Failed to fetch featured projects")
      );
      throw error;
    }
  }
);

// Fetch single project by slug
export const fetchProjectBySlug = createAsyncThunk(
  "projects/fetchProjectBySlug",
  async (slug: string, { dispatch }) => {
    try {
      dispatch(fetchProjectsStart());

      const response = await fetch(`/api/projects/${slug}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "Failed to fetch project");
      }

      dispatch(fetchProjectSuccess(data.data.project));
      return data.data.project;
    } catch (error: any) {
      dispatch(projectFailure(error.message || "Failed to fetch project"));
      throw error;
    }
  }
);
