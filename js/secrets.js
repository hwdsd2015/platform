// Lanternfall: secret exits. Two levels in each world (but the last) hide a second door (?),
// and leaving by it fires you out of a secret cannon to a faraway world: two worlds on (or
// the last one). lv.secretTo is the index of that world's first level, lv.secretWorld the
// world's index. Load after worlds.js, so the worlds and level indexes are final.
//
// The door goes in a little hidden room behind a false wall (l) that looks just like stone:
// the only way in is to walk into the wall. The room is carved into solid rock beside a spot
// you can reach if there is some, or else built as a small 3x3 block of stone on a ledge (as
// long as the level can still be finished with it there). Failing both, the door goes in the
// most out-of-the-way spot you can reach, unseen until you come near.
(() => {
  const LF = window.LF, L = LF.LEVELS, WORLDS = LF.WORLDS;
  const floor = c => c === '#' || c === '=';

  // Try to hide a secret door in level lv; true if it found a room for it.
  function hideRoom(lv) {
    const g = LF.normalize(lv.map).map(row => row.split('')), h = g.length, w = g[0].length;
    const seen = LF.analyze(lv).seen, P = find(g, 'P'), D = find(g, 'D');
    if (!P || !D) return false;
    let best = null;
    for (let y = 3; y < h - 2; y++) for (let x = 1; x < w - 1; x++) {
      if (!seen[y * w + x] || g[y][x] !== '.' || g[y - 1][x] !== '.' || !floor(g[y + 1][x])) continue;
      for (const d of [-1, 1]) {
        // Rock 3 wide and 4 tall beside the spot: the entrance, the room, and a wall behind.
        const far = x + 3 * d;
        if (far < 1 || far > w - 2) continue;
        let rock = true;
        for (let k = 1; k <= 3 && rock; k++) for (let r = -2; r <= 1; r++) if (g[y + r][x + k * d] !== '#') { rock = false; break; }
        if (!rock) continue;
        const score = Math.hypot(x - P.x, y - P.y) + Math.hypot(x - D.x, y - D.y);
        if (Math.hypot(x - D.x, y - D.y) < 6 || Math.hypot(x - P.x, y - P.y) < 6) continue;
        if (!best || score > best.score) best = { x, y, d, score };
      }
    }
    if (!best) return false;
    const { x, y, d } = best;
    g[y][x + d] = g[y - 1][x + d] = 'l';     // the false wall you walk through
    g[y - 1][x + 2 * d] = 'l'; g[y][x + 2 * d] = '?';   // the room, with the door in it
    lv.map = g.map(row => row.join(''));
    return true;
  }
  // Build a 3x3 block of stone on a ledge with the room inside, facing the spot beside it.
  function buildRoom(lv) {
    const g0 = LF.normalize(lv.map).map(row => row.split('')), h = g0.length, w = g0[0].length;
    const a0 = LF.analyze(lv), seen = a0.seen, P = find(g0, 'P'), D = find(g0, 'D');
    if (!P || !D) return false;
    const spots = [];
    for (let y = 4; y < h - 2; y++) for (let x = 1; x < w - 1; x++) {
      if (!seen[y * w + x] || g0[y][x] !== '.' || g0[y - 1][x] !== '.' || !floor(g0[y + 1][x])) continue;
      for (const d of [-1, 1]) {
        const far = x + 3 * d;
        if (far < 1 || far > w - 2) continue;
        let room = true;
        for (let k = 1; k <= 3 && room; k++) {
          if (!floor(g0[y + 1][x + k * d])) room = false;
          for (let r = -3; r <= 0; r++) if (g0[y + r][x + k * d] !== '.') { room = false; break; }
        }
        if (!room) continue;
        if (Math.hypot(x - D.x, y - D.y) < 6 || Math.hypot(x - P.x, y - P.y) < 6) continue;
        spots.push({ x, y, d, score: Math.hypot(x - P.x, y - P.y) + Math.hypot(x - D.x, y - D.y) });
      }
    }
    spots.sort((a, b) => b.score - a.score);
    for (const { x, y, d } of spots.slice(0, 40)) {
      const g = g0.map(row => row.slice());
      for (let k = 1; k <= 3; k++) g[y - 2][x + k * d] = '#';
      g[y - 1][x + 3 * d] = g[y][x + 3 * d] = '#';
      g[y][x + d] = g[y - 1][x + d] = 'l';
      g[y - 1][x + 2 * d] = 'l'; g[y][x + 2 * d] = '?';
      const tryLv = { ...lv, map: g.map(row => row.join('')) }, a = LF.analyze(tryLv);
      if (!a.ok || a.litOk !== a0.litOk) continue;
      lv.map = tryLv.map;
      return true;
    }
    return false;
  }
  // No rock to hide in: the most out-of-the-way spot you can reach (it stays unseen until
  // you're within 3 tiles of it).
  function farSpot(lv) {
    const g = LF.normalize(lv.map).map(row => row.split('')), h = g.length, w = g[0].length;
    const seen = LF.analyze(lv).seen, P = find(g, 'P'), D = find(g, 'D');
    if (!P || !D) return false;
    let best = null;
    for (let y = 2; y < h - 1; y++) for (let x = 2; x < w - 2; x++) {
      if (!seen[y * w + x] || g[y][x] !== '.' || g[y - 1][x] !== '.' || !floor(g[y + 1][x])) continue;
      if (![-1, 1].every(d => g[y][x + d] === '.' && g[y - 1][x + d] === '.')) continue;
      const fromDoor = Math.hypot(x - D.x, y - D.y), fromStart = Math.hypot(x - P.x, y - P.y);
      if (fromDoor < 10 || fromStart < 10) continue;
      const score = fromDoor + fromStart * .6 + (h - y) * 1.5;
      if (!best || score > best.score) best = { x, y, score };
    }
    if (!best) return false;
    g[best.y][best.x] = '?';
    lv.map = g.map(row => row.join(''));
    return true;
  }
  function find(g, c) { for (let y = 0; y < g.length; y++) { const x = g[y].indexOf(c); if (x >= 0) return { x, y }; } return null; }

  WORLDS.forEach((world, k) => {
    if (k === WORLDS.length - 1) return;
    const to = Math.min(k + 2, WORLDS.length - 1);
    const regular = L.map((lv, i) => i).filter(i => L[i].world === k && !L[i].boss && !L[i].secretTo);
    // Aim for a third and two thirds of the way through the world, taking the nearest level
    // after that with rock to hide a room in (or, failing that, the aimed-for level itself).
    for (const at of [Math.floor(regular.length / 3), Math.floor(regular.length * 2 / 3)]) {
      let placed = false;
      for (let n = at; n < regular.length && !placed; n++) {
        const lv = L[regular[n]];
        if (lv.secretTo == null && (hideRoom(lv) || buildRoom(lv))) { lv.secretTo = WORLDS[to].first; lv.secretWorld = to; placed = true; }
      }
      if (!placed && L[regular[at]].secretTo == null && farSpot(L[regular[at]])) { L[regular[at]].secretTo = WORLDS[to].first; L[regular[at]].secretWorld = to; }
    }
  });
})();
