// Builds js/levels-11.js: 150 more story levels (15 chapters of 10) made with the random
// level generator, then dressed with spiked pendulums, TNT carts, shot-door gates and ammo,
// and checked. Deterministic: the same script always writes the same file.
//   node tools/make-levels.js
const fs = require('fs');
const path = require('path');

global.window = global;
const JS = path.join(__dirname, '..', 'js');
for (const f of ['engine', 'gen', 'levels-1', 'levels-2', 'levels-3', 'levels-4', 'levels-5', 'levels-6', 'levels-7', 'levels-8', 'levels-9', 'levels-10']) {
  eval(fs.readFileSync(path.join(JS, f + '.js'), 'utf8'));
}
const LF = window.LF;

const CHAPTERS = [
  'The Tallow Docks', 'The Soot Canals', 'The Wax Market', 'The Ember Gardens', 'The Smoke Stacks',
  'The Ash Barrens', 'The Bell Foundry', 'The Glass Works', 'The Moth Archive', 'The Cinder Mines',
  'The Wick Bridges', 'The Ember Coast', 'The Chimney Peaks', 'The Last Lamps', 'The Dawn Tower',
];
const WORD_A = ['Amber', 'Ashen', 'Brass', 'Candle', 'Cinder', 'Copper', 'Crooked', 'Dim', 'Ember', 'Fading', 'Flint', 'Gilded', 'Glass', 'Gutter', 'Hollow',
  'Iron', 'Lamp-lit', 'Lantern', 'Midnight', 'Moth', 'Oil', 'Pitch', 'Quiet', 'Rust', 'Salt', 'Smoke', 'Soot', 'Tallow', 'Tinder', 'Wick'];
const WORD_B = ['Arcade', 'Bridge', 'Causeway', 'Chimneys', 'Cloister', 'Crossing', 'Cut', 'Descent', 'Ditch', 'Flats', 'Gantry', 'Gate', 'Heights', 'Hollow', 'Ladder',
  'Landing', 'Ledges', 'Loft', 'Mews', 'Passage', 'Reach', 'Ridge', 'Row', 'Run', 'Scaffold', 'Steps', 'Stretch', 'Terrace', 'Tunnels', 'Walk'];

// Same key as the game uses for #KEY links, so we can keep every key unique.
const KEY_ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const levelKey = name => {
  let h = 2166136261;
  for (const ch of name) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  let key = '';
  for (let k = 0; k < 5; k++) { key += KEY_ABC[h % 32]; h = Math.floor(h / 32); }
  return key;
};
const usedNames = new Set(LF.LEVELS.map(l => l.name));
const usedKeys = new Set(LF.LEVELS.map(l => levelKey(l.name)));
// Boss arena names are added later by bosses.js; keep clear of them too.
for (const n of ['The Bell Pit', 'Ram’s Run', 'The Thunder Fold', 'The Last Charge', 'The Soot Nest', 'The Ember Roost', 'Queen’s Chimney', 'The Blackened Sky',
  'Marksman’s Deck', 'The Archery Loft', 'Hollow Range', 'The Final Volley', 'Colossus Yard', 'The Iron Quarry', 'The Anvil Floor', 'Colossus Reborn',
  'The Powder Throne', 'The Fuse Hall', 'The Blasting Court', 'The Last Keg']) { usedNames.add(n); usedKeys.add(levelKey(n)); }

const SHOT = { v: 3, w: 10, z: 25 };
const HARDCORE_GONE = new Set(['L', 'q', 'Q', '$', 'a', 'o', 'b', 'v', 'w', 'z']);
const hardcore = def => {
  const rows = LF.normalize(def.map).map(r => r.split(''));
  rows.forEach((r, y) => r.forEach((c, x) => { if (HARDCORE_GONE.has(c)) r[x] = rows[y - 1]?.[x] === '~' ? '~' : '.'; }));
  return { ...def, map: rows.map(r => r.join('')) };
};

