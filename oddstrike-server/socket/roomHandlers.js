const Room = require("../models/Room");
const generateRoomCode = require("../utils/generateRoomCode");
const createDefaultSlots = require("../utils/createDefaultSlots");
const rollDice = require("../utils/rollDice");
const upgradeState = require("../utils/stateMachine");
const getNextTurn = require("../utils/nextTurn");

const ROOM_TIMERS = new Map();

const DEFAULT_SETTINGS = {
  autoRollEnabled: false,
  autoRollTimeoutSec: 60,
  autoKillEnabled: false,
  killDecisionTimeoutSec: 180
};
const TIMEOUT_CHECK_THROTTLE_MS = 900;
const lastTimeoutChecks = new Map();

function hasBullet(player) {
  return player?.slots?.some((slot) => slot.state === 4);
}

function resetPlayerState(player) {
  player.slots = createDefaultSlots();
  player.aliveCount = 5;
}

function getRollTimeoutSec(room) {
  return 60;
}

function getKillTimeoutSec(room) {
  return 180;
}

function setRollPhase(room) {
  room.turnPhase = "roll";
  room.turnDeadlineAt = new Date(Date.now() + getRollTimeoutSec(room) * 1000);
}

function setKillPhase(room) {
  room.turnPhase = "kill";
  room.turnDeadlineAt = new Date(Date.now() + getKillTimeoutSec(room) * 1000);
}

function clearRoomTimer(roomCode) {
  const timer = ROOM_TIMERS.get(roomCode);
  if (timer) {
    clearTimeout(timer);
    ROOM_TIMERS.delete(roomCode);
  }
}

function getNextAliveFrom(room, startIndex) {
  if (!room.players.length) return 0;

  let idx = startIndex;
  for (let i = 0; i < room.players.length; i += 1) {
    idx = (idx + 1 + room.players.length) % room.players.length;
    if (room.players[idx].aliveCount > 0) {
      return idx;
    }
  }

  return 0;
}

function getRandomAliveIndex(room) {
  const aliveIndexes = room.players
    .map((player, index) => ({ player, index }))
    .filter(({ player }) => player.aliveCount > 0)
    .map(({ index }) => index);

  if (!aliveIndexes.length) return 0;
  const randomIndex = Math.floor(Math.random() * aliveIndexes.length);
  return aliveIndexes[randomIndex];
}

function getRandomKillTarget(room, shooterIndex) {
  const options = [];

  room.players.forEach((player, playerIndex) => {
    if (playerIndex === shooterIndex || player.aliveCount === 0) return;

    player.slots.forEach((slot) => {
      if (slot.state !== -1) {
        options.push({
          targetPlayerIndex: playerIndex,
          targetNumber: slot.number
        });
      }
    });
  });

  if (!options.length) return null;
  const randomIndex = Math.floor(Math.random() * options.length);
  return options[randomIndex];
}

async function scheduleRoomTimeout(io, roomCode) {
  clearRoomTimer(roomCode);

  const room = await Room.findOne({ roomCode });
  if (!room || !room.gameStarted || room.winner || !room.turnDeadlineAt) return;

  const timeoutMs = new Date(room.turnDeadlineAt).getTime() - Date.now();
  const safeTimeout = Math.max(0, timeoutMs);

  const timer = setTimeout(() => {
    handleRoomTimeout(io, roomCode).catch((error) => {
      console.error("Room timeout error:", error);
    });
  }, safeTimeout + 20);

  ROOM_TIMERS.set(roomCode, timer);
}

async function finalizeGameIfNeeded(io, room) {
  const alivePlayers = room.players.filter((player) => player.aliveCount > 0);
  if (alivePlayers.length !== 1) return false;

  room.winner = alivePlayers[0].name;
  room.gameStarted = false;
  room.turnPhase = null;
  room.turnDeadlineAt = null;

  await room.save();
  clearRoomTimer(room.roomCode);
  io.to(room.roomCode).emit("gameOver", { room, winner: room.winner });
  return true;
}

