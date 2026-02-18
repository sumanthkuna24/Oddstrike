const mongoose = require("mongoose");

const SlotSchema = new mongoose.Schema({
  number: Number,
  state: {
    type: Number,
    default: 0
  }
});

const PlayerSchema = new mongoose.Schema({
  socketId: String,
  name: String,
  aliveCount: {
    type: Number,
    default: 5
  },
  slots: [SlotSchema]
});

const RoomSchema = new mongoose.Schema({
  roomCode: {
    type: String,
    required: true,
    unique: true
  },
  gameStarted: {
    type: Boolean,
    default: false
  },
  currentTurn: {
    type: Number,
    default: 0
  },
  winner: {
    type: String,
    default: null
  },
  continueReady: {
    type: [String],
    default: []
  },
  players: [PlayerSchema],
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 86400 // 24 hours auto delete
  }
});


module.exports = mongoose.model("Room", RoomSchema);