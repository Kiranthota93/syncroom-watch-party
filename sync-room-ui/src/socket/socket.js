import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_URL || "";
const SOCKET_URL_1 = import.meta.env.VITE_SOCKET_URL || "";


console.log("SOCKET_URL =", SOCKET_URL);
console.log("SOCKET_URL_1 =", SOCKET_URL_1);

const socket = io(SOCKET_URL, {
  autoConnect: false,
  withCredentials: true,
  transports: ["websocket", "polling"],
});

export default socket;