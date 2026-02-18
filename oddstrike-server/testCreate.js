const { io } = require("socket.io-client");

const socket = io("http://localhost:5000");

socket.emit("createRoom", { name: "Player1" });

socket.on("roomCreated", (data) => {
  console.log("Room Created:", data.roomCode);
});

socket.on("disconnect", () => {
  console.log("Player1 disconnected");
});

setInterval(() => {}, 1000);