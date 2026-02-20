import { useEffect, useMemo, useRef, useState } from "react";
import socket from "../socket";
import Character from "../components/Character";
import Bullet from "../components/Bullet";
import Dice from "../components/Dice";
import GameMessage from "../components/GameMessage";
import RulesModal from "../components/RulesModal";
import "./../game.css";

function Game({ room }) {
  const [gameRoom, setGameRoom] = useState(room);
  const [diceValue, setDiceValue] = useState(null);
  const [winner, setWinner] = useState(null);
  const [bulletAnimation, setBulletAnimation] = useState(null);
  const [screenShake, setScreenShake] = useState(false);
  const [gameMessage, setGameMessage] = useState(null);
  const [continueProgress, setContinueProgress] = useState(null);
  const [hasContinued, setHasContinued] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [remainingSec, setRemainingSec] = useState(0);
  const [showRotateHint, setShowRotateHint] = useState(false);
  const localDeadlineRef = useRef(null);
  const lastTurnKeyRef = useRef("");
  const timeoutCheckKeyRef = useRef("");

  const diceTimer = useRef(null);
  const messageTimer = useRef(null);
  const slotRefs = useRef({});

  const myId = gameRoom?.myId;
  const currentTurnPlayer = gameRoom?.players?.[gameRoom?.currentTurn];
  const isMyTurn = currentTurnPlayer?.socketId === myId;
  const currentTurnHasBullet = currentTurnPlayer?.slots?.some((slot) => slot.state === 4);
  const turnPhase = gameRoom?.turnPhase || (currentTurnHasBullet ? "kill" : "roll");
  const canShoot =
    isMyTurn &&
    turnPhase === "kill" &&
    currentTurnHasBullet;

  const getTurnDurationSec = (roomState, phase) => {
    if (phase === "kill") {
      return Number(roomState?.settings?.killDecisionTimeoutSec) || 180;
    }
    if (roomState?.settings?.autoRollEnabled) {
      return Number(roomState?.settings?.autoRollTimeoutSec) || 60;
    }
    return 60;
  };

  useEffect(() => {
    setGameRoom(room);
  }, [room]);

  useEffect(() => {
    const updateRotateHint = () => {
      const isPortrait = window.matchMedia("(orientation: portrait)").matches;
      setShowRotateHint(window.innerWidth < 900 && isPortrait);
    };

    updateRotateHint();
    window.addEventListener("resize", updateRotateHint);
    window.addEventListener("orientationchange", updateRotateHint);

    if (screen.orientation?.lock && window.innerWidth < 900) {
      screen.orientation.lock("landscape").catch(() => {
        updateRotateHint();
      });
    }

    return () => {
      window.removeEventListener("resize", updateRotateHint);
      window.removeEventListener("orientationchange", updateRotateHint);
    };
  }, []);

  useEffect(() => {
    const updateCountdown = () => {
      if (winner || !gameRoom?.gameStarted) {
        setRemainingSec(0);
        return;
      }

      const serverDeadlineMs = gameRoom?.turnDeadlineAt
        ? new Date(gameRoom.turnDeadlineAt).getTime()
        : NaN;

      const deadlineMs = Number.isFinite(serverDeadlineMs)
        ? serverDeadlineMs
        : localDeadlineRef.current;

      if (!deadlineMs) {
        setRemainingSec(getTurnDurationSec(gameRoom, turnPhase));
        return;
      }

      const diff = Math.ceil((deadlineMs - Date.now()) / 1000);
      setRemainingSec(Math.max(0, diff));
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 250);
    return () => clearInterval(interval);
  }, [gameRoom, turnPhase, winner]);

  useEffect(() => {
    if (!gameRoom?.gameStarted || winner) return;
    if (remainingSec > 0) return;

    const turnKey = `${gameRoom.roomCode}-${gameRoom.currentTurn}-${turnPhase}-${gameRoom.turnDeadlineAt || "no-deadline"}`;
    if (timeoutCheckKeyRef.current === turnKey) return;
    timeoutCheckKeyRef.current = turnKey;
    socket.emit("requestTurnTimeoutCheck", { roomCode: gameRoom.roomCode });
  }, [gameRoom, remainingSec, turnPhase, winner]);

  useEffect(() => {
    const turnKey = `${gameRoom?.gameStarted}-${gameRoom?.currentTurn}-${gameRoom?.turnPhase}-${gameRoom?.winner}`;
    if (!gameRoom?.gameStarted || gameRoom?.winner) {
      localDeadlineRef.current = null;
      lastTurnKeyRef.current = turnKey;
      return;
    }

    if (turnKey !== lastTurnKeyRef.current) {
      const serverDeadlineMs = gameRoom?.turnDeadlineAt
        ? new Date(gameRoom.turnDeadlineAt).getTime()
        : NaN;

      if (Number.isFinite(serverDeadlineMs)) {
        localDeadlineRef.current = serverDeadlineMs;
      } else {
        localDeadlineRef.current = Date.now() + getTurnDurationSec(gameRoom, turnPhase) * 1000;
      }
      lastTurnKeyRef.current = turnKey;
    }
  }, [gameRoom, turnPhase]);

  useEffect(() => {
    const handleSpaceToRoll = (event) => {
      if (event.code !== "Space") return;
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;

      event.preventDefault();
      if (!winner && isMyTurn && turnPhase === "roll") {
        socket.emit("rollDice", { roomCode: gameRoom.roomCode });
      }
    };

    window.addEventListener("keydown", handleSpaceToRoll);
    return () => window.removeEventListener("keydown", handleSpaceToRoll);
  }, [gameRoom?.roomCode, isMyTurn, turnPhase, winner]);

  useEffect(() => {
    socket.on("diceRolled", (data) => {
      setGameRoom({ ...data.room, myId });
      setDiceValue(data.diceValue);
      setWinner(null);

      if (data.messageType && data.rolledBy === myId) {
        const variant = data.messageType === "joker" ? "overlay" : "compact";
        setGameMessage({
          type: data.messageType,
          data: data.messageData,
          variant
        });

        if (messageTimer.current) clearTimeout(messageTimer.current);
        messageTimer.current = setTimeout(() => {
          setGameMessage(null);
        }, 2800);
      }

      if (diceTimer.current) clearTimeout(diceTimer.current);
      diceTimer.current = setTimeout(() => {
        setDiceValue(null);
      }, 1800);
    });

    socket.on("playerKilled", (updatedRoom) => {
      setScreenShake(true);
      setTimeout(() => setScreenShake(false), 480);
      setGameRoom({ ...updatedRoom, myId });
    });

    socket.on("turnTimedOut", ({ phase, playerName, autoAction }) => {
      setGameMessage({
        type: "timeout",
        data: { phase, playerName, autoAction },
        variant: "overlay"
      });
      if (messageTimer.current) clearTimeout(messageTimer.current);
      messageTimer.current = setTimeout(() => setGameMessage(null), 2100);
    });

    socket.on("gameOver", (data) => {
      setWinner(data.winner);
      setGameRoom({ ...data.room, myId });
      setContinueProgress(null);
      setHasContinued(false);
    });

    socket.on("continueStatus", (status) => {
      setContinueProgress(status);
    });

    socket.on("roomUpdated", (updatedRoom) => {
      setGameRoom({ ...updatedRoom, myId });
      if (!updatedRoom.winner) {
        setWinner(null);
      }
      setDiceValue(null);
      setHasContinued(false);
    });

    return () => {
      socket.off("diceRolled");
      socket.off("playerKilled");
      socket.off("turnTimedOut");
      socket.off("gameOver");
      socket.off("continueStatus");
      socket.off("roomUpdated");
      if (diceTimer.current) clearTimeout(diceTimer.current);
      if (messageTimer.current) clearTimeout(messageTimer.current);
    };
  }, [myId]);

  const rollDiceNow = () => {
    if (!isMyTurn || winner || turnPhase !== "roll") return;
    socket.emit("rollDice", { roomCode: gameRoom.roomCode });
  };

  const killPlayer = (targetIndex, number, targetSlotIndex) => {
    if (!canShoot || winner || targetIndex === gameRoom.currentTurn || turnPhase !== "kill") {
      return;
    }

    const attacker = gameRoom.players[gameRoom.currentTurn];
    const attackerSlotIndex = attacker?.slots?.findIndex((slot) => slot.state === 4);

    if (attackerSlotIndex === -1) {
      socket.emit("killPlayer", {
        roomCode: gameRoom.roomCode,
        targetPlayerIndex: targetIndex,
        targetNumber: number
      });
      return;
    }

    const attackerSlotKey = `${gameRoom.currentTurn}-${attackerSlotIndex}`;
    const targetSlotKey = `${targetIndex}-${targetSlotIndex}`;

    const attackerSlot = slotRefs.current[attackerSlotKey];
    const targetSlot = slotRefs.current[targetSlotKey];

    if (attackerSlot && targetSlot) {
      const attackerRect = attackerSlot.getBoundingClientRect();
      const targetRect = targetSlot.getBoundingClientRect();

      setBulletAnimation({
        from: {
          x: attackerRect.left + attackerRect.width / 2,
          y: attackerRect.top + attackerRect.height / 2
        },
        to: {
          x: targetRect.left + targetRect.width / 2,
          y: targetRect.top + targetRect.height / 2
        }
      });

      setTimeout(() => {
        socket.emit("killPlayer", {
          roomCode: gameRoom.roomCode,
          targetPlayerIndex: targetIndex,
          targetNumber: number
        });
      }, 90);
      return;
    }

    socket.emit("killPlayer", {
      roomCode: gameRoom.roomCode,
      targetPlayerIndex: targetIndex,
      targetNumber: number
    });
  };

  const turnLabel = useMemo(() => {
    if (turnPhase === "kill") return "Kill target";
    return "Roll dice";
  }, [turnPhase]);

  if (!gameRoom?.players) return null;

  return (
    <div className={`game-container ${screenShake ? "screen-shake" : ""}`}>
      {showRotateHint && (
        <div className="rotate-hint">
          Rotate to landscape for best gameplay.
        </div>
      )}

      <div className="game-header">
        <div>
          <strong>Room:</strong> {gameRoom.roomCode}
        </div>
        <div>
          <strong>Turn:</strong> {currentTurnPlayer?.name || "-"}
          {isMyTurn && !winner && <span className="your-turn-badge">YOUR TURN</span>}
        </div>
        <div className={`turn-timer ${remainingSec <= 10 ? "urgent" : ""}`}>
          {turnLabel}: {remainingSec}s
        </div>
        <div>Dice: {diceValue === "joker" ? "Joker" : diceValue || "-"}</div>
        <button className="rules-btn" onClick={() => setRulesOpen(true)} type="button">
          Rules
        </button>
      </div>

      {diceValue && (
        <div className="dice-overlay">
          <Dice value={typeof diceValue === "number" ? diceValue : null} isJoker={diceValue === "joker"} />
        </div>
      )}

      {gameMessage && <GameMessage type={gameMessage.type} data={gameMessage.data} variant={gameMessage.variant} />}

      <RulesModal open={rulesOpen} onClose={() => setRulesOpen(false)} />

      {bulletAnimation && (
        <Bullet from={bulletAnimation.from} to={bulletAnimation.to} onComplete={() => setBulletAnimation(null)} />
      )}

      <div className="players-grid">
        {gameRoom.players.map((player, pIndex) => {
          const isCurrentTurn = pIndex === gameRoom.currentTurn;
          const isYou = player.socketId === myId;

          return (
            <div
              key={player.socketId || `${player.name}-${pIndex}`}
              className={`player-card player-${pIndex} ${isYou ? "you" : ""} ${isCurrentTurn ? "current-turn" : ""} ${
                isYou && isCurrentTurn ? "your-turn" : ""
              }`}
            >
              <h4>
                {player.name}
                {isYou && " (You)"}
                {player.aliveCount === 0 && " (Eliminated)"}
                {isYou && isCurrentTurn && !winner && <span className="your-turn-pill">YOUR TURN</span>}
              </h4>

              <div className="slot-container">
                {player.slots.map((slot, sIndex) => {
                  const isKillable = canShoot && pIndex !== gameRoom.currentTurn && slot.state !== -1;
                  const slotKey = `${pIndex}-${sIndex}`;
                  const isAttacker = pIndex === gameRoom.currentTurn && slot.state === 4 && canShoot;

                  return (
                    <div
                      key={sIndex}
                      ref={(el) => {
                        if (el) slotRefs.current[slotKey] = el;
                      }}
                      onClick={() => killPlayer(pIndex, slot.number, sIndex)}
                      className={`slot ${slot.state === -1 ? "dead" : ""} ${
                        slot.state > 0 ? `state-${slot.state}` : ""
                      } ${isKillable ? "killable" : ""} ${isAttacker ? "attacker" : ""}`}
                    >
                      {slot.state !== -1 && <div className="slot-number">{slot.number}</div>}
                      <div className="slot-icon">
                        <Character state={slot.state} isDead={slot.state === -1} />
                      </div>
                      {slot.state !== -1 && slot.state > 0 && (
                        <div className="slot-state-label">
                          {slot.state === 1
                            ? "Head"
                            : slot.state === 2
                            ? "Body"
                            : slot.state === 3
                            ? "Gun"
                            : slot.state === 4
                            ? "Bullet"
                            : ""}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="roll-area">
        {winner && (
          <div className="winner-screen">
            <div className="winner-content">
              <div className="winner-crown">Winner</div>
              <h2 className="winner-title">Match Complete</h2>
              <div className="winner-name">{winner}</div>
              {continueProgress && (
                <div className="winner-sub">
                  Continue ready: {continueProgress.readyCount}/{continueProgress.total}
                </div>
              )}
              <div className="winner-buttons">
                <button
                  className="winner-button continue-button"
                  disabled={hasContinued}
                  onClick={() => {
                    setHasContinued(true);
                    socket.emit("continueSameRoom", { roomCode: gameRoom.roomCode });
                  }}
                >
                  {hasContinued ? "Ready" : "Continue (Same Room)"}
                </button>
                <button
                  className="winner-button new-room-button"
                  onClick={() => {
                    socket.emit("leaveRoom", { roomCode: gameRoom.roomCode });
                    localStorage.removeItem("oddstrike_room");
                    window.location.reload();
                  }}
                >
                  Exit Room
                </button>
              </div>
            </div>
          </div>
        )}

        {!winner && isMyTurn && turnPhase === "roll" && (
          <button onClick={rollDiceNow}>Roll Dice (Space)</button>
        )}
      </div>
    </div>
  );
}

export default Game;
