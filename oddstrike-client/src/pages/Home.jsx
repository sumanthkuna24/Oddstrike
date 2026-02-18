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

  useEffect(() => {
    const savedName = localStorage.getItem("oddstrike_name");
    const savedRoom = localStorage.getItem("oddstrike_room");

    if (savedName) {
      setName(savedName);
      setStep(2);
    }

    // 🔁 Auto Rejoin if room exists
    if (savedName && savedRoom) {
      socket.emit("rejoinRoom", {
        name: savedName,
        roomCode: savedRoom
      });
    }

    socket.on("roomCreated", (room) => {
      localStorage.setItem("oddstrike_room", room.roomCode);
      setRoom({ ...room, myId: socket.id });
      setPage("lobby");
    });

    socket.on("roomUpdated", (room) => {
      localStorage.setItem("oddstrike_room", room.roomCode);
      setRoom({ ...room, myId: socket.id });
      setPage("lobby");
    });

    socket.on("errorMessage", (msg) => {
      alert(msg);
    });

    return () => {
      socket.off("roomCreated");
      socket.off("roomUpdated");
      socket.off("errorMessage");
    };
  }, [setPage, setRoom]);

  const continueWithName = () => {
    if (!name.trim()) return alert("Enter your name");
    localStorage.setItem("oddstrike_name", name);
    setStep(2);
  };

  const createRoom = () => {
    socket.emit("createRoom", { name });
  };

  const joinRoom = () => {
    if (!roomCode.trim()) return alert("Enter room code");

    socket.emit("joinRoom", {
      name,
      roomCode: roomCode.trim().toUpperCase()
    });
  };

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

      {/* STEP 1 - ENTER NAME */}
      {step === 1 && (
        <div className="home-form">
          <input
            className="home-input"
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button className="home-btn primary" onClick={continueWithName}>
            Continue
          </button>
        </div>
      )}

      {/* STEP 2 - CREATE OR JOIN */}
      {step === 2 && (
        <div className="home-form">
          <div style={{ fontWeight: 800, opacity: 0.9 }}>
            Welcome, {name}{" "}
            <span
              onClick={() => setStep(1)}
              style={{ cursor: "pointer", opacity: 0.7 }}
              title="Edit name"
            >
              ✏️
            </span>
          </div>
          <div className="home-row">
            <button className="home-btn primary" onClick={createRoom}>
              Create Room
            </button>
            <button className="home-btn" onClick={() => setStep(3)}>
              Join Room
            </button>
          </div>
        </div>
      )}

      {/* STEP 3 - JOIN ROOM */}
      {step === 3 && (
        <div className="home-form">
          <div style={{ fontWeight: 900, fontSize: 18 }}>Join Room</div>
          <input
            className="home-input"
            placeholder="Enter room code"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
          />
          <div className="home-row">
            <button className="home-btn primary" onClick={joinRoom}>
              Join
            </button>
            <button className="home-btn ghost" onClick={() => setStep(2)}>
              Back
            </button>
          </div>
        </div>
      )}
        </div>

        <RulesModal open={rulesOpen} onClose={() => setRulesOpen(false)} />
      </div>
    </div>
  );
}

export default Home;