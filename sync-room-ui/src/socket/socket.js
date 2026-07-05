import { io } from "socket.io-client";
import { resolveSocketUrl } from "./socketConfig";

const SOCKET_URL = resolveSocketUrl();

const socket = io(SOCKET_URL, {
  autoConnect: false,
  withCredentials: true,
  transports: ["websocket", "polling"],
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 10000,
});

export default socket;