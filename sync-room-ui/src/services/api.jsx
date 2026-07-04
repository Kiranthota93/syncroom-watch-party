import axios from "axios";

// In development VITE_API_URL = "http://localhost:8000" (explicit host).
// In production Docker the var is unset — requests go to the page origin
// and nginx proxies /api → backend container.

const API_BASE = import.meta.env.VITE_API_URL ?? "";

const nodeAPI = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 15000,
  withCredentials: true,
});

export default nodeAPI;
