const { io } = require("socket.io-client");

const socket = io("http://localhost:5000");

socket.emit("startGame", {
  roomCode: "VXZX7E"
});

socket.on("gameStarted", (data) => {
  console.log("Game Started. Current Turn:", data.currentTurn);
});

socket.on("errorMessage", (msg) => {
  console.log("Error:", msg);
});