// Places that are standing spots: empty, with ground right below.
function ledgeRuns(g) {
  const h = g.length, w = g[0].length, runs = [];
  for (let y = 1; y < h; y++) {
    let x = 0;
    while (x < w) {
      const top = c => c === '#' || c === '=';
      if (!(top(g[y][x]) && g[y - 1][x] === '.')) { x++; continue; }
      const x0 = x;
      while (x < w && top(g[y][x]) && g[y - 1][x] === '.') x++;
      runs.push({ x0, x1: x - 1, y });
    }
  }
  return runs;
}
const clear = (g, x0, y0, x1, y1) => {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (y < 0 || x < 0 || y >= g.length || x >= g[0].length || g[y][x] !== '.') return false;
  return true;
};
const find = (g, c) => { for (let y = 0; y < g.length; y++) { const x = g[y].indexOf(c); if (x >= 0) return { x, y }; } return null; };

// Small crates along the route and a big one at the most dangerous reachable spot, as
// levels-5.js does for the hand-made levels.
const DANGER = { '^': 3, B: 1, K: 2, F: 1, J: 1, S: 2, G: 3, X: 2, R: 2, Z: 3, Y: 1, U: 1, N: 1, I: 3, '@': 2, e: 3, E: 2 };
function addAmmo(def) {
  const g = def.map.map(r => r.split(''));
  const h = g.length, w = g[0].length;
  const T = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? '#' : g[y][x];
  const seen = LF.analyze(def).seen;
  const tall = h > w, spots = [];
  const FREE = new Set(['.', '#', '=', '~']);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    if (T(x, y) !== '.' || T(x, y - 1) !== '.' || !seen[y * w + x]) continue;
    if (!(T(x, y + 1) === '#' || T(x, y + 1) === '=')) continue;
    let ok = true, danger = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (!FREE.has(T(x + dx, y + dy))) ok = false;
    if (!ok) continue;
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
  def.map = g.map(r => r.join(''));
}

