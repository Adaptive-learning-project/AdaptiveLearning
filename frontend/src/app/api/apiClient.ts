/**
 * Shared Axios instance for all API calls.
 *
 * In production (Vercel) set the environment variable:
 *   VITE_API_URL=https://adaptivelearning-4thp.onrender.com
 *
 * In local development the variable is optional — if absent, requests go to
 * an empty base URL and are handled by the Vite dev-server proxy (vite.config.ts).
 */
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

// Attach the JWT token (if present) to every outgoing request.
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;
