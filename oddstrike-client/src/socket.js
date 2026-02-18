import { io } from "socket.io-client";

const socket = io("https://oddstrike-server.onrender.com", {
  transports: ["polling", "websocket"],
  withCredentials: true
});

export default socket;