const { io } = require("socket.io-client");

const socket = io("http://localhost:5000");

socket.emit("joinRoom", {
  name: "Player2",
  roomCode: "CHGDPC"   // paste your real code
});

socket.on("roomUpdated", (data) => {
  console.log("Players in room:", data.players.length);
});

socket.on("errorMessage", (msg) => {
  console.log("Error:", msg);
});