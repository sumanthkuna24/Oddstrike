const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
const Room = require("./models/Room");
const generateRoomCode = require("./utils/generateRoomCode");
const createDefaultSlots = require("./utils/createDefaultSlots");


const roomHandlers = require("./socket/roomHandlers");


const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error("MongoDB Error:", err));

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.get("/", (req, res) => {
  res.send("OddStrike Server Running");
});

io.on("connection", (socket) => {
  console.log("Player connected:", socket.id);

  roomHandlers(io, socket);

  socket.on("disconnect", () => {
    console.log("Player disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});