function upgradeState(slot) {
  if (slot.state === -1) return slot; // dead
  if (slot.state >= 4) return slot;   // already bullet

  slot.state += 1;
  return slot;
}

module.exports = upgradeState;
