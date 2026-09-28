// Lanternfall: fruit for the story levels, and the Orchard chapter.
(() => {
  const LF = window.LF;
  const B = LF.build;
  const L = LF.LEVELS;

  // Sprinkle fruit on free standing spots, spread along each level's route.
  const FREE = new Set(['.', '#', '=', '~']);
  L.forEach((lv, i) => {
    const g = lv.map.map(r => r.split(''));
    const h = g.length, w = g[0].length;
    const T = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? '#' : g[y][x];
    const tall = h > w;
    const spots = [];
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      if (T(x, y) !== '.' || T(x, y - 1) !== '.' || !(T(x, y + 1) === '#' || T(x, y + 1) === '=')) continue;
      let clear = true;
      for (let dy = -2; dy <= 2 && clear; dy++) for (let dx = -2; dx <= 2 && clear; dx++) if (!FREE.has(T(x + dx, y + dy))) clear = false;
      if (clear) spots.push({ x, y, k: tall ? -y * 4 + x * .1 : x - y * .1 });
    }
    spots.sort((a, b) => a.k - b.k);
    const want = w * h > 1500 ? 3 : 2;
    for (let n = 0; n < want && spots.length; n++) {
      const s = spots[Math.min(spots.length - 1, Math.round((n + .5) / want * spots.length))];
      g[s.y][s.x] = 'aob'[(i + n) % 3];
    }
    lv.map = g.map(r => r.join(''));
  });

  // ---- Chapter V: The Orchard ----
  L.push({
    chapter: 'The Orchard', name: 'Orchard Walls', dark: .5,
    signs: [
      { x: 1.2, y: 16.4, t: 'apple = shield' },
      { x: 15.1, y: 16, t: 'slide ↓' },
      { x: 20.5, y: 20.4, t: 'wall jump ↑' },
      { x: 21.5, y: 5.4, t: 'banana = double jump' },
      { x: 30.5, y: 15.4, t: 'orange = jump boost' },
    ],
    map: B(40, 26, ({ r, s, walls }) => {
      walls();
      r(1, 22, 17, 24); s(2, 21, 'P'); s(6, 21, 'a'); s(10, 21, 'B');
      r(13, 4, 14, 19);
      r(18, 4, 19, 24);
      s(16, 21, 'L');
      r(22, 7, 25, 7, '='); s(23, 6, 'b'); s(25, 6, 'L');
      r(20, 22, 38, 24); r(25, 21, 32, 21, '^');
      s(34, 21, 'o'); s(37, 21, 'L');
      r(33, 18, 36, 18); s(34, 17, 'D');
    }),
  });

  L.push({
    chapter: 'The Orchard', name: 'Banana Grove', dark: .58,
    signs: [{ x: 1, y: 11.4, t: 'fruit grows back' }],
    map: B(72, 16, ({ r, s, water }) => {
      r(0, 13, 8, 15); s(2, 12, 'P'); s(6, 12, 'b');
      r(17, 11, 22, 15); s(19, 10, 'L'); s(21, 7, 'F');
      r(24, 5, 25, 10); r(29, 3, 30, 9);
      r(23, 13, 34, 15); s(28, 12, 'o');
      s(27, 2, 'L');
      r(36, 9, 40, 9, '='); s(38, 8, 'a');
      r(44, 11, 50, 15); s(47, 10, 'K');
      r(54, 7, 56, 7, 'C'); s(55, 6, 'L');
      r(52, 13, 58, 15); s(57, 12, 'b');
      r(62, 10, 71, 15); s(65, 9, 'S'); s(69, 9, 'D');
      water(15);
    }),
  });
})();
