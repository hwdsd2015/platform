// Lanternfall: ammo for every level, and Chapter VIII (The Clockworks).
(() => {
  const LF = window.LF;
  const B = LF.build;
  const L = LF.LEVELS;

  // Small crates (+3) along each level's route, and one big crate (+10) on its most
  // dangerous reachable spot: the special challenge.
  const FREE = new Set(['.', '#', '=', '~']);
  const DANGER = { '^': 3, B: 1, K: 2, F: 1, J: 1, S: 2, G: 3, X: 2, R: 2, Z: 3, Y: 1, U: 1, N: 1 };
  L.forEach((lv, i) => {
    const g = lv.map.map(r => r.split(''));
    const h = g.length, w = g[0].length;
    const T = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? '#' : g[y][x];
    const seen = LF.analyze(lv).seen;
    const tall = h > w;
    const spots = [];
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      if (T(x, y) !== '.' || T(x, y - 1) !== '.' || !seen[y * w + x]) continue;
      if (!(T(x, y + 1) === '#' || T(x, y + 1) === '=')) continue;
      let clear = true, danger = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (!FREE.has(T(x + dx, y + dy))) clear = false;
      if (!clear) continue;
      for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) danger += DANGER[T(x + dx, y + dy)] || 0;
      spots.push({ x, y, danger, k: tall ? -y * 4 + x * .1 : x - y * .1 });
    }
    if (!spots.length) return;
    const best = spots.reduce((a, b) => (b.danger > a.danger || (b.danger === a.danger && b.k > a.k) ? b : a));
    g[best.y][best.x] = 'Q';
    const rest = spots.filter(s => Math.abs(s.x - best.x) + Math.abs(s.y - best.y) > 4).sort((a, b) => a.k - b.k);
    const want = w * h > 1500 ? 3 : 2;
    for (let n = 0; n < want && rest.length; n++) {
      const s = rest[Math.min(rest.length - 1, Math.round((n + .25) / want * rest.length))];
      if (g[s.y][s.x] === '.') g[s.y][s.x] = 'q';
    }
    lv.map = g.map(r => r.join(''));
  });

  // ---- Chapter VIII: The Clockworks ----
  L.push({
    chapter: 'The Clockworks', name: 'Blinkworks', dark: .55,
    signs: [
      { x: 1, y: 8.4, t: 'amber and blue blocks take turns' },
      { x: 1, y: 9.4, t: 'E to fire · hold for autofire' },
      { x: 33, y: 8.4, t: 'belts push you' },
    ],
    map: B(70, 16, ({ r, s }) => {
      r(0, 12, 7, 15); s(2, 11, 'P'); s(5, 11, 'q');
      r(8, 15, 62, 15); r(8, 14, 62, 14, '^');
      r(9, 11, 11, 11, 'T'); r(14, 10, 16, 10, 'H'); s(15, 9, 'L');
      r(19, 11, 21, 11, 'T'); r(24, 10, 26, 10, 'H'); r(29, 11, 31, 11, 'T'); s(30, 10, 'L');
      r(34, 12, 46, 13); r(34, 12, 46, 12, '<'); s(40, 11, 'K'); s(36, 11, 'q');
      r(38, 9, 39, 9, 'T'); r(41, 6, 42, 6, 'H'); s(42, 5, 'Q');
      r(49, 10, 51, 10, 'H'); r(54, 11, 56, 11, 'T'); s(58, 6, 'G');
      r(59, 12, 61, 12, 'H');
      r(63, 12, 69, 15); s(65, 11, 'L'); s(67, 11, 'D');
    }),
  });

  L.push({
    chapter: 'The Clockworks', name: 'Foundry Belts', dark: .6,
    signs: [{ x: 1, y: 9.4, t: 'thornbacks can’t be stomped — but they can be shot' }],
    map: B(84, 18, ({ r, s, water }) => {
      r(0, 13, 9, 17); s(2, 12, 'P'); s(7, 12, 'q');
      r(10, 13, 24, 17); r(10, 13, 24, 13, '>'); s(16, 12, 'K'); s(21, 12, 'K'); s(18, 12, 'L');
      r(25, 13, 27, 17); s(26, 12, 'S');
      r(28, 10, 32, 10, '='); s(30, 9, 'q');
      r(34, 13, 36, 17);
      r(40, 13, 42, 17); s(41, 12, 'L'); s(38, 16, 'Y');
      r(43, 11, 55, 17); r(43, 11, 55, 11, '<'); s(47, 10, 'R'); s(52, 10, 'B'); s(49, 6, 'Z');
      r(52, 8, 53, 8, 'H'); r(46, 5, 50, 5); s(48, 4, 'Q'); s(44, 2, 'F');
      r(58, 9, 60, 9, 'T'); r(62, 9, 64, 9, 'H');
      r(66, 11, 83, 17); r(66, 11, 72, 11, '>'); s(70, 10, 'L'); s(76, 10, 'S'); s(74, 10, 'q'); s(81, 10, 'D');
      water(16);
    }),
  });

  L.push({
    chapter: 'The Clockworks', name: 'Blink Tower', dark: .66,
    map: B(28, 46, ({ r, s, walls }) => {
      walls();
      r(1, 43, 26, 44); s(3, 42, 'P'); s(6, 42, 'q'); s(22, 42, 'B'); s(18, 42, 'L');
      r(9, 40, 12, 40, 'T'); r(14, 37, 17, 37, 'H'); r(19, 34, 23, 34); s(21, 33, 'L'); s(23, 33, 'S');
      r(14, 31, 17, 31, 'T'); r(9, 28, 12, 28, 'H'); r(3, 25, 7, 25); s(5, 24, 'q'); s(5, 21, 'Z');
      r(9, 22, 12, 22, 'T'); r(14, 19, 17, 19, 'H'); r(19, 16, 25, 16); s(22, 15, 'L'); s(24, 15, 'K');
      r(15, 13, 18, 13, 'T'); r(10, 10, 13, 10, 'H'); r(2, 7, 8, 7); s(3, 6, 'Q'); s(5, 6, 'G');
      r(10, 4, 13, 4, 'T'); r(14, 3, 25, 3); s(19, 2, 'L'); s(23, 2, 'D'); s(16, 8, 'F');
    }),
  });

  L.push({
    chapter: 'The Clockworks', name: 'Clockwork Heart', dark: .76,
    signs: [{ x: 1, y: 17.4, t: 'the heart of the clock — save your shots' }],
    map: B(96, 24, ({ r, s, water }) => {
      r(0, 20, 8, 23); s(2, 19, 'P'); s(6, 19, 'q');
      r(11, 18, 13, 18, 'T'); r(16, 16, 18, 16, 'H');
      r(20, 18, 32, 23); r(20, 18, 26, 18, '>'); s(24, 17, 'R'); s(29, 17, 'L'); s(31, 17, 'K');
      r(18, 13, 20, 13, '='); r(22, 10, 30, 10); s(22, 11, 'X'); s(28, 11, 'X'); s(26, 9, 'q');
      r(33, 18, 35, 23); s(34, 17, 'S');
      s(38, 21, 'N'); s(43, 22, 'U'); r(39, 17, 41, 17, 'H');
      r(45, 16, 47, 16, 'T'); r(49, 14, 51, 14, 'H'); r(53, 12, 55, 12, 'T'); s(54, 11, 'L');
      r(56, 9, 57, 9, 'H'); r(47, 6, 54, 6); s(49, 5, 'Q'); s(44, 3, 'Z'); s(52, 2, 'G');
      r(57, 17, 72, 23); r(57, 17, 72, 17, '<'); s(61, 16, 'K'); s(66, 16, 'R'); s(70, 16, 'q'); s(64, 12, 'Z');
      r(59, 13, 61, 13, '='); s(60, 12, 'L');
      r(75, 15, 77, 15, 'H'); r(79, 13, 81, 13, 'T'); s(80, 9, 'F');
      r(84, 16, 95, 23); s(86, 15, 'L'); s(89, 15, 'G'); s(92, 15, 'S'); s(94, 15, 'D');
      water(21);
    }),
  });
})();
