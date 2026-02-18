function getNextTurn(room) {
  let nextIndex = room.currentTurn;

  do {
    nextIndex = (nextIndex + 1) % room.players.length;
  } while (room.players[nextIndex].aliveCount === 0);

  return nextIndex;
}

module.exports = getNextTurn;