function build(i, attempt) {
  const c = Math.floor(i / 10);
  const R = LF.rng(9001 + i * 7919 + attempt * 104729);
  const roll = R();
  const shape = roll < .65 ? 'right' : roll < .85 ? 'mixed' : 'up';
  const size = shape === 'up' ? 'm' : c >= 5 && R() < .4 ? 'l' : 'm';
  const difficulty = c < 3 ? 3 : c < 7 ? 4 : 5;
  const def = LF.generate({ seed: Math.floor(R() * 1e9), shape, size, difficulty });
  if (def.name === 'Plain Lane') return null;
  const g = def.map.map(r => r.split(''));
  const P = find(g, 'P'), D = find(g, 'D');
  if (!P || !D) return null;
  const away = x => Math.abs(x - P.x) > 5 && Math.abs(x - D.x) > 4;
  const runs = ledgeRuns(g);

  // Spiked (and plain) pendulums over long ledges: the anchor is 4 rows above the floor.
  let pendulums = c === 0 ? 1 : Math.min(4, 2 + Math.floor(R() * (1 + c / 5)));
  for (const run of runs.filter(r => r.x1 - r.x0 >= 4).sort(() => R() - .5)) {
    if (pendulums <= 0) break;
    const x = Math.round((run.x0 + run.x1) / 2), y = run.y - 4;
    if (!away(x) || !clear(g, x - 2, y, x + 2, run.y - 1)) continue;
    g[y][x] = R() < .7 ? 'e' : 'E'; pendulums--;
  }
  // TNT carts on long ledges from chapter III, sometimes with a golem close enough to blow up with it.
  if (c >= 2) {
    let carts = 1 + (R() < c / 15 ? 1 : 0);
    for (const run of runs.filter(r => r.x1 - r.x0 >= 4).sort(() => R() - .5)) {
      if (carts <= 0) break;
      const x = run.x0 + 1, y = run.y - 1;
      if (!away(x) || !clear(g, x, y - 1, x, y)) continue;
      g[y][x] = '@'; carts--;
      const gx = run.x1 - 1;
      if (difficulty >= 4 && R() < .5 && gx - x <= 8 && away(gx) && clear(g, gx, y - 1, gx, y)) g[y][gx] = 'I';
    }
  }
  def.map = g.map(r => r.join(''));

  // Shot-door gate from chapter II: a full-height column just before the door, so the only
  // way to the door is to shoot through it. Stronger doors in later chapters.
  let gate = null;
  if (c >= 1 && shape !== 'up' && R() < .5) {
    gate = c < 5 ? 'v' : c < 10 ? (R() < .5 ? 'w' : 'v') : (R() < .5 ? 'z' : 'w');
    const gx = D.x - 1;
    if (gx <= P.x + 3) return null;
    for (const row of g) row[gx] = gate;
    def.map = g.map(r => r.join(''));
  }
  addAmmo(def);
  if (gate) {
    // Make sure the ammo before the gate covers it, with a little to spare.
    const gg = def.map.map(r => r.split(''));
    const gx = D.x - 1, AMMO = { q: 3, Q: 10, $: 25 };
    let have = 0;
    for (const row of gg) for (let x = 0; x < gx; x++) have += AMMO[row[x]] || 0;
    let need = SHOT[gate] + 3 - have;
    const spots = [];
    for (let x = P.x + 1; x < Math.min(gx, P.x + 6); x++) if (gg[P.y][x] === '.' && gg[P.y + 1] && (gg[P.y + 1][x] === '#' || gg[P.y + 1][x] === '=')) spots.push(x);
    while (need > 0 && spots.length) { const x = spots.shift(); const crate = need > 10 ? '$' : need > 3 ? 'Q' : 'q'; gg[P.y][x] = crate; need -= AMMO[crate]; }
    if (need > 0) return null;
    def.map = gg.map(r => r.join(''));
  }

  // Checks: reachable as built (doors counted as openable), reachable in Hardcore, the
  // gate really blocks the door, and enough lanterns to be worth lighting.
  const a = LF.analyze(def);
  if (!a.ok || a.lanterns < 2) return null;
  if (!LF.analyze(hardcore(def)).ok) return null;
  if (gate && LF.analyze({ ...def, map: def.map.map(r => r.replace(/[vwz]/g, '#')) }).doorOk) return null;

  let name;
  for (let k = 0; ; k++) {
    name = `${WORD_A[Math.floor(R() * WORD_A.length)]} ${WORD_B[Math.floor(R() * WORD_B.length)]}`;
    if (!usedNames.has(name) && !usedKeys.has(levelKey(name))) break;
    if (k > 200) return null;
  }
  usedNames.add(name); usedKeys.add(levelKey(name));
  return { chapter: CHAPTERS[c], name, dark: def.dark, map: def.map };
}

const out = [];
for (let i = 0; i < 150; i++) {
  let lv = null;
  for (let attempt = 0; !lv; attempt++) {
    if (attempt > 400) throw new Error(`level ${i} would not build`);
    lv = build(i, attempt);
  }
  out.push(lv);
}

const body = out.map(lv => `  L.push({ chapter: ${JSON.stringify(lv.chapter)}, name: ${JSON.stringify(lv.name)}, dark: ${lv.dark}, map: [\n${lv.map.map(r => '    ' + JSON.stringify(r) + ',').join('\n')}\n  ] });`).join('\n');
const file = `// Lanternfall: Chapters XIV–XXVIII, 150 levels made by tools/make-levels.js (don't edit
// by hand; change the script and run it again). Built with the random generator, then given
// spiked pendulums, TNT carts, shot-door gates (v, w, z) and ammo, and checked to be
// finishable both normally and in Hardcore.
(() => {
  const L = window.LF.LEVELS;
${body}
})();
`;
fs.writeFileSync(path.join(JS, 'levels-11.js'), file);
const count = (ch) => out.reduce((n, lv) => n + lv.map.join('').split(ch).length - 1, 0);
console.log(`wrote ${out.length} levels · shot doors v ${out.filter(l => l.map.join('').includes('v')).length}, w ${out.filter(l => l.map.join('').includes('w')).length}, z ${out.filter(l => l.map.join('').includes('z')).length} · pendulums ${count('e') + count('E')} · carts ${count('@')} · golems ${count('I')}`);
