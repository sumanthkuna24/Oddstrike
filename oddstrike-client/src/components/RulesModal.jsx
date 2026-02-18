import Character from "./Character";
import Dice from "./Dice";
import "./RulesModal.css";

function RulesModal({ open, onClose }) {
  if (!open) return null;

  return (
    <div className="rules-backdrop" onClick={onClose}>
      <div className="rules-modal" onClick={(e) => e.stopPropagation()}>
        <div className="rules-header">
          <div>
            <div className="rules-kicker">OddStrike</div>
            <h2 className="rules-title">Game rules</h2>
          </div>
          <button className="rules-close" onClick={onClose} aria-label="Close rules">
            ✕
          </button>
        </div>

        <div className="rules-content">
          <div className="rules-section">
            <h3>Goal</h3>
            <p>Be the last player with any soldiers alive.</p>
          </div>

          <div className="rules-section">
            <h3>On your turn</h3>
            <div className="rules-row">
              <div className="rules-card">
                <div className="rules-card-title">Roll</div>
                <div className="rules-dice-row">
                  <Dice value={1} />
                  <Dice value={2} />
                  <Dice value={3} />
                  <Dice value={4} />
                  <Dice value={5} />
                  <Dice isJoker />
                </div>
                <div className="rules-card-text">
                  You can roll <strong>1–5</strong> or a <strong>Joker</strong>.
                </div>
              </div>
              <div className="rules-card">
                <div className="rules-card-title">Match</div>
                <div className="rules-card-text">
                  If you roll a number, it upgrades the soldier with that same slot number.
                  If that soldier is dead, nothing upgrades and your turn ends.
                </div>
              </div>
            </div>
          </div>

          <div className="rules-section">
            <h3>Upgrades</h3>
            <div className="rules-states">
              <div className="rules-state">
                <div className="rules-state-icon">
                  <Character state={1} />
                </div>
                <div className="rules-state-label">Head</div>
              </div>
              <div className="rules-state">
                <div className="rules-state-icon">
                  <Character state={2} />
                </div>
                <div className="rules-state-label">Body</div>
              </div>
              <div className="rules-state">
                <div className="rules-state-icon">
                  <Character state={3} />
                </div>
                <div className="rules-state-label">Gun</div>
              </div>
              <div className="rules-state">
                <div className="rules-state-icon">
                  <Character state={4} />
                </div>
                <div className="rules-state-label">Bullet</div>
              </div>
            </div>
            <p>
              Each soldier upgrades in order: <strong>Head → Body → Gun → Bullet</strong>.
              When you get a <strong>Bullet</strong>, you must use it to shoot before rolling again.
            </p>
          </div>

          <div className="rules-section">
            <h3>Shooting</h3>
            <p>
              When you have a bullet, select any alive soldier slot from another player to kill it.
              That slot becomes dead and the turn moves on.
            </p>
          </div>

          <div className="rules-section">
            <h3>After a game ends</h3>
            <p>
              Everyone clicks <strong>Continue (Same Room)</strong>. Then you’ll be back in the lobby.
              The host can start again when at least 2 players are in the room.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RulesModal;

