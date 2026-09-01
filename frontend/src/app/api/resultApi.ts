/**
 * Results API client.
 *
 * Callers use this as a pre-configured Axios instance whose base URL already
 * includes /api, so relative paths like API.post("/results") still work.
 */
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "";

const API = axios.create({
  baseURL: `${API_BASE_URL}/api`,
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const saveResult = (data: any) =>
  API.post("/results", data);

export const getResults = (studentId: string) =>
  API.get(`/results/student/${studentId}`);

export const getAdaptiveSummary = (studentId: string) =>
  API.get(`/results/adaptive/${studentId}`);

export const getAnalytics = () =>
  API.get("/results/analytics");

export const getAllResults = () =>
  API.get("/results/all");

export default API;
