import './Dice.css';

function Dice({ value, isJoker = false }) {
  if (isJoker) {
    return (
      <div className="dice dice-joker">
        <div className="dice-face joker-face">
          <div className="joker-icon">🃏</div>
        </div>
      </div>
    );
  }

  const dots = [];
  const dotPositions = {
    1: ['center'],
    2: ['top-left', 'bottom-right'],
    3: ['top-left', 'center', 'bottom-right'],
    4: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
    5: ['top-left', 'top-right', 'center', 'bottom-left', 'bottom-right']
  };

  const positions = dotPositions[value] || [];
  
  positions.forEach((pos, idx) => {
    dots.push(<div key={idx} className={`dice-dot ${pos}`}></div>);
  });

  return (
    <div className="dice">
      <div className="dice-face">
        {dots}
      </div>
    </div>
  );
}

export default Dice;
