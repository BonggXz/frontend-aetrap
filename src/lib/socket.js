// src/lib/socket.js
import { io } from "socket.io-client";
import { API_BASE } from "./api.js";

const SOCKET_BASE = import.meta.env.VITE_SOCKET_BASE || API_BASE;

let socket = null;

export function getSocket() {
  if (socket) return socket;

  socket = io(SOCKET_BASE, {
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 500
  });

  return socket;
}

export function subscribeDevice(deviceId) {
  const s = getSocket();
  s.emit("subscribe", deviceId);
}

export function unsubscribeDevice(deviceId) {
  const s = getSocket();
  s.emit("unsubscribe", deviceId);
}
