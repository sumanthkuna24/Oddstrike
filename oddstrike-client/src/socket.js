import { io } from "socket.io-client";

const socket = io("https://oddstrike-server.onrender.com",{transports:["websocket"]});

export default socket;