/**
 * Auth API client.
 *
 * Callers use this as a pre-configured Axios instance whose base URL already
 * includes /api/auth, so relative paths like API.post("/register") still work:
 *
 *   API.post("/login", data)     → POST <backend>/api/auth/login
 *   API.post("/register", data)  → POST <backend>/api/auth/register
 *   API.get("/me")               → GET  <backend>/api/auth/me
 */
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "";

const authAPI = axios.create({
  baseURL: `${API_BASE_URL}/api/auth`,
});

authAPI.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default authAPI;
