// Lanternfall: the Sky Roads, a world of pure platforming. No enemies, no floor: islands
// of stone hang in the night sky over a sea of cloud, and a fall is a fall all the way down.
// Wheels (x) turn their platforms round and round; turn blocks (:) turn a quarter turn at a
// time, tipping off anyone still standing on them. These levels aren't in LF.LEVELS when the
// boss fights are laid in (they'd shift every tower); bosses.js slots them in as their own
// world, after the Clockwork Quarter. Load after levels-11.js and before bosses.js.
(() => {
  const LF = window.LF;
  const B = LF.build;
  const H = 20;
  // A floating island: a slab w wide, tapering underneath.
  const islands = (r, s) => (x, y, w) => { r(x, y, x + w - 1, y); if (w > 2) r(x + 1, y + 1, x + w - 2, y + 1); };
  // (since: the save version that brought the level in; see the save migration in ui.js.)
  const sky = (chapter, name, w, signs, draw, since = 4) => ({
    chapter, name, sky: true, since, dark: .3, signs,
    map: B(w, H, ({ r, s }) => draw({ r, s, isle: islands(r, s) })),
  });

  LF.SKY_LEVELS = [
    sky('The Cloud Steps', 'Cloud Steps', 78, [{ x: 1, y: 10.4, t: 'THE SKY ROADS · no floor, no enemies · mind the drop' }], ({ s, isle }) => {
      isle(0, 14, 6); s(2, 13, 'P');
      isle(9, 14, 4); isle(16, 12, 4); s(24, 13, ':'); isle(29, 11, 4);
      isle(36, 11, 5); s(38, 10, 'L'); s(39, 10, 'o');
      isle(44, 13, 3);
      isle(50, 14, 4); s(52, 14, 'O');
      isle(55, 7, 5); isle(63, 9, 3);
      isle(69, 11, 6); s(73, 10, 'D');
    }),
    sky('The Cloud Steps', 'First Wheel', 70, [{ x: 1, y: 9.4, t: 'wheels turn: hop on, ride, hop off' }], ({ s, isle }) => {
      isle(0, 13, 6); s(2, 12, 'P');
      s(10, 12, ',');
      isle(17, 11, 4); s(18, 10, 'b');
      isle(23, 9, 3);
      s(30, 10, ',');
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
      s(17, 13, ';');
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
      s(32, 8, ','); s(41, 10, 'x');
      s(49, 12, ':');
      isle(54, 9, 3); s(55, 8, 'b');
      s(63, 9, ',');
      isle(70, 9, 10); s(77, 8, 'D');
    }),
    sky('The Wind Wheels', 'Blink Heights', 80, [{ x: 1, y: 8.4, t: 'the blocks blink in turn' }], ({ r, s, isle }) => {
      isle(0, 12, 5); s(1, 11, 'P');
      r(7, 12, 9, 12, 'T'); r(12, 11, 14, 11, 'H'); r(17, 10, 19, 10, 'T'); r(22, 10, 24, 10, 'H');
      isle(27, 10, 4); s(29, 9, 'L');
      s(36, 10, ',');
      r(43, 9, 45, 9, 'T'); r(48, 8, 50, 8, 'H');
      s(54, 9, ':');
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
      s(25, 11, ','); s(34, 9, 'x');
      isle(38, 4, 4); s(40, 3, 'L'); s(39, 3, 'b');
      r(45, 5, 50, 5, 'C');
      s(54, 7, ':');
      s(56, 9, '|'); s(57, 9, 'M'); s(69, 9, '|');
      isle(71, 9, 3);
      s(75, 10, 'd'); s(77, 11, 'd'); s(79, 12, 'd');
      isle(82, 12, 3); s(83, 12, 'O');
      isle(86, 4, 4);
      s(96, 7, 'x');
      isle(103, 8, 7); s(107, 7, 'D');
    }),
    // ---- The Storm Heights (added later): turn blocks, lifts and wheels, then the Sky Spire ----
    sky('The Storm Heights', 'Spinning Steps', 78, [{ x: 1, y: 9.4, t: 'THE STORM HEIGHTS · turn blocks spin: walk to stay on top' }], ({ s, isle }) => {
      isle(0, 13, 5); s(1, 12, 'P');
      s(9, 13, ';'); s(15, 12, ':'); s(21, 11, ';');
      isle(26, 10, 4); s(27, 9, 'L');
      s(34, 11, ':'); s(40, 13, ':');
      isle(45, 12, 3);
      s(52, 10, ',');
      isle(58, 10, 3); s(64, 10, ';');
      isle(68, 10, 8); s(74, 9, 'D');
    }, 6),
    sky('The Storm Heights', 'Gale Lifts', 96, [{ x: 1, y: 9.4, t: 'ride the gale: lifts, shingles, crumbling stone' }], ({ r, s, isle }) => {
      isle(0, 13, 5); s(1, 12, 'P');
      s(6, 13, 'M'); s(16, 13, '|');
      isle(18, 13, 3);
      s(23, 12, 'd'); s(25, 11, 'd'); s(27, 10, 'd');
      isle(30, 10, 4); s(31, 9, 'L');
      s(35, 10, 'M'); s(47, 10, '|');
      isle(49, 11, 3);
      s(54, 12, 'V'); s(54, 6, '|'); s(55, 6, '|'); s(54, 14, '|'); s(55, 14, '|');
      isle(57, 7, 3);
      r(62, 8, 67, 8, 'C');
      s(71, 9, ';');
      isle(76, 10, 3); s(80, 11, 'd'); s(82, 11, 'd');
      isle(85, 11, 10); s(86, 10, 'b'); s(92, 10, 'D');
    }, 6),
    sky('The Storm Heights', 'Wheelwork', 90, [{ x: 1, y: 9.4, t: 'wheel, blink, wheel, wheel, spin, wheel' }], ({ r, s, isle }) => {
      isle(0, 13, 6); s(2, 12, 'P');
      s(10, 12, ',');
      isle(17, 11, 4);
      r(22, 10, 24, 10, 'T'); r(27, 9, 29, 9, 'H');
      isle(32, 9, 3); s(33, 8, 'L');
      s(39, 10, 'x'); s(47, 10, 'x');
      isle(53, 10, 3); s(59, 10, ':');
      isle(63, 9, 3); s(70, 9, 'x');
      isle(76, 9, 12); s(78, 8, 'o'); s(85, 8, 'D');
    }, 6),
    sky('The Storm Heights', 'The Last Gust', 112, [{ x: 1, y: 10.4, t: 'the last gust before the Sky Spire' }], ({ r, s, isle }) => {
      isle(0, 14, 5); s(1, 13, 'P');
      isle(6, 15, 3); s(7, 15, 'O');
      isle(10, 8, 4);
      r(16, 8, 21, 8, 'C');
      s(25, 9, ';');
      isle(29, 8, 4); s(31, 7, 'L');
      s(34, 8, 'M'); s(44, 8, '|');
      s(48, 10, ','); s(57, 10, 'x');
      r(62, 9, 64, 9, 'T'); r(67, 8, 69, 8, 'H');
      isle(72, 8, 3); s(77, 9, 'd'); s(79, 10, 'd'); s(81, 11, 'd');
      s(85, 12, ':');
      isle(90, 11, 3);
      s(95, 12, 'V'); s(95, 6, '|'); s(96, 6, '|'); s(95, 13, '|'); s(96, 13, '|');
      isle(98, 7, 3);
      isle(102, 9, 8); s(108, 8, 'D');
    }, 6),
    // ---- The High Winds (added later still): faster wheels and turn blocks, then the Sky Spire ----
    sky('The High Winds', 'Whirl Bridge', 86, [{ x: 1, y: 9.4, t: 'THE HIGH WINDS · wheel to block to wheel' }], ({ s, isle }) => {
      isle(0, 13, 6); s(2, 12, 'P');
      s(10, 12, ','); isle(17, 11, 4);
      s(25, 11, ';'); s(33, 10, 'x');
      isle(39, 9, 3); s(40, 8, 'L');
      s(46, 10, ';'); s(54, 11, 'x');
      isle(60, 11, 3); s(68, 10, ',');
      isle(74, 10, 10); s(76, 9, 'a'); s(81, 9, 'D');
    }, 8),
    sky('The High Winds', 'Crumble Clouds', 88, [{ x: 1, y: 9.4, t: 'nothing up here lasts: keep moving' }], ({ r, s, isle }) => {
      isle(0, 13, 5); s(1, 12, 'P');
      r(7, 12, 12, 12, 'C');
      isle(15, 13, 3); s(16, 13, 'O');
      isle(19, 6, 4);
      r(25, 6, 30, 6, 'C');
      s(33, 7, 'd'); s(35, 8, 'd'); s(37, 9, 'd');
      isle(40, 10, 4); s(42, 9, 'L');
      s(47, 11, ';');
      r(51, 10, 56, 10, 'C');
      isle(59, 11, 3); s(60, 11, 'O');
      isle(63, 4, 4);
      s(69, 5, 'd'); s(71, 6, 'd'); s(73, 7, 'd');
      isle(76, 9, 10); s(83, 8, 'D');
    }, 8),
    sky('The High Winds', 'Spin Cycle', 92, [{ x: 1, y: 9.4, t: 'lift, spin, blink, spin, lift, spin, spin' }], ({ r, s, isle }) => {
      isle(0, 13, 5); s(1, 12, 'P');
      s(6, 13, 'M'); s(15, 13, '|');
      s(18, 13, ':');
      r(22, 11, 24, 11, 'T'); r(27, 10, 29, 10, 'H');
      isle(32, 10, 3); s(33, 9, 'L');
      s(38, 11, ':');
      s(43, 12, 'V'); s(43, 6, '|'); s(44, 6, '|'); s(43, 14, '|'); s(44, 14, '|');
      isle(46, 7, 3);
      s(52, 8, ';'); s(58, 9, ':');
      isle(62, 9, 3);
      s(66, 9, '|'); s(67, 9, 'M'); s(78, 9, '|');
      isle(80, 9, 10); s(82, 8, 'b'); s(87, 8, 'D');
    }, 8),
    sky('The High Winds', 'Eye of the Storm', 120, [{ x: 1, y: 10.4, t: 'the eye of the storm · the Sky Spire waits beyond' }], ({ r, s, isle }) => {
      isle(0, 14, 5); s(1, 13, 'P');
      s(9, 13, ','); s(16, 12, ';');
      r(20, 10, 25, 10, 'C');
      isle(28, 10, 3); s(29, 10, 'O');
      isle(32, 3, 4); s(33, 2, 'L');
      s(38, 4, 'd'); s(40, 5, 'd'); s(42, 6, 'd');
      s(48, 8, ','); s(57, 8, 'x');
      r(63, 8, 65, 8, 'T'); r(68, 8, 70, 8, 'H');
      s(74, 9, ':');
      isle(78, 9, 3);
      s(83, 10, 'V'); s(83, 4, '|'); s(84, 4, '|'); s(83, 12, '|'); s(84, 12, '|');
      isle(86, 5, 3);
      s(92, 6, ';');
      r(96, 7, 101, 7, 'C');
      isle(104, 9, 14); s(106, 8, 'o'); s(116, 8, 'D');
    }, 8),
  ];
})();
