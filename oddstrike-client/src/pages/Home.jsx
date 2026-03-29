import { useState, useEffect } from "react";
import socket from "../socket";
import RulesModal from "../components/RulesModal";
import Character from "../components/Character";
import "../home.css";

function Home({ setPage, setRoom }) {
  const [name, setName] = useState("");
  const [step, setStep] = useState(1);
  const [roomCode, setRoomCode] = useState("");
  const [rulesOpen, setRulesOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    const savedName = localStorage.getItem("oddstrike_name");
    const savedRoom = localStorage.getItem("oddstrike_room");

    if (savedName) {
      setName(savedName);
      setStep(2);
    }

    if (savedName && savedRoom) {
      socket.emit("rejoinRoom", {
        name: savedName,
        roomCode: savedRoom
      });
    }

    socket.on("roomCreated", (room) => {
      setIsCreating(false);
      setIsJoining(false);
      localStorage.setItem("oddstrike_room", room.roomCode);
      setRoom({ ...room, myId: socket.id });
      setPage("lobby");
    });

    socket.on("roomUpdated", (room) => {
      setIsCreating(false);
      setIsJoining(false);
      localStorage.setItem("oddstrike_room", room.roomCode);
      setRoom({ ...room, myId: socket.id });
      setPage("lobby");
    });

    socket.on("errorMessage", (msg) => {
      setIsCreating(false);
      setIsJoining(false);
      alert(msg);
    });

    return () => {
      socket.off("roomCreated");
      socket.off("roomUpdated");
      socket.off("errorMessage");
    };
  }, [setPage, setRoom]);

  const continueWithName = () => {
    if (!name.trim()) {
      alert("Enter your name");
      return;
    }

    localStorage.setItem("oddstrike_name", name.trim());
    setStep(2);
  };

  const createRoom = () => {
    if (isCreating || isJoining) return;
    setIsCreating(true);
    socket.emit("createRoom", { name: name.trim() });
  };

  const joinRoom = () => {
    if (isCreating || isJoining) return;

    if (!roomCode.trim()) {
      alert("Enter room code");
      return;
    }

    setIsJoining(true);
    socket.emit("joinRoom", {
      name: name.trim(),
      roomCode: roomCode.trim().toUpperCase()
    });
  };

  const isPending = isCreating || isJoining;

  return (
    <div className="home-container">
      <div className="home-shell">
        <div className="home-topbar">
          <div className="home-brand">
            <h1 className="home-title">OddStrike</h1>
            <p className="home-tagline">
              Roll. Upgrade. Get a bullet. Take the shot.
            </p>
          </div>
          <button className="home-rules-btn" onClick={() => setRulesOpen(true)}>
            Rules
          </button>
        </div>

        <div className="home-card">
          <div className="home-showcase">
            <div className="home-showcase-item">
              <div className="home-showcase-icon">
                <Character state={1} />
              </div>
              <div className="home-showcase-label">Head</div>
            </div>
            <div className="home-showcase-item">
              <div className="home-showcase-icon">
                <Character state={2} />
              </div>
              <div className="home-showcase-label">Body</div>
            </div>
            <div className="home-showcase-item">
              <div className="home-showcase-icon">
                <Character state={3} />
              </div>
              <div className="home-showcase-label">Gun</div>
            </div>
            <div className="home-showcase-item">
              <div className="home-showcase-icon">
                <Character state={4} />
              </div>
              <div className="home-showcase-label">Bullet</div>
            </div>
          </div>

          {step === 1 && (
            <div className="home-form">
              <input
                className="home-input"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    continueWithName();
                  }
                }}
              />
              <button className="home-btn primary" onClick={continueWithName}>
                Continue
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="home-form">
              <div style={{ fontWeight: 800, opacity: 0.9 }}>
                Welcome, {name}
                <span
                  onClick={() => setStep(1)}
                  style={{ cursor: "pointer", opacity: 0.7, marginLeft: 8 }}
                  title="Edit name"
                >
                  Edit
                </span>
              </div>
              <div className="home-row">
                <button className="home-btn primary" onClick={createRoom} disabled={isPending}>
                  {isCreating ? "Creating..." : "Create Room"}
                </button>
                <button className="home-btn" onClick={() => setStep(3)} disabled={isPending}>
                  Join Room
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="home-form">
              <div style={{ fontWeight: 900, fontSize: 18 }}>Join Room</div>
              <input
                className="home-input"
                placeholder="Enter room code"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    joinRoom();
                  }
                }}
              />
              <div className="home-row">
                <button className="home-btn primary" onClick={joinRoom} disabled={isPending}>
                  {isJoining ? "Joining..." : "Join"}
                </button>
                <button className="home-btn ghost" onClick={() => setStep(2)} disabled={isPending}>
                  Back
                </button>
              </div>
            </div>
          )}
        </div>

        <RulesModal open={rulesOpen} onClose={() => setRulesOpen(false)} />
      </div>

      {isPending && (
        <div className="warmup-overlay">
          <div className="warmup-card">
            <h3 className="warmup-title">Connecting to Arena...</h3>
            <div className="warmup-stage">
              <div className="warmup-actor warmup-actor-one" />
              <div className="warmup-actor warmup-actor-two" />
              <div className="warmup-shot" />
            </div>
            <p className="warmup-subtitle">
              {isCreating ? "Room is getting created" : "Joining room"}.
              If server is waking up, this can take a few seconds.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;