async function performRoll(io, room, rolledBy, isAuto = false) {
  if (!room || room.winner || !room.gameStarted) return false;

  const currentPlayer = room.players[room.currentTurn];
  if (!currentPlayer) return false;

  if (!isAuto && currentPlayer.socketId !== rolledBy) {
    io.to(rolledBy).emit("errorMessage", "Not your turn");
    return false;
  }

  const existingBullet = currentPlayer.slots.find((slot) => slot.state === 4);
  if (existingBullet) {
    if (!isAuto) {
      io.to(rolledBy).emit("errorMessage", "Use your bullet first");
    }
    return false;
  }

  if (currentPlayer.aliveCount === 0) {
    room.currentTurn = getNextTurn(room);
    setRollPhase(room);
    await room.save();
    io.to(room.roomCode).emit("roomUpdated", room);
    await scheduleRoomTimeout(io, room.roomCode);
    return true;
  }

  const diceValue = rollDice();
  let slot = null;
  let isBullet = false;
  let messageType = null;
  let messageData = null;

  if (diceValue === "joker") {
    room.currentTurn = getNextTurn(room);
    setRollPhase(room);
    messageType = "joker";
  } else {
    slot = currentPlayer.slots.find((candidate) => candidate.number === diceValue);

    if (slot) {
      if (slot.state === -1) {
        room.currentTurn = getNextTurn(room);
        setRollPhase(room);
        messageType = "deadSlot";
        messageData = { slotNumber: diceValue };
      } else {
        const oldState = slot.state;
        upgradeState(slot);

        if (slot.state === 4) {
          isBullet = true;
          messageType = "bullet";
          setKillPhase(room);
        } else {
          room.currentTurn = getNextTurn(room);
          setRollPhase(room);
          messageType = "upgrade";
          messageData = {
            slotNumber: diceValue,
            slotIndex: currentPlayer.slots.indexOf(slot),
            oldState,
            newState: slot.state
          };
        }
      }
    } else {
      room.currentTurn = getNextTurn(room);
      setRollPhase(room);
    }
  }

  await room.save();

  io.to(room.roomCode).emit("diceRolled", {
    room,
    diceValue,
    isBullet,
    messageType,
    messageData,
    rolledBy
  });

  await scheduleRoomTimeout(io, room.roomCode);
  return true;
}

async function performKill(io, room, shooterSocketId, targetPlayerIndex, targetNumber, isAuto = false) {
  if (!room || room.winner || !room.gameStarted) return false;

  const shooter = room.players[room.currentTurn];
  if (!shooter) return false;

  if (!isAuto && shooter.socketId !== shooterSocketId) {
    io.to(shooterSocketId).emit("errorMessage", "Not your turn");
    return false;
  }

  const bulletSlot = shooter.slots.find((slot) => slot.state === 4);
  if (!bulletSlot) return false;

  if (room.currentTurn === targetPlayerIndex) return false;

  const targetPlayer = room.players[targetPlayerIndex];
  if (!targetPlayer || targetPlayer.aliveCount === 0) return false;

  const targetSlot = targetPlayer.slots.find((slot) => slot.number === targetNumber);
  if (!targetSlot || targetSlot.state === -1) return false;

  targetSlot.state = -1;
  targetPlayer.aliveCount -= 1;
  bulletSlot.state = 3;

  const gameEnded = await finalizeGameIfNeeded(io, room);
  if (gameEnded) return true;

  room.currentTurn = getNextTurn(room);
  setRollPhase(room);
  await room.save();

  io.to(room.roomCode).emit("playerKilled", room);
  await scheduleRoomTimeout(io, room.roomCode);
  return true;
}

async function handleRoomTimeout(io, roomCode) {
  const room = await Room.findOne({ roomCode });
  if (!room || !room.gameStarted || room.winner) {
    clearRoomTimer(roomCode);
    return;
  }

  if (!room.players.length) {
    clearRoomTimer(roomCode);
    return;
  }

  const currentPlayer = room.players[room.currentTurn];
  if (!currentPlayer) {
    room.currentTurn = 0;
    setRollPhase(room);
    await room.save();
    io.to(roomCode).emit("roomUpdated", room);
    await scheduleRoomTimeout(io, roomCode);
    return;
  }

  const effectivePhase = hasBullet(currentPlayer) ? "kill" : room.turnPhase;

  if (effectivePhase === "kill") {
    const bulletSlot = currentPlayer.slots.find((slot) => slot.state === 4);

    if (!bulletSlot) {
      room.currentTurn = getNextTurn(room);
      setRollPhase(room);
      await room.save();
      io.to(roomCode).emit("roomUpdated", room);
      await scheduleRoomTimeout(io, roomCode);
      return;
    }

    bulletSlot.state = 3;
    room.currentTurn = getNextTurn(room);
    setRollPhase(room);
    await room.save();

    io.to(roomCode).emit("turnTimedOut", {
      phase: "kill",
      playerName: currentPlayer.name,
      autoAction: "bullet-wasted"
    });

    io.to(roomCode).emit("roomUpdated", room);
    await scheduleRoomTimeout(io, roomCode);
    return;
  }

  room.currentTurn = getNextTurn(room);
  setRollPhase(room);
  await room.save();

  io.to(roomCode).emit("turnTimedOut", {
    phase: "roll",
    playerName: currentPlayer.name,
    autoAction: "turn-skipped"
  });

  io.to(roomCode).emit("roomUpdated", room);
  await scheduleRoomTimeout(io, roomCode);
}

