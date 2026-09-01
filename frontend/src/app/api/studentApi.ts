/**
 * Student API client.
 *
 * Callers use this as a pre-configured Axios instance whose base URL already
 * includes /api/students, so relative paths like API.get("/") still work:
 *
 *   API.get("/")           → GET  <backend>/api/students/
 *   API.post("/", data)    → POST <backend>/api/students/
 *   API.get(`/${id}`)      → GET  <backend>/api/students/:id
 *   API.put(`/${id}`, …)   → PUT  <backend>/api/students/:id
 *   API.delete(`/${id}`)   → DELETE <backend>/api/students/:id
 */
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "";

const API = axios.create({
  baseURL: `${API_BASE_URL}/api/students`,
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const getStudents = () => API.get("/");

export default API;
