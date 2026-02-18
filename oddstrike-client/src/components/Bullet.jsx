import './Bullet.css';

function Bullet({ from, to, onComplete }) {
  // Calculate angle for trail rotation
  const angle = Math.atan2(to.y - from.y, to.x - from.x) * (180 / Math.PI);
  
  return (
    <div 
      className="bullet-trajectory"
      style={{
        '--from-x': `${from.x}px`,
        '--from-y': `${from.y}px`,
        '--to-x': `${to.x}px`,
        '--to-y': `${to.y}px`,
        '--trail-angle': `${angle}deg`,
      }}
      onAnimationEnd={onComplete}
    >
      <div className="bullet"></div>
      <div className="bullet-trail"></div>
    </div>
  );
}

export default Bullet;
