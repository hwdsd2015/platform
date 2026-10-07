// Lanternfall: the Sky Roads, a world of pure platforming. No enemies, no floor: islands
// of stone hang in the night sky over a sea of cloud, and a fall is a fall all the way down.
// Wheels (x) turn their platforms round and round. These levels aren't in LF.LEVELS when the
// boss fights are laid in (they'd shift every tower); bosses.js slots them in as their own
// world, after the Clockwork Quarter. Load after levels-11.js and before bosses.js.
(() => {
  const LF = window.LF;
  const B = LF.build;
  const H = 20;
  // A floating island: a slab w wide, tapering underneath.
  const islands = (r, s) => (x, y, w) => { r(x, y, x + w - 1, y); if (w > 2) r(x + 1, y + 1, x + w - 2, y + 1); };
  const sky = (chapter, name, w, signs, draw) => ({
    chapter, name, sky: true, dark: .3, signs,
    map: B(w, H, ({ r, s }) => draw({ r, s, isle: islands(r, s) })),
  });

  LF.SKY_LEVELS = [
    sky('The Cloud Steps', 'Cloud Steps', 78, [{ x: 1, y: 10.4, t: 'THE SKY ROADS · no floor, no enemies · mind the drop' }], ({ s, isle }) => {
      isle(0, 14, 6); s(2, 13, 'P');
      isle(9, 14, 4); isle(16, 12, 4); isle(23, 13, 3); isle(29, 11, 4);
      isle(36, 11, 5); s(38, 10, 'L'); s(39, 10, 'o');
      isle(44, 13, 3);
      isle(50, 14, 4); s(52, 14, 'O');
      isle(55, 7, 5); isle(63, 9, 3);
      isle(69, 11, 6); s(73, 10, 'D');
    }),
    sky('The Cloud Steps', 'First Wheel', 70, [{ x: 1, y: 9.4, t: 'wheels turn: hop on, ride, hop off' }], ({ s, isle }) => {
      isle(0, 13, 6); s(2, 12, 'P');
      s(10, 12, 'x');
      isle(17, 11, 4); s(18, 10, 'b');
      isle(23, 9, 3);
      s(30, 10, 'x');
      isle(34, 6, 4);
      isle(40, 8, 3); s(41, 7, 'L');
      isle(46, 10, 3);
      s(54, 11, 'x');
      isle(61, 11, 6); s(64, 10, 'D');
    }),
    sky('The Cloud Steps', 'Drifting Lifts', 84, [{ x: 1, y: 9.4, t: 'lifts drift between the islands' }], ({ r, s, isle }) => {
      isle(0, 13, 5); s(1, 12, 'P');
      s(6, 13, 'M'); s(17, 13, '|');
      isle(19, 13, 4);
      s(25, 13, 'V'); s(25, 5, '|'); s(26, 5, '|'); s(25, 15, '|'); s(26, 15, '|');
      isle(28, 6, 5); s(30, 5, 'L');
      s(34, 6, 'M'); s(46, 6, '|');
      isle(48, 7, 3);
      for (const x of [52, 54, 56, 58, 60]) s(x, 9, 'd');
      isle(63, 9, 3);
      s(68, 12, 'V'); s(68, 8, '|'); s(69, 8, '|'); s(68, 15, '|'); s(69, 15, '|');
      isle(72, 13, 10); s(73, 12, 'a'); s(78, 12, 'D');
    }),
    sky('The Cloud Steps', 'Shingle Sky', 80, [{ x: 1, y: 8.4, t: 'shingles fall · stone crumbles · springs fling' }], ({ r, s, isle }) => {
      isle(0, 12, 5); s(1, 11, 'P');
      for (const x of [7, 9, 11, 13]) s(x, 12, 'd');
      isle(16, 12, 3);
      r(21, 10, 28, 10, 'C');
      isle(31, 10, 4); s(33, 9, 'L'); s(32, 9, 'o');
      isle(37, 13, 3); s(38, 13, 'O');
      isle(41, 5, 5);
      s(48, 7, 'd'); s(50, 8, 'd'); s(52, 9, 'd'); s(54, 10, 'd');
      isle(57, 11, 3); s(58, 10, 'a');
      r(62, 11, 68, 11, 'C');
      isle(71, 11, 8); s(76, 10, 'D');
    }),
    sky('The Wind Wheels', 'Wind Wheels', 82, [{ x: 1, y: 9.4, t: 'THE WIND WHEELS · wheel to wheel' }], ({ s, isle }) => {
      isle(0, 13, 5); s(1, 12, 'P');
      s(9, 12, 'x'); s(17, 10, 'x');
      isle(24, 9, 3); s(25, 8, 'L');
      s(32, 8, 'x'); s(41, 10, 'x');
      isle(48, 11, 3);
      isle(54, 9, 3); s(55, 8, 'b');
      s(63, 9, 'x');
      isle(70, 9, 10); s(77, 8, 'D');
    }),
    sky('The Wind Wheels', 'Blink Heights', 80, [{ x: 1, y: 8.4, t: 'the blocks blink in turn' }], ({ r, s, isle }) => {
      isle(0, 12, 5); s(1, 11, 'P');
      r(7, 12, 9, 12, 'T'); r(12, 11, 14, 11, 'H'); r(17, 10, 19, 10, 'T'); r(22, 10, 24, 10, 'H');
      isle(27, 10, 4); s(29, 9, 'L');
      s(36, 10, 'x');
      r(43, 9, 45, 9, 'T'); r(48, 8, 50, 8, 'H');
      isle(53, 8, 3);
      isle(59, 12, 3); s(60, 12, 'O');
      isle(63, 5, 4); s(64, 4, 'o');
      isle(70, 7, 8); s(75, 6, 'D');
    }),
    sky('The Wind Wheels', 'Windmill Run', 96, [{ x: 1, y: 9.4, t: 'lift, wheel, shingles, belt, lift, wheel' }], ({ r, s, isle }) => {
      isle(0, 13, 5); s(1, 12, 'P');
      s(5, 13, 'M'); s(15, 13, '|');
      isle(17, 13, 3);
      s(24, 11, 'x');
      isle(28, 7, 3); s(29, 6, 'L');
      s(33, 8, 'd'); s(35, 9, 'd'); s(37, 10, 'd');
      r(40, 11, 46, 11, '<');
      isle(49, 11, 3);
      s(54, 11, 'V'); s(54, 4, '|'); s(55, 4, '|'); s(54, 14, '|'); s(55, 14, '|');
      isle(58, 5, 3);
      s(66, 7, 'x');
      for (const x of [73, 75, 77]) s(x, 8, 'd');
      isle(80, 9, 14); s(82, 8, 'a'); s(90, 8, 'D');
    }),
    sky('The Wind Wheels', 'Summit of Air', 110, [{ x: 1, y: 11.4, t: 'the last of the Sky Roads · everything at once' }], ({ r, s, isle }) => {
      isle(0, 14, 5); s(1, 13, 'P'); s(3, 13, 'o');
      r(7, 13, 9, 13, 'T'); r(12, 12, 14, 12, 'H');
      isle(17, 11, 3);
      s(25, 11, 'x'); s(34, 9, 'x');
      isle(38, 4, 4); s(40, 3, 'L'); s(39, 3, 'b');
      r(45, 5, 50, 5, 'C');
      isle(53, 6, 3);
      s(56, 9, '|'); s(57, 9, 'M'); s(69, 9, '|');
      isle(71, 9, 3);
      s(75, 10, 'd'); s(77, 11, 'd'); s(79, 12, 'd');
      isle(82, 12, 3); s(83, 12, 'O');
      isle(86, 4, 4);
      s(96, 7, 'x');
      isle(103, 8, 7); s(107, 7, 'D');
    }),
  ];
})();
