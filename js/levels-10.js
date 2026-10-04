// Lanternfall: Chapter XIII (The Powder Works): TNT carts, golems, spiked pendulums.
(() => {
  const LF = window.LF;
  const B = LF.build;
  const L = LF.LEVELS;

  // Carts and golems are penned in by stop markers (|) so a cart's 10-block blast always
  // reaches the golems beside it. Planks above each fight let Hardcore (no ammo) hop past.

  L.push({
    chapter: 'The Powder Works', name: 'Powder Row', dark: .62,
    signs: [
      { x: 6, y: 8.4, t: 'TNT cart: 5 hits and BOOM — golems too' },
      { x: 30, y: 9.4, t: 'red chains cut' },
    ],
    map: B(92, 16, ({ r, s }) => {
      r(0, 12, 91, 15); s(2, 11, 'P'); s(4, 11, 'q'); s(6, 11, 'q');
      // A cart, then two golems close enough to go up with it.
      s(13, 11, '|'); s(15, 11, '@'); s(18, 11, '|');
      s(20, 11, 'I'); s(23, 11, 'I'); s(25, 11, '|'); s(22, 11, 'L');
      r(12, 9, 26, 9, '=');
      // Pendulum corridor: spiked, plain, spiked.
      r(32, 0, 60, 7);
      s(36, 8, 'e'); s(44, 8, 'E'); s(52, 8, 'e');
      s(40, 11, 'L'); s(48, 11, 'L'); s(57, 11, 'q');
      // Another cart guarding a golem, then the door.
      s(65, 11, '|'); s(67, 11, '@'); s(69, 11, '|'); s(72, 11, 'I'); s(76, 11, '|');
      r(63, 9, 77, 9, '=');
      s(80, 11, 'L'); r(83, 12, 84, 12, '^'); s(88, 11, 'D');
    }),
  });

  L.push({
    chapter: 'The Powder Works', name: 'Thorn Gallery', dark: .68,
    signs: [{ x: 2, y: 9.4, t: 'thorny red chains cut — dodge every swing' }],
    map: B(100, 18, ({ r, s }) => {
      r(0, 0, 99, 6); r(0, 13, 99, 17);
      // Each pendulum hangs from a short post under the high ceiling.
      const hang = (x, c) => { r(x, 7, x, 8); s(x, 9, c); };
      s(2, 12, 'P'); s(5, 12, 'Q');
      hang(10, 'e'); s(14, 12, 'L'); hang(18, 'e');
      s(21, 12, '|'); s(25, 12, 'I'); s(27, 12, 'L'); s(30, 12, '|');
      r(32, 13, 34, 13, '^');
      hang(38, 'e'); s(41, 12, 'L'); hang(44, 'E'); s(47, 12, 'L'); hang(50, 'e'); s(53, 12, 'q');
      s(56, 12, '|'); s(58, 12, '@'); s(60, 12, '|');
      s(62, 12, 'I'); s(65, 12, 'I'); s(64, 12, 'L'); s(67, 12, '|');
      s(70, 12, 'q');
      hang(72, 'e'); s(75, 12, 'L'); hang(78, 'e'); s(81, 12, 'L'); hang(84, 'E');
      s(87, 12, '|'); s(90, 12, 'I'); s(92, 12, 'L'); s(94, 12, '|'); s(97, 12, 'D');
    }),
  });

  L.push({
    chapter: 'The Powder Works', name: 'The Powder Keg', dark: .72,
    signs: [
      { x: 31, y: 13.4, t: 'one cart sets off the next…' },
      { x: 74, y: 15.4, t: 'thorns ahead' },
    ],
    map: B(110, 22, ({ r, s }) => {
      r(0, 18, 109, 21); s(2, 17, 'P'); s(4, 17, 'Q'); s(6, 17, 'q');
      // A step up to a ledge with a golem on it; spiked pendulums hang beneath.
      r(8, 15, 9, 15);
      r(10, 13, 30, 13); s(12, 12, 'q'); s(11, 12, '|'); s(20, 12, 'I'); s(26, 12, 'L'); s(29, 12, '|');
      s(14, 14, 'e'); s(22, 14, 'e'); s(18, 17, 'L');
      // The keg row: four carts 8 apart with a golem penned between each pair, so one
      // blast sets off the lot. The plank above is the way round for Hardcore.
      for (const x of [36, 40, 44, 48, 52, 56, 60, 64, 69]) s(x, 17, '|');
      for (const x of [38, 46, 54, 62]) s(x, 17, '@');
      for (const x of [42, 50, 58, 66]) s(x, 17, 'I');
      r(34, 15, 70, 15, '='); s(52, 14, 'L');
      s(73, 17, 'q');
      // Low ceiling with three pendulums.
      r(75, 0, 95, 13);
      s(79, 14, 'e'); s(85, 14, 'E'); s(91, 14, 'e'); s(82, 17, 'L'); s(88, 17, 'L');
      // A last golem guards the door.
      s(96, 17, '|'); s(100, 17, 'I'); s(104, 17, '|');
      r(97, 15, 103, 15, '='); s(100, 14, 'L');
      s(107, 17, 'D');
    }),
  });
})();
