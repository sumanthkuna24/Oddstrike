import { useEffect, useState } from "react";
import socket from "../socket";
import RulesModal from "../components/RulesModal";

function Lobby({ room, setPage, setRoom }) {
  const [lobbyRoom, setLobbyRoom] = useState(room);
  const [toast, setToast] = useState(null);
  const [rulesOpen, setRulesOpen] = useState(false);

  const myId = room?.myId;

  const isHost =
    lobbyRoom?.players?.[0]?.socketId === myId;

  useEffect(() => {
    socket.on("roomUpdated", (updatedRoom) => {
      const updatedWithId = { ...updatedRoom, myId };

      setLobbyRoom(updatedWithId);
      setRoom(updatedWithId);

      // If I am no longer in room → go home
      const stillInRoom = updatedRoom.players.some(
        (p) => p.socketId === myId
      );

      if (!stillInRoom) {
        localStorage.removeItem("oddstrike_room");
        setPage("home");
      }
    });

    socket.on("gameStarted", (updatedRoom) => {
      setRoom({ ...updatedRoom, myId });
      setPage("game");
    });

    socket.on("errorMessage", (msg) => {
      alert(msg);
    });

    socket.on("hostReminder", ({ fromName }) => {
      setToast(`${fromName} says: Start the game!`);
      setTimeout(() => setToast(null), 2500);
    });

    socket.on("reminderSent", () => {
      setToast("Reminder sent to host");
      setTimeout(() => setToast(null), 1800);
    });

    return () => {
      socket.off("roomUpdated");
      socket.off("gameStarted");
      socket.off("errorMessage");
      socket.off("hostReminder");
      socket.off("reminderSent");
    };
  }, [myId, setPage, setRoom]);

  const startGame = () => {
    socket.emit("startGame", {
      roomCode: lobbyRoom.roomCode
    });
  };

  const leaveRoom = () => {
    socket.emit("leaveRoom", {
      roomCode: lobbyRoom.roomCode
    });

    localStorage.removeItem("oddstrike_room");
    setPage("home");
  };

  const remindHost = () => {
    socket.emit("remindHost", { roomCode: lobbyRoom.roomCode });
  };

  if (!lobbyRoom) return null;

  return (
    <div style={{ textAlign: "center", marginTop: "80px" }}>
      <h2>Lobby</h2>
      <button
        onClick={() => setRulesOpen(true)}
        style={{
          position: "fixed",
          top: "14px",
          right: "14px",
          padding: "8px 12px",
          borderRadius: "12px",
          border: "1px solid rgba(148,163,184,0.22)",
          background: "rgba(2,6,23,0.25)",
          color: "white",
          cursor: "pointer"
        }}
      >
        Rules
      </button>

      {toast && (
        <div
          style={{
            margin: "10px auto 0",
            maxWidth: "420px",
            padding: "10px 12px",
            borderRadius: "12px",
            background: "rgba(15, 23, 42, 0.9)",
            border: "1px solid rgba(59, 130, 246, 0.35)",
            boxShadow: "0 0 18px rgba(59, 130, 246, 0.25)",
            fontWeight: 700
          }}
        >
          {toast}
        </div>
      )}

      <p>
        Room Code:{" "}
        <strong style={{ fontSize: "18px" }}>
          {lobbyRoom.roomCode}
        </strong>
      </p>

      <h3>
        Players ({lobbyRoom.players?.length || 0}/6)
      </h3>

      <ul
        style={{
          listStyle: "none",
          padding: 0,
          marginTop: "20px"
        }}
      >
        {lobbyRoom.players?.map((player, index) => (
          <li
            key={index}
            style={{
              marginBottom: "8px",
              fontWeight:
                player.socketId === myId ? "bold" : "normal"
            }}
          >
            {player.name}
            {index === 0 && (
              <span style={{ color: "#facc15" }}>
                {" "}👑 Host
              </span>
            )}
            {player.socketId === myId && " (You)"}
          </li>
        ))}
      </ul>

      <div style={{ marginTop: "30px" }}>
        {isHost ? (
          <button
            onClick={startGame}
            disabled={lobbyRoom.players.length < 2}
            style={{
              padding: "10px 20px",
              cursor:
                lobbyRoom.players.length < 2
                  ? "not-allowed"
                  : "pointer",
              opacity:
                lobbyRoom.players.length < 2 ? 0.5 : 1
            }}
          >
            Start Game
          </button>
        ) : (
          <>
            <h4 style={{ opacity: 0.7 }}>
              Waiting for host to start...
            </h4>
            <button
              onClick={remindHost}
              style={{
                marginTop: "10px",
                padding: "8px 14px",
                borderRadius: "10px",
                border: "1px solid rgba(59,130,246,0.45)",
                background: "rgba(59,130,246,0.12)",
                color: "white",
                cursor: "pointer"
              }}
            >
              Remind host
            </button>
          </>
        )}
      </div>

      {/* Leave Button */}
      <div
        style={{
          marginTop: "70px",
          textAlign: "right",
          paddingRight: "40px"
        }}
      >
        <button
          onClick={leaveRoom}
          style={{
            background: "transparent",
            color: "#ff6b6b",
            border: "1px solid #ff6b6b",
            padding: "6px 12px",
            fontSize: "13px",
            borderRadius: "6px",
            cursor: "pointer",
            opacity: 0.8
          }}
          onMouseOver={(e) =>
            (e.target.style.opacity = "1")
          }
          onMouseOut={(e) =>
            (e.target.style.opacity = "0.8")
          }
        >
          Leave Room
        </button>
      </div>
      <RulesModal open={rulesOpen} onClose={() => setRulesOpen(false)} />
    </div>
  );
}

export default Lobby;