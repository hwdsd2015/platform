// Lanternfall: secret exits. Two regular levels in every ten get a second, hidden door (?)
// in an out-of-the-way spot: as high and as far from the start and the door as you can
// reach. Leaving by it counts as a clear and opens a shortcut on the map to a level eight
// regular levels further on (lv.secretTo, an index into LF.LEVELS). Load after bosses.js,
// so the indexes are final.
(() => {
  const LF = window.LF, L = LF.LEVELS;
  const regular = L.map((lv, i) => i).filter(i => !L[i].boss);
  const floor = c => c === '#' || c === '=';
  regular.forEach((i, r) => {
    if (r % 10 !== 2 && r % 10 !== 7) return;
    const target = regular[r + 8];
    if (target == null) return;
    const lv = L[i], g = LF.normalize(lv.map).map(row => row.split('')), h = g.length, w = g[0].length;
    const seen = LF.analyze(lv).seen;
    const find = c => { for (let y = 0; y < h; y++) { const x = g[y].indexOf(c); if (x >= 0) return { x, y }; } return null; };
    const P = find('P'), D = find('D');
    if (!P || !D) return;
    let best = null;
    for (let y = 2; y < h - 1; y++) for (let x = 2; x < w - 2; x++) {
      // A reachable standing spot with room for a door (and a tile clear either side).
      if (!seen[y * w + x] || g[y][x] !== '.' || g[y - 1][x] !== '.' || !floor(g[y + 1][x])) continue;
      if (![-1, 1].every(d => g[y][x + d] === '.' && g[y - 1][x + d] === '.')) continue;
      const fromDoor = Math.hypot(x - D.x, y - D.y), fromStart = Math.hypot(x - P.x, y - P.y);
      if (fromDoor < 10 || fromStart < 10) continue;
      const score = fromDoor + fromStart * .6 + (h - y) * 1.5;
      if (!best || score > best.score) best = { x, y, score };
    }
    if (!best) return;
    g[best.y][best.x] = '?';
    lv.map = g.map(row => row.join(''));
    lv.secretTo = target;
  });
})();
