const { io } = require("socket.io-client");

const socket = io("http://localhost:5000");

socket.on("connect", () => {
  console.log("Connected:", socket.id);

  socket.emit("rollDice", {
    roomCode: "QD63FE"
  });
});

socket.on("diceRolled", (data) => {
  console.log("Dice:", data.diceValue);
  console.log("Updated state:", data.room.players[0].slots);
});

socket.on("errorMessage", (msg) => {
  console.log("Error:", msg);
});

setInterval(() => {}, 1000);
