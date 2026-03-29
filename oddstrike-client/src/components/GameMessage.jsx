import "./GameMessage.css";

function GameMessage({ type, data, variant = "overlay" }) {
  const messages = {
    joker: {
      text: "Joker rolled. Turn lost.",
      icon: "🃏",
      color: "#fbbf24"
    },
    deadSlot: {
      text: `No luck. Soldier ${data?.slotNumber} is already dead.`,
      icon: "💀",
      color: "#ef4444"
    },
    upgrade: {
      text: getUpgradeMessage(data),
      icon: getUpgradeIcon(data?.newState),
      color: getUpgradeColor(data?.newState)
    },
    bullet: {
      text: "Bullet ready. Pick a target.",
      icon: "🔫",
      color: "#f97316"
    },
    timeout: {
      text: getTimeoutMessage(data),
      icon: "⏱️",
      color: "#f87171"
    }
  };

  const message = messages[type];
  if (!message) return null;

  return (
    <div className={`game-message game-message--${variant}`} style={{ "--message-color": message.color }}>
      <div className="message-content">
        <span className="message-emoji">{message.icon}</span>
        <span className="message-text">{message.text}</span>
      </div>
    </div>
  );
}

function getUpgradeMessage(data) {
  if (!data) return "Upgrade complete";

  const slotNum = data.slotIndex + 1;
  const stateNames = {
    1: "head",
    2: "body",
    3: "gun",
    4: "bullet"
  };

  const stateName = stateNames[data.newState] || "power";
  const ordinal = getOrdinal(slotNum);

  return `${ordinal} soldier upgraded to ${stateName}.`;
}

function getUpgradeIcon(state) {
  const icons = {
    1: "👤",
    2: "🧍",
    3: "🔫",
    4: "💥"
  };
  return icons[state] || "+";
}

function getUpgradeColor(state) {
  const colors = {
    1: "#fbbf24",
    2: "#3b82f6",
    3: "#8b5cf6",
    4: "#f97316"
  };
  return colors[state] || "#ffffff";
}

function getOrdinal(n) {
  const ordinals = ["", "1st", "2nd", "3rd", "4th", "5th"];
  return ordinals[n] || `${n}th`;
}

function getTimeoutMessage(data) {
  if (!data) return "Turn timed out";
  const phase = data.phase === "kill" ? "kill decision" : "dice roll";
  return `${data.playerName || "Player"} missed ${phase}. ${data.autoAction || ""}`.trim();
}

export default GameMessage;