function removePlayerFromRoom(room, socketId) {
  const playerIndex = room.players.findIndex((player) => player.socketId === socketId);
  if (playerIndex === -1) return { removed: false, roomEmpty: room.players.length === 0 };

  const wasCurrentTurn = room.gameStarted && playerIndex === room.currentTurn;

  room.continueReady = (room.continueReady || []).filter((id) => id !== socketId);
  room.players.splice(playerIndex, 1);

  if (room.players.length === 0) {
    return { removed: true, roomEmpty: true };
  }

  if (room.currentTurn > playerIndex) {
    room.currentTurn -= 1;
  }

  if (room.currentTurn >= room.players.length) {
    room.currentTurn = 0;
  }

  if (!room.gameStarted || room.winner) {
    return { removed: true, roomEmpty: false };
  }

  const alivePlayers = room.players.filter((player) => player.aliveCount > 0);
  if (alivePlayers.length <= 1) {
    room.winner = alivePlayers.length === 1 ? alivePlayers[0].name : null;
    room.gameStarted = false;
    room.turnPhase = null;
    room.turnDeadlineAt = null;
    return { removed: true, roomEmpty: false, gameEndedByExit: Boolean(room.winner) };
  }

  if (wasCurrentTurn) {
    const previousIndex = playerIndex - 1;
    const anchor = previousIndex < 0 ? room.players.length - 1 : previousIndex;
    room.currentTurn = getNextAliveFrom(room, anchor);
    setRollPhase(room);
    return { removed: true, roomEmpty: false };
  }

  const activePlayer = room.players[room.currentTurn];
  if (!activePlayer || activePlayer.aliveCount === 0) {
    room.currentTurn = getNextAliveFrom(room, room.currentTurn - 1);
    setRollPhase(room);
    return { removed: true, roomEmpty: false };
  }

  if (room.turnPhase === "kill" && !hasBullet(activePlayer)) {
    room.currentTurn = getNextTurn(room);
    setRollPhase(room);
    return { removed: true, roomEmpty: false };
  }

  if (!room.turnPhase) {
    setRollPhase(room);
  }

  return { removed: true, roomEmpty: false };
}

