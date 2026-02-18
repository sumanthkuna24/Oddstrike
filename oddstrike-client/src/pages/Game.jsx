import { useEffect, useRef, useState } from "react";
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
  const [isBullet, setIsBullet] = useState(false);
  const [winner, setWinner] = useState(null);
  const [bulletAnimation, setBulletAnimation] = useState(null);
  const [screenShake, setScreenShake] = useState(false);
  const [gameMessage, setGameMessage] = useState(null);
  const [continueProgress, setContinueProgress] = useState(null);
  const [hasContinued, setHasContinued] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);

  const diceTimer = useRef(null);
  const messageTimer = useRef(null);
  const slotRefs = useRef({});

  const myId = gameRoom?.myId;

  const currentTurnPlayer =
    gameRoom?.players?.[gameRoom?.currentTurn];

  const isMyTurn =
    currentTurnPlayer?.socketId === myId;

  const isHost =
    gameRoom?.players?.[0]?.socketId === myId;

  useEffect(() => {
    socket.on("diceRolled", (data) => {
      setGameRoom({ ...data.room, myId });
      setDiceValue(data.diceValue);
      setIsBullet(data.isBullet);
      setWinner(null);

      // Show game message if available
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
        }, 3000);
      }

      if (diceTimer.current) clearTimeout(diceTimer.current);

      diceTimer.current = setTimeout(() => {
        setDiceValue(null);
      }, 2000);
    });

    socket.on("playerKilled", (updatedRoom) => {
      // Trigger screen shake
      setScreenShake(true);
      setTimeout(() => setScreenShake(false), 600);
      
      setGameRoom({ ...updatedRoom, myId });
      setIsBullet(false);
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
      setWinner(null);
      setDiceValue(null);
      setIsBullet(false);
      setContinueProgress(null);
      setHasContinued(false);
    });

    return () => {
      socket.off("diceRolled");
      socket.off("playerKilled");
      socket.off("gameOver");
      socket.off("continueStatus");
      socket.off("roomUpdated");
      if (diceTimer.current) clearTimeout(diceTimer.current);
      if (messageTimer.current) clearTimeout(messageTimer.current);
    };
  }, [myId]);

  const rollDice = () => {
    if (!isMyTurn || winner) return;
    socket.emit("rollDice", { roomCode: gameRoom.roomCode });
  };

  const killPlayer = (targetIndex, number, targetSlotIndex) => {
    if (
      !isBullet ||
      !isMyTurn ||
      winner ||
      targetIndex === gameRoom.currentTurn
    )
      return;

    // Find attacker's slot with state 4
    const attacker = gameRoom.players[gameRoom.currentTurn];
    const attackerSlotIndex = attacker?.slots?.findIndex(slot => slot.state === 4);
    
    if (attackerSlotIndex === -1) {
      // Fallback if no state 4 slot found
      socket.emit("killPlayer", {
        roomCode: gameRoom.roomCode,
        targetPlayerIndex: targetIndex,
        targetNumber: number
      });
      return;
    }

    // Get positions for bullet animation
    const attackerSlotKey = `${gameRoom.currentTurn}-${attackerSlotIndex}`;
    const targetSlotKey = `${targetIndex}-${targetSlotIndex}`;
    
    const attackerSlot = slotRefs.current[attackerSlotKey];
    const targetSlot = slotRefs.current[targetSlotKey];

    if (attackerSlot && targetSlot) {
      const attackerRect = attackerSlot.getBoundingClientRect();
      const targetRect = targetSlot.getBoundingClientRect();

      const from = {
        x: attackerRect.left + attackerRect.width / 2,
        y: attackerRect.top + attackerRect.height / 2
      };

      const to = {
        x: targetRect.left + targetRect.width / 2,
        y: targetRect.top + targetRect.height / 2
      };

      // Start bullet animation
      setBulletAnimation({ from, to });

      // Emit kill after animation starts
      setTimeout(() => {
        socket.emit("killPlayer", {
          roomCode: gameRoom.roomCode,
          targetPlayerIndex: targetIndex,
          targetNumber: number
        });
      }, 100);
    } else {
      // Fallback if refs not available
      socket.emit("killPlayer", {
        roomCode: gameRoom.roomCode,
        targetPlayerIndex: targetIndex,
        targetNumber: number
      });
    }
  };

  const handleBulletComplete = () => {
    setBulletAnimation(null);
  };

  if (!gameRoom?.players) return null;

  return (
    <div className={`game-container ${screenShake ? 'screen-shake' : ''}`}>

      {/* HEADER */}
      <div className="game-header">
        <div>
          <strong>Room:</strong> {gameRoom.roomCode}
        </div>

        <div>
          🎯 Turn: {currentTurnPlayer?.name || "-"}
          {isMyTurn && !winner && (
            <span className="your-turn-badge">YOUR TURN</span>
          )}
        </div>

        <div>
          🎲 {diceValue === 'joker' ? 'Joker' : diceValue || "-"}
        </div>

        <button
          className="rules-btn"
          onClick={() => setRulesOpen(true)}
          type="button"
          aria-label="Open rules"
        >
          Rules
        </button>
      </div>

      {/* BIG DICE DISPLAY */}
      {diceValue && (
        <div className="dice-overlay">
          <Dice value={typeof diceValue === 'number' ? diceValue : null} isJoker={diceValue === 'joker'} />
        </div>
      )}

      {/* GAME MESSAGE */}
      {gameMessage && (
        <GameMessage 
          type={gameMessage.type} 
          data={gameMessage.data}
          variant={gameMessage.variant}
        />
      )}

      <RulesModal open={rulesOpen} onClose={() => setRulesOpen(false)} />

      {/* BULLET ANIMATION */}
      {bulletAnimation && (
        <Bullet
          from={bulletAnimation.from}
          to={bulletAnimation.to}
          onComplete={handleBulletComplete}
        />
      )}

      {/* PLAYERS GRID */}
      <div className="players-grid">
        {gameRoom.players.map((player, pIndex) => {

          const isCurrentTurn =
            pIndex === gameRoom.currentTurn;

          const isYou =
            player.socketId === myId;

          return (
            <div
              key={pIndex}
              className={`player-card
                player-${pIndex}
                ${isYou ? "you" : ""}
                ${isCurrentTurn ? "current-turn" : ""}
                ${isYou && isCurrentTurn ? "your-turn" : ""}
              `}
            >
              <h4>
                {player.name}
                {isYou && " (You)"}
                {player.aliveCount === 0 && " (Eliminated)"}
                {isYou && isCurrentTurn && !winner && (
                  <span className="your-turn-pill">YOUR TURN</span>
                )}
              </h4>

              <div className="slot-container">
                {player.slots.map((slot, sIndex) => {

                  const isKillable =
                    isBullet &&
                    isMyTurn &&
                    pIndex !== gameRoom.currentTurn &&
                    slot.state !== -1;

                  const slotKey = `${pIndex}-${sIndex}`;
                  const isAttacker = pIndex === gameRoom.currentTurn && slot.state === 4 && isMyTurn;

                  return (
                    <div
                      key={sIndex}
                      ref={(el) => {
                        if (el) slotRefs.current[slotKey] = el;
                      }}
                      onClick={() =>
                        killPlayer(pIndex, slot.number, sIndex)
                      }
                      className={`slot
                        ${slot.state === -1 ? "dead" : ""}
                        ${slot.state > 0 ? `state-${slot.state}` : ""}
                        ${isKillable ? "killable" : ""}
                        ${isAttacker ? "attacker" : ""}
                      `}
                    >
                      {/* SMALL NUMBER TOP LEFT */}
                      {slot.state !== -1 && (
                        <div className="slot-number">
                          {slot.number}
                        </div>
                      )}

                      {/* CHARACTER COMPONENT */}
                      <div className="slot-icon">
                        <Character 
                          state={slot.state} 
                          isDead={slot.state === -1}
                        />
                      </div>

                      {/* STATE LABEL */}
                      {slot.state !== -1 && slot.state > 0 && (
                        <div className="slot-state-label">
                          {slot.state === 1 ? 'Head' : 
                           slot.state === 2 ? 'Body' : 
                           slot.state === 3 ? 'Gun' : 
                           slot.state === 4 ? 'Bullet' : ''}
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

      {/* FOOTER */}
      <div className="roll-area">

        {winner && (
          <div className="winner-screen">
            <div className="winner-content">
              <div className="winner-crown">👑</div>
              <h2 className="winner-title">Winner!</h2>
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
                  {hasContinued ? "Ready ✓" : "Continue (Same Room)"}
                </button>
                <button
                  className="winner-button new-room-button"
                  onClick={() => {
                    localStorage.removeItem("oddstrike_room");
                    window.location.reload();
                  }}
                >
                  New Room
                </button>
              </div>
            </div>
          </div>
        )}

        {!winner && isMyTurn && (
          <button onClick={rollDice}>
            Roll Dice
          </button>
        )}

      </div>

    </div>
  );
}

export default Game;