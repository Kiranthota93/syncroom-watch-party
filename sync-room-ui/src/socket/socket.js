import { io } from "socket.io-client";

// In development: VITE_API_URL = "http://localhost:8000" — connect directly.
// In production Docker: var is unset — io() connects to the page origin
// and nginx proxies /socket.io → backend container.
const socket = io(import.meta.env.VITE_API_URL || undefined, {
  autoConnect:     false,
  withCredentials: true,
});

export default socket;
