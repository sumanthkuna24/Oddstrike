import { useEffect, useState } from "react";
import socket from "../socket";
import RulesModal from "../components/RulesModal";
import "../lobby.css";

function Lobby({ room, setPage, setRoom }) {
  const [lobbyRoom, setLobbyRoom] = useState(room);
  const [toast, setToast] = useState(null);
  const [rulesOpen, setRulesOpen] = useState(false);

  const myId = socket.id || room?.myId;
  const isHost = lobbyRoom?.players?.[0]?.socketId === myId;
  const readySet = new Set(lobbyRoom?.continueReady || []);

  useEffect(() => {
    setLobbyRoom(room);
  }, [room]);

  useEffect(() => {
    socket.on("roomUpdated", (updatedRoom) => {
      const updatedWithId = { ...updatedRoom, myId: socket.id };
      setLobbyRoom(updatedWithId);
      setRoom(updatedWithId);

      const stillInRoom = updatedRoom.players.some((player) => player.socketId === socket.id);
      if (!stillInRoom) {
        localStorage.removeItem("oddstrike_room");
        setPage("home");
      }
    });

    socket.on("gameStarted", (updatedRoom) => {
      setRoom({ ...updatedRoom, myId: socket.id });
      setPage("game");
    });

    socket.on("errorMessage", (msg) => {
      alert(msg);
    });

    socket.on("hostReminder", ({ fromName }) => {
      setToast(`${fromName} says: Start the game!`);
      setTimeout(() => setToast(null), 2200);
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
  }, [setPage, setRoom]);

  const startGame = () => {
    socket.emit("startGame", { roomCode: lobbyRoom.roomCode });
  };

  const leaveRoom = () => {
    socket.emit("leaveRoom", { roomCode: lobbyRoom.roomCode });
    localStorage.removeItem("oddstrike_room");
    setPage("home");
  };

  const remindHost = () => {
    socket.emit("remindHost", { roomCode: lobbyRoom.roomCode });
  };

  if (!lobbyRoom) return null;

  return (
    <div className="lobby-page">
      <button className="lobby-rules-btn" onClick={() => setRulesOpen(true)}>
        Rules
      </button>

      <div className="lobby-shell settings-closed">
        <section className="lobby-main-card">
          <div className="lobby-header">
            <div>
              <h2>Lobby</h2>
              <p>
                Room code: <strong>{lobbyRoom.roomCode}</strong>
              </p>
            </div>
            <span className="lobby-chip">Players {lobbyRoom.players?.length || 0}/6</span>
          </div>

          {toast && <div className="lobby-toast">{toast}</div>}

          <div className="lobby-player-list">
            {lobbyRoom.players?.map((player, index) => (
              <div key={player.socketId || `${player.name}-${index}`} className="lobby-player-row">
                <div>
                  <span className="lobby-player-name">
                    {player.name}
                    {player.socketId === myId ? " (You)" : ""}
                  </span>
                  {index === 0 && <span className="lobby-host-tag">Host</span>}
                </div>
                {lobbyRoom.winner && readySet.has(player.socketId) && <span className="lobby-ready-tag">Ready</span>}
              </div>
            ))}
          </div>

          {lobbyRoom.winner && (
            <div className="lobby-status">
              Waiting in same room: {lobbyRoom.continueReady?.length || 0}/{lobbyRoom.players.length}
            </div>
          )}

          <div className="lobby-actions">
            {isHost ? (
              <button className="lobby-btn primary" onClick={startGame} disabled={lobbyRoom.players.length < 2}>
                Start Game
              </button>
            ) : (
              <>
                <div className="lobby-wait">Waiting for host to start...</div>
                <button className="lobby-btn" onClick={remindHost}>
                  Remind host
                </button>
              </>
            )}
          </div>
        </section>
      </div>

      <div className="lobby-footer">
        <button className="lobby-btn danger" onClick={leaveRoom}>
          Leave Room
        </button>
      </div>

      <RulesModal open={rulesOpen} onClose={() => setRulesOpen(false)} />
    </div>
  );
}

export default Lobby;
