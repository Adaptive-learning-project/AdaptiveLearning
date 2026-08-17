import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api",
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

export const getAnalytics = () => API.get("/results/analytics");
export const getAllResults = () => API.get("/results/all");

export default API;