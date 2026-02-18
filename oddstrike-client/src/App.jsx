import { useState, useEffect, useRef } from "react";
import Home from "./pages/Home";
import Lobby from "./pages/Lobby";
import Game from "./pages/Game";
import socket from "./socket";

function App() {
  const [page, setPage] = useState("home");
  const [room, setRoom] = useState(null);
  const pageRef = useRef(page);

  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  // 🔁 Auto Reconnect Logic
  useEffect(() => {
    const savedRoom = localStorage.getItem("oddstrike_room");
    const savedName = localStorage.getItem("oddstrike_name");

    if (savedRoom && savedName) {
      socket.emit("rejoinRoom", {
        name: savedName,
        roomCode: savedRoom
      });
    }

    socket.on("roomUpdated", (roomData) => {
      setRoom({ ...roomData, myId: socket.id });

      if (roomData.gameStarted) {
        setPage("game");
      } else {
        // If game ended (winner exists) and user is still viewing game,
        // do not force them to lobby until they click Continue.
        if (roomData.winner && pageRef.current === "game") {
          setPage("game");
        } else {
          setPage("lobby");
        }
      }
    });

    socket.on("gameStarted", (roomData) => {
      setRoom({ ...roomData, myId: socket.id });
      setPage("game");
    });

    socket.on("continued", (roomData) => {
      setRoom({ ...roomData, myId: socket.id });
      setPage("lobby");
    });

    return () => {
      socket.off("roomUpdated");
      socket.off("gameStarted");
      socket.off("continued");
    };
  }, []);

  return (
    <>
      {page === "home" && (
        <Home setPage={setPage} setRoom={setRoom} />
      )}

      {page === "lobby" && (
        <Lobby room={room} setPage={setPage} setRoom={setRoom} />
      )}

      {page === "game" && (
        <Game room={room} />
      )}
    </>
  );
}

export default App;