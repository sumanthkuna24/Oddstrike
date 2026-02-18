function createDefaultSlots() {
  const numbers = [1, 2, 3, 4, 5];

  return numbers.map((num) => ({
    number: num,
    state: 0
  }));
}

module.exports = createDefaultSlots;