import './Character.css';

function Character({ state, isDead = false }) {
  // Handle dead state
  if (isDead || state === -1) {
    return (
      <div className="character character-dead">
        <div className="character-head">
          <div className="head-face">
            <div className="eye left-eye dead-x"></div>
            <div className="eye right-eye dead-x"></div>
            <div className="mouth dead-mouth"></div>
          </div>
        </div>
        <div className="character-body">
          <div className="body-torso"></div>
          <div className="body-arm left-arm"></div>
          <div className="body-arm right-arm"></div>
        </div>
        <div className="dead-slash"></div>
      </div>
    );
  }

  // Handle invalid or zero state
  if (!state || state <= 0) {
    return null;
  }

  return (
    <div className={`character character-state-${state}`}>
      {/* State 1: Just Head */}
      {state >= 1 && (
        <div className="character-head">
          <div className="head-face">
            <div className="eye left-eye"></div>
            <div className="eye right-eye"></div>
            <div className="mouth"></div>
          </div>
        </div>
      )}

      {/* State 2: Head + Body */}
      {state >= 2 && (
        <div className="character-body">
          <div className="body-torso"></div>
          <div className="body-arm left-arm"></div>
          <div className="body-arm right-arm"></div>
        </div>
      )}

      {/* State 3: Head + Body + Gun */}
      {state >= 3 && (
        <div className="character-gun">
          <div className="gun-barrel"></div>
          <div className="gun-handle"></div>
          <div className="gun-muzzle-flash"></div>
        </div>
      )}

      {/* State 4: Head + Body + Gun + Bullet indicator */}
      {state >= 4 && (
        <>
          <div className="character-bullet-indicator">
            <div className="bullet-icon">🔴</div>
          </div>
          <div className="power-aura"></div>
        </>
      )}
    </div>
  );
}

export default Character;
