import './GameMessage.css';

function GameMessage({ type, data, variant = "overlay" }) {
  const messages = {
    joker: {
      text: "Oh no! You got a Joker!",
      emoji: "🃏",
      color: "#fbbf24"
    },
    deadSlot: {
      text: `No luck! Soldier ${data?.slotNumber} died!`,
      emoji: "💀",
      color: "#ef4444"
    },
    upgrade: {
      text: getUpgradeMessage(data),
      emoji: getUpgradeEmoji(data?.newState),
      color: getUpgradeColor(data?.newState)
    },
    bullet: {
      text: "You got a bullet! Time to kill!",
      emoji: "🔫",
      color: "#f97316"
    }
  };

  const message = messages[type];
  if (!message) return null;

  return (
    <div
      className={`game-message game-message--${variant}`}
      style={{ '--message-color': message.color }}
    >
      <div className="message-content">
        <span className="message-emoji">{message.emoji}</span>
        <span className="message-text">{message.text}</span>
      </div>
    </div>
  );
}

function getUpgradeMessage(data) {
  if (!data) return "Upgrade!";
  
  const slotNum = data.slotIndex + 1;
  const stateNames = {
    1: "head",
    2: "body",
    3: "gun",
    4: "bullet"
  };
  
  const stateName = stateNames[data.newState] || "upgraded";
  const ordinal = getOrdinal(slotNum);
  
  return `Your ${ordinal} soldier got ${stateName}!`;
}

function getUpgradeEmoji(state) {
  const emojis = {
    1: "👤",
    2: "🧍",
    3: "🔫",
    4: "💣"
  };
  return emojis[state] || "✨";
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
  const ordinals = ['', '1st', '2nd', '3rd', '4th', '5th'];
  return ordinals[n] || `${n}th`;
}

export default GameMessage;
