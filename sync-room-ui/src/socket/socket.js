import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_URL;

// In production Docker: var is unset — io() connects to the page origin
// and nginx proxies /socket.io → backend container.

const socket = io(SOCKET_URL, {
  autoConnect: false,
  withCredentials: true,
  transports: ["websocket", "polling"],
});

export default socket;