module.exports = (io, socket) => {
  socket.on("createRoom", async ({ name }) => {
    try {
      const existingRoomForSocket = await Room.findOne({ "players.socketId": socket.id });
      if (existingRoomForSocket && !existingRoomForSocket.gameStarted) {
        socket.join(existingRoomForSocket.roomCode);
        socket.emit("roomUpdated", existingRoomForSocket);
        return;
      }

      let roomCode;
      let existingRoom;

      do {
        roomCode = generateRoomCode();
        existingRoom = await Room.findOne({ roomCode });
      } while (existingRoom);

      const newRoom = new Room({
        roomCode,
        settings: DEFAULT_SETTINGS,
        players: [
          {
            socketId: socket.id,
            name,
            slots: createDefaultSlots(),
            aliveCount: 5
          }
        ]
      });

      await newRoom.save();
      socket.join(roomCode);
      socket.emit("roomCreated", newRoom);
    } catch (error) {
      console.error("Create Room Error:", error);
    }
  });

  socket.on("joinRoom", async ({ name, roomCode }) => {
    try {
      const normalizedCode = roomCode?.trim()?.toUpperCase();
      if (!normalizedCode) return;

      const room = await Room.findOne({ roomCode: normalizedCode });
      if (!room) {
        socket.emit("errorMessage", "Room not found");
        return;
      }

      if (room.players.some((player) => player.socketId === socket.id)) {
        socket.join(normalizedCode);
        socket.emit("roomUpdated", room);
        return;
      }

      const updatedRoom = await Room.findOneAndUpdate(
        {
          roomCode: normalizedCode,
          gameStarted: false,
          "players.name": { $ne: name },
          "players.socketId": { $ne: socket.id },
          $expr: { $lt: [{ $size: "$players" }, 6] }
        },
        {
          $push: {
            players: {
              socketId: socket.id,
              name,
              slots: createDefaultSlots(),
              aliveCount: 5
            }
          }
        },
        { new: true }
      );

      if (!updatedRoom) {
        const latestRoom = await Room.findOne({ roomCode: normalizedCode });

        if (!latestRoom) {
          socket.emit("errorMessage", "Room not found");
          return;
        }

        if (latestRoom.gameStarted) {
          socket.emit("errorMessage", "Game already started");
          return;
        }

        if (latestRoom.players.length >= 6) {
          socket.emit("errorMessage", "Room is full");
          return;
        }

        if (latestRoom.players.some((player) => player.name === name)) {
          socket.emit("errorMessage", "Name already taken in this room");
          return;
        }

        socket.emit("errorMessage", "Unable to join room. Please try again.");
        return;
      }

      socket.join(normalizedCode);
      io.to(normalizedCode).emit("roomUpdated", updatedRoom);
    } catch (error) {
      console.error("Join Room Error:", error);
    }
  });

  socket.on("startGame", async ({ roomCode }) => {
    try {
      const room = await Room.findOne({ roomCode });
      if (!room) {
        socket.emit("errorMessage", "Room not found");
        return;
      }

      const isHost = room.players[0]?.socketId === socket.id;
      if (!isHost) {
        socket.emit("errorMessage", "Only host can start");
        return;
      }

      room.settings = DEFAULT_SETTINGS;

      if (room.winner) {
        const eligible = new Set(room.continueReady || []);
        room.players = room.players.filter((player) => eligible.has(player.socketId));
      }

      if (room.players.length < 2) {
        socket.emit("errorMessage", "Need at least 2 players");
        return;
      }

      room.players.forEach(resetPlayerState);
      room.gameStarted = true;
      room.winner = null;
      room.continueReady = [];
      room.currentTurn = getRandomAliveIndex(room);
      setRollPhase(room);

      await room.save();
      io.to(roomCode).emit("gameStarted", room);
      await scheduleRoomTimeout(io, roomCode);
    } catch (error) {
      console.error("Start Game Error:", error);
    }
  });

  socket.on("continueSameRoom", async ({ roomCode }) => {
    try {
      const room = await Room.findOne({ roomCode });
      if (!room || !room.winner) return;

      const me = room.players.find((player) => player.socketId === socket.id);
      if (!me) return;

      resetPlayerState(me);
      room.continueReady = room.continueReady || [];
      if (!room.continueReady.includes(socket.id)) {
        room.continueReady.push(socket.id);
      }

      await room.save();

      io.to(roomCode).emit("continueStatus", {
        readyCount: room.continueReady.length,
        total: room.players.length
      });

      io.to(roomCode).emit("roomUpdated", room);
      socket.emit("continued", room);
    } catch (error) {
      console.error("Continue Same Room Error:", error);
    }
  });

  socket.on("remindHost", async ({ roomCode }) => {
    try {
      const room = await Room.findOne({ roomCode });
      if (!room) return;

      const hostId = room.players?.[0]?.socketId;
      if (!hostId) return;

      const fromPlayer = room.players.find((player) => player.socketId === socket.id);
      const fromName = fromPlayer?.name || "A player";

      io.to(hostId).emit("hostReminder", { fromName, roomCode });
      socket.emit("reminderSent");
    } catch (error) {
      console.error("Remind Host Error:", error);
    }
  });

  socket.on("rollDice", async ({ roomCode }) => {
    try {
      const room = await Room.findOne({ roomCode });
      await performRoll(io, room, socket.id, false);
    } catch (error) {
      console.error("Roll Dice Error:", error);
    }
  });

  socket.on("killPlayer", async ({ roomCode, targetPlayerIndex, targetNumber }) => {
    try {
      const room = await Room.findOne({ roomCode });
      await performKill(io, room, socket.id, targetPlayerIndex, targetNumber, false);
    } catch (error) {
      console.error("Kill Player Error:", error);
    }
  });

  socket.on("leaveRoom", async ({ roomCode }) => {
    try {
      const room = await Room.findOne({ roomCode });
      if (!room) return;

      const outcome = removePlayerFromRoom(room, socket.id);
      socket.leave(roomCode);

      if (!outcome.removed) return;

      if (outcome.roomEmpty) {
        await Room.deleteOne({ roomCode });
        clearRoomTimer(roomCode);
        return;
      }

      await room.save();

      if (outcome.gameEndedByExit && room.winner) {
        clearRoomTimer(roomCode);
        io.to(roomCode).emit("gameOver", { room, winner: room.winner });
        return;
      }

      io.to(roomCode).emit("roomUpdated", room);
      if (room.gameStarted && !room.winner) {
        await scheduleRoomTimeout(io, roomCode);
      }
    } catch (error) {
      console.error("Leave Room Error:", error);
    }
  });

  socket.on("disconnect", async () => {
    try {
      for (const key of lastTimeoutChecks.keys()) {
        if (key.endsWith(`:${socket.id}`)) {
          lastTimeoutChecks.delete(key);
        }
      }

      const room = await Room.findOne({ "players.socketId": socket.id });
      if (!room) return;

      const roomCode = room.roomCode;
      const outcome = removePlayerFromRoom(room, socket.id);

      if (!outcome.removed) return;

      if (outcome.roomEmpty) {
        await Room.deleteOne({ roomCode });
        clearRoomTimer(roomCode);
        return;
      }

      await room.save();

      if (outcome.gameEndedByExit && room.winner) {
        clearRoomTimer(roomCode);
        io.to(roomCode).emit("gameOver", { room, winner: room.winner });
        return;
      }

      io.to(roomCode).emit("roomUpdated", room);
      if (room.gameStarted && !room.winner) {
        await scheduleRoomTimeout(io, roomCode);
      }
    } catch (error) {
      console.error("Disconnect Cleanup Error:", error);
    }
  });

  socket.on("rejoinRoom", async ({ name, roomCode }) => {
    try {
      const room = await Room.findOne({ roomCode });
      if (!room) return;

      const existingPlayer = room.players.find((player) => player.name === name);
      if (!existingPlayer) return;

      existingPlayer.socketId = socket.id;
      await room.save();

      socket.join(roomCode);
      socket.emit("roomUpdated", room);
      if (room.gameStarted && !room.winner) {
        await scheduleRoomTimeout(io, roomCode);
      }
    } catch (error) {
      console.error("Rejoin Error:", error);
    }
  });

  socket.on("resetGame", async ({ roomCode }) => {
    try {
      const room = await Room.findOne({ roomCode });
      if (!room) return;

      const isHost = room.players[0]?.socketId === socket.id;
      if (!isHost) return;

      room.players.forEach(resetPlayerState);
      room.winner = null;
      room.gameStarted = false;
      room.currentTurn = 0;
      room.turnPhase = null;
      room.turnDeadlineAt = null;
      room.continueReady = [];
      room.settings = DEFAULT_SETTINGS;

      await room.save();
      clearRoomTimer(roomCode);
      io.to(roomCode).emit("roomUpdated", room);
    } catch (error) {
      console.error("Reset Game Error:", error);
    }
  });

  socket.on("requestTurnTimeoutCheck", async ({ roomCode }) => {
    try {
      if (!roomCode) return;

      const key = `${roomCode}:${socket.id}`;
      const now = Date.now();
      const last = lastTimeoutChecks.get(key) || 0;
      if (now - last < TIMEOUT_CHECK_THROTTLE_MS) return;
      lastTimeoutChecks.set(key, now);

      const room = await Room.findOne({ roomCode });
      if (!room || !room.gameStarted || room.winner) return;

      const deadlineMs = room.turnDeadlineAt ? new Date(room.turnDeadlineAt).getTime() : 0;
      if (deadlineMs > Date.now()) return;

      await handleRoomTimeout(io, roomCode);
    } catch (error) {
      console.error("Timeout Check Request Error:", error);
    }
  });
};
