import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_URL || "";

console.log("SOCKET_URL =", SOCKET_URL);

const socket = io(SOCKET_URL, {
  autoConnect: false,
  withCredentials: true,
  transports: ["websocket", "polling"],
});

export default socket;