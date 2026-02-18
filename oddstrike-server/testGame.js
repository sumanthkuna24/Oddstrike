const { io } = require("socket.io-client");

const socket = io("http://localhost:5000");

let roomCode = "";

socket.on("connect", () => {
  console.log("Connected as Player1:", socket.id);

  socket.emit("createRoom", { name: "Player1" });
});

socket.on("roomCreated", (room) => {
  roomCode = room.roomCode;
  console.log("Room Created:", roomCode);
  console.log("Now run testJoin.js to add Player2");
  socket.emit("startGame", { roomCode });
});

socket.on("gameStarted", (room) => {
  console.log("Game Started!");

  // Player1 rolls dice
  socket.emit("rollDice", { roomCode });
});

socket.on("diceRolled", (data) => {
  console.log("Dice rolled:", data.diceValue);
  console.log("Updated slots:", data.room.players[0].slots);
});

socket.on("errorMessage", (msg) => {
  console.log("Error:", msg);
});

setInterval(() => {}, 1000);