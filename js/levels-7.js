// Lanternfall: Chapter X (The Clock Tower): pendulums, fire bars, crushers.
(() => {
  const LF = window.LF;
  const B = LF.build;
  const L = LF.LEVELS;

  L.push({
    chapter: 'The Clock Tower', name: 'Pendulum Hall', dark: .6,
    signs: [
      { x: 1, y: 9.4, t: 'time the pendulums — the red chain cuts too' },
      { x: 37, y: 9.4, t: 'fire bars spin' },
      { x: 48, y: 9.4, t: 'crushers drop' },
    ],
    map: B(80, 16, ({ r, s }) => {
      r(0, 0, 79, 7);
      r(0, 12, 79, 15); s(2, 11, 'P'); s(5, 11, 'q');
      s(10, 8, 'E'); s(18, 8, 'e'); s(26, 8, 'E'); s(14, 11, 'L'); s(22, 11, 'q');
      r(33, 12, 35, 12, '^'); s(30, 11, 'L');
      s(41, 10, 'f'); s(46, 11, 'Q');
      s(51, 8, 'k'); s(55, 8, 'k'); s(59, 8, 'k'); s(53, 11, 'L');
      s(64, 8, 'E'); r(67, 12, 68, 12, '^'); s(72, 8, 'E');
      s(70, 11, 'L'); s(76, 11, 'D');
    }),
  });

  L.push({
    chapter: 'The Clock Tower', name: 'Fire Bar Gallery', dark: .66,
    map: B(70, 20, ({ r, s, water }) => {
      r(0, 14, 7, 19); s(2, 13, 'P'); s(5, 13, 'q');
      r(10, 12, 14, 12);
      s(16, 9, 'f');
      r(18, 12, 22, 12); s(20, 11, 'L');
      r(25, 10, 29, 10); r(24, 5, 30, 5); s(27, 6, 'E'); s(28, 9, 'q');
      s(33, 13, 'f');
      r(36, 11, 40, 11); s(38, 10, 'L');
      r(43, 9, 46, 9); s(44, 5, 'E'); s(45, 8, 'Q');
      s(49, 8, 'f');
      r(52, 11, 56, 11); r(52, 3, 56, 3); s(54, 4, 'k'); s(53, 10, 'L');
      r(59, 12, 69, 19); s(62, 11, 'L'); s(67, 11, 'D');
      water(18);
    }),
  });

  L.push({
    chapter: 'The Clock Tower', name: 'The Clock Tower', dark: .74,
    signs: [{ x: 1.5, y: 44.4, t: 'up through the clockwork' }],
    map: B(30, 50, ({ r, s, walls }) => {
      walls();
      r(1, 47, 28, 48); s(3, 46, 'P'); s(6, 46, 'q');
      r(8, 44, 13, 44);
      r(15, 41, 21, 41); s(24, 38, 'f');
      r(9, 38, 14, 38, '=');
      r(2, 35, 7, 35); s(4, 34, 'L'); s(5, 31, 'E');
      r(9, 32, 14, 32); s(12, 31, 'q');
      r(16, 29, 21, 29);
      r(23, 26, 27, 26); s(25, 25, 'L'); s(25, 19, 'k');
      r(16, 23, 21, 23);
      r(9, 20, 14, 20, '=');
      r(2, 17, 7, 17); s(3, 16, 'q');
      r(9, 14, 15, 14);
      r(17, 11, 23, 11); s(20, 10, 'L'); s(26, 9, 'f');
      r(10, 8, 15, 8, '='); s(12, 4, 'E'); s(12, 7, 'Q');
      r(2, 5, 8, 5); s(3, 4, 'L');
      r(10, 2, 27, 2); s(25, 1, 'D');
    }),
  });
})();
