const Room = require("../models/Room");
const generateRoomCode = require("../utils/generateRoomCode");
const createDefaultSlots = require("../utils/createDefaultSlots");
const rollDice = require("../utils/rollDice");
const upgradeState = require("../utils/stateMachine");
const getNextTurn = require("../utils/nextTurn");

module.exports = (io, socket) => {

  console.log("Room handlers attached for:", socket.id);

  // ========================
  // CREATE ROOM
  // ========================
  socket.on("createRoom", async ({ name }) => {
    try {
      let roomCode;
      let existingRoom;

      do {
        roomCode = generateRoomCode();
        existingRoom = await Room.findOne({ roomCode });
      } while (existingRoom);

      const newRoom = new Room({
        roomCode,
        players: [{
          socketId: socket.id,
          name,
          slots: createDefaultSlots(),
          aliveCount: 5
        }]
      });

      await newRoom.save();
      socket.join(roomCode);
      socket.emit("roomCreated", newRoom);

      console.log(`Room created: ${roomCode}`);

    } catch (error) {
      console.error("Create Room Error:", error);
    }
  });

  // ========================
  // JOIN ROOM
  // ========================
  socket.on("joinRoom", async ({ name, roomCode }) => {
    try {
      const room = await Room.findOne({ roomCode });

      if (!room) return socket.emit("errorMessage", "Room not found");
      if (room.players.length >= 6) return socket.emit("errorMessage", "Room is full");
      if (room.gameStarted) return socket.emit("errorMessage", "Game already started");

      // Prevent duplicate names
      const nameExists = room.players.some(p => p.name === name);
      if (nameExists)
        return socket.emit("errorMessage", "Name already taken in this room");

      room.players.push({
        socketId: socket.id,
        name,
        slots: createDefaultSlots(),
        aliveCount: 5
      });

      await room.save();
      socket.join(roomCode);
      io.to(roomCode).emit("roomUpdated", room);

      console.log(`${name} joined room ${roomCode}`);

    } catch (error) {
      console.error("Join Room Error:", error);
    }
  });

  // ========================
  // START GAME (Host Only)
  // ========================
  socket.on("startGame", async ({ roomCode }) => {
    try {
      const room = await Room.findOne({ roomCode });

      if (!room) return socket.emit("errorMessage", "Room not found");

      const isHost = room.players[0]?.socketId === socket.id;
      if (!isHost) return socket.emit("errorMessage", "Only host can start");

      if (room.players.length < 2)
        return socket.emit("errorMessage", "Need at least 2 players");

      room.gameStarted = true;
      room.currentTurn = 0;
      room.winner = null;
      room.continueReady = [];

      await room.save();
      io.to(roomCode).emit("gameStarted", room);

      console.log(`Game started in room ${roomCode}`);

    } catch (error) {
      console.error("Start Game Error:", error);
    }
  });

  // ========================
  // CONTINUE SAME ROOM (All players must click)
  // ========================
  socket.on("continueSameRoom", async ({ roomCode }) => {
    try {
      const room = await Room.findOne({ roomCode });
      if (!room) return;
      if (!room.winner) return; // only valid after game ends

      const me = room.players.find(p => p.socketId === socket.id);
      if (!me) return;

      // add to ready list
      room.continueReady = room.continueReady || [];
      if (!room.continueReady.includes(socket.id)) {
        room.continueReady.push(socket.id);
      }

      await room.save();

      // notify everyone about progress (but do not force navigation)
      io.to(roomCode).emit("continueStatus", {
        readyCount: room.continueReady.length,
        total: room.players.length
      });

      // tell only this player to go back to lobby view
      socket.emit("continued", room);

      // if all current players are ready, reset game to lobby state
      if (room.continueReady.length >= room.players.length) {
        room.players.forEach(player => {
          player.slots = createDefaultSlots();
          player.aliveCount = 5;
        });

        room.winner = null;
        room.gameStarted = false;
        room.currentTurn = 0;
        room.continueReady = [];

        await room.save();
        io.to(roomCode).emit("roomUpdated", room);
      }
    } catch (error) {
      console.error("Continue Same Room Error:", error);
    }
  });

  // ========================
  // REMIND HOST TO START
  // ========================
  socket.on("remindHost", async ({ roomCode }) => {
    try {
      const room = await Room.findOne({ roomCode });
      if (!room) return;

      const hostId = room.players?.[0]?.socketId;
      if (!hostId) return;

      const fromPlayer = room.players.find((p) => p.socketId === socket.id);
      const fromName = fromPlayer?.name || "A player";

      io.to(hostId).emit("hostReminder", {
        fromName,
        roomCode
      });

      socket.emit("reminderSent");
    } catch (error) {
      console.error("Remind Host Error:", error);
    }
  });


// ========================
// ROLL DICE
// ========================
socket.on("rollDice", async ({ roomCode }) => {
  try {
    const room = await Room.findOne({ roomCode });
    if (!room) return;
    if (room.winner) return;
    if (!room.gameStarted) return;

    const currentPlayer = room.players[room.currentTurn];
    const rolledBy = socket.id;

    if (!currentPlayer || currentPlayer.socketId !== socket.id)
      return socket.emit("errorMessage", "Not your turn");

    // 🚫 If player already has unused bullet → cannot roll
    const existingBullet = currentPlayer.slots.find(
      s => s.state === 4
    );

    if (existingBullet) {
      return socket.emit("errorMessage", "Use your bullet first");
    }

    if (currentPlayer.aliveCount === 0) {
      room.currentTurn = getNextTurn(room);
      await room.save();
      return;
    }

    const diceValue = rollDice();
    let slot = null;
    let isBullet = false;
    let messageType = null;
    let messageData = null;

    // Handle joker
    if (diceValue === 'joker') {
      // Joker = lose turn, no upgrade
      room.currentTurn = getNextTurn(room);
      messageType = 'joker';
    } else {
      // Find matching slot
      slot = currentPlayer.slots.find(
        s => s.number === diceValue
      );

      if (slot) {
        // Check if slot is dead
        if (slot.state === -1) {
          // Dead slot - lose turn
          room.currentTurn = getNextTurn(room);
          messageType = 'deadSlot';
          messageData = { slotNumber: diceValue };
        } else {
          // Upgrade slot
          const oldState = slot.state;
          upgradeState(slot);

          if (slot.state === 4) {
            // 🔥 Bullet achieved → stay on same turn
            isBullet = true;
            messageType = 'bullet';
          } else {
            // Normal upgrade → move turn
            room.currentTurn = getNextTurn(room);
            messageType = 'upgrade';
            messageData = { 
              slotNumber: diceValue, 
              slotIndex: currentPlayer.slots.indexOf(slot),
              oldState,
              newState: slot.state
            };
          }
        }
      } else {
        // No matching slot - move turn
        room.currentTurn = getNextTurn(room);
      }
    }

    await room.save();

    io.to(roomCode).emit("diceRolled", {
      room,
      diceValue,
      isBullet,
      messageType,
      messageData,
      rolledBy
    });

  } catch (error) {
    console.error("Roll Dice Error:", error);
  }
});

  // ========================
  // KILL PLAYER
  // ========================
  socket.on("killPlayer", async ({ roomCode, targetPlayerIndex, targetNumber }) => {
    try {
      const room = await Room.findOne({ roomCode });
      if (!room || room.winner) return;

      const shooter = room.players[room.currentTurn];
      if (!shooter || shooter.socketId !== socket.id)
        return socket.emit("errorMessage", "Not your turn");

      const bulletSlot = shooter.slots.find(s => s.state === 4);
      if (!bulletSlot) return;

      if (room.currentTurn === targetPlayerIndex)
        return;

      const targetPlayer = room.players[targetPlayerIndex];
      if (!targetPlayer || targetPlayer.aliveCount === 0)
        return;

      const targetSlot = targetPlayer.slots.find(s => s.number === targetNumber);
      if (!targetSlot || targetSlot.state === -1)
        return;

      targetSlot.state = -1;
      targetPlayer.aliveCount -= 1;
      bulletSlot.state = 3;

      const alivePlayers = room.players.filter(p => p.aliveCount > 0);

      if (alivePlayers.length === 1) {
        room.winner = alivePlayers[0].name;
        room.gameStarted = false;

        await room.save();

        io.to(roomCode).emit("gameOver", {
          room,
          winner: room.winner
        });

        return;
      }

      room.currentTurn = getNextTurn(room);
      await room.save();

      io.to(roomCode).emit("playerKilled", room);

    } catch (error) {
      console.error("Kill Player Error:", error);
    }
  });

  // ========================
  // LEAVE ROOM
  // ========================
  socket.on("leaveRoom", async ({ roomCode }) => {
    try {
      const room = await Room.findOne({ roomCode });
      if (!room) return;

      room.continueReady = (room.continueReady || []).filter(
        (id) => id !== socket.id
      );

      room.players = room.players.filter(
        player => player.socketId !== socket.id
      );

      socket.leave(roomCode);

      if (room.players.length === 0) {
        await Room.deleteOne({ roomCode });
        return;
      }

      await room.save();
      io.to(roomCode).emit("roomUpdated", room);

    } catch (error) {
      console.error("Leave Room Error:", error);
    }
  });

  // ========================
  // AUTO REMOVE ON DISCONNECT
  // ========================
  socket.on("disconnect", async () => {
    try {
      const room = await Room.findOne({
        "players.socketId": socket.id
      });

      if (!room) return;

      room.continueReady = (room.continueReady || []).filter(
        (id) => id !== socket.id
      );

      room.players = room.players.filter(
        p => p.socketId !== socket.id
      );

      if (room.players.length === 0) {
        await Room.deleteOne({ roomCode: room.roomCode });
        return;
      }

      await room.save();
      io.to(room.roomCode).emit("roomUpdated", room);

    } catch (error) {
      console.error("Disconnect Cleanup Error:", error);
    }
  });

  // ========================
  // REJOIN ROOM
  // ========================
  socket.on("rejoinRoom", async ({ name, roomCode }) => {
    try {
      const room = await Room.findOne({ roomCode });
      if (!room) return;

      const existingPlayer = room.players.find(
        p => p.name === name
      );
      if (!existingPlayer) return;

      existingPlayer.socketId = socket.id;

      await room.save();
      socket.join(roomCode);

      socket.emit("roomUpdated", room);

    } catch (error) {
      console.error("Rejoin Error:", error);
    }
  });

  // ========================
  // RESET GAME
  // ========================
  socket.on("resetGame", async ({ roomCode }) => {
    try {
      const room = await Room.findOne({ roomCode });
      if (!room) return;

      const isHost = room.players[0]?.socketId === socket.id;
      if (!isHost) return;

      room.players.forEach(player => {
        player.slots = createDefaultSlots();
        player.aliveCount = 5;
      });

      room.winner = null;
      room.gameStarted = false;
      room.currentTurn = 0;

      await room.save();
      io.to(roomCode).emit("roomUpdated", room);

    } catch (error) {
      console.error("Reset Game Error:", error);
    }
  });

};