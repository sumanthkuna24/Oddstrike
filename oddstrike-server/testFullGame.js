const { io } = require("socket.io-client");

const socket1 = io("http://localhost:5000");
const socket2 = io("http://localhost:5000");

let roomCode = "";

// Player1 connects
socket1.on("connect", () => {
  console.log("Player1 connected:", socket1.id);
  socket1.emit("createRoom", { name: "Player1" });
});

// Room created
socket1.on("roomCreated", (room) => {
  roomCode = room.roomCode;
  console.log("Room Created:", roomCode);

  // Player2 joins
  socket2.emit("joinRoom", {
    name: "Player2",
    roomCode
  });
});

// After Player2 joins, start game
socket2.on("roomUpdated", (room) => {
  if (room.players.length === 2) {
    console.log("Both players joined. Starting game...");
    socket1.emit("startGame", { roomCode });
  }
});

// Game started
socket1.on("gameStarted", (room) => {
  console.log("Game started!");

  // Player1 rolls
  socket1.emit("rollDice", { roomCode });
});

// Dice result
socket1.on("diceRolled", (data) => {
  console.log("Dice:", data.diceValue);

  if (data.isBullet) {
    console.log("Bullet ready! Killing Player2 slot 3");

    socket1.emit("killPlayer", {
      roomCode,
      targetPlayerIndex: 1,
      targetNumber: 3
    });
  } else {
  console.log("No bullet. Waiting for next turn...");
}
});

// Kill result
socket1.on("playerKilled", (room) => {
  console.log("Kill successful!");
  console.log("Updated room state:", room);
});

// Errors
socket1.on("errorMessage", (msg) => {
  console.log("Error:", msg);
});

setInterval(() => {}, 1000);