const { io } = require("socket.io-client");

const socket = io("http://localhost:5000");

socket.on("connect", () => {
  console.log("Player2 connected:", socket.id);

  socket.emit("joinRoom", {
    name: "Player2",
    roomCode: "VXZX7E"
  });
});

socket.on("roomUpdated", (data) => {
  console.log("Players in room:", data.players.length);
});

socket.on("errorMessage", (msg) => {
  console.log("Error:", msg);
});

setInterval(() => {}, 1000);