function rollDice() {
  const values = [1, 2, 3, 4, 5, 'joker'];
  return values[Math.floor(Math.random() * values.length)];
}

module.exports = rollDice;
