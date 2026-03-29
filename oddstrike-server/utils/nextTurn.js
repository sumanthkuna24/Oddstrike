function getNextTurn(room) {
  if (!room?.players?.length) return 0;

  const aliveCount = room.players.filter((p) => p.aliveCount > 0).length;
  if (aliveCount === 0) return 0;

  let nextIndex = room.currentTurn;

  for (let i = 0; i < room.players.length; i += 1) {
    nextIndex = (nextIndex + 1) % room.players.length;
    if (room.players[nextIndex].aliveCount > 0) {
      return nextIndex;
    }
  }

  return 0;
}

module.exports = getNextTurn;
