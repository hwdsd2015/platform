// Lanternfall engine: level parsing, physics, enemies. No DOM.
(() => {
  const LF = window.LF = window.LF || {};
  const TS = LF.TS = 32;
  const G = 2100, MAXFALL = 900, RUN = 250, JUMP = 700, SPRING = 1080;
  const WALL_SLIDE = 110, WALL_KICK = 330, BOOST = 1.22, REGROW = 12, SINK = 55;

  // Per-level player settings, set in the editor's Player dialog (def.player).
  // Most are multipliers on the normal feel; airJumps and ammo are counts.
  LF.PLAYER_TUNE = {
    jump: { label: 'Jump height', min: .5, max: 2.5, step: .05, def: 1 },
    run: { label: 'Run speed', min: .5, max: 2.5, step: .05, def: 1 },
    air: { label: 'Air control', min: .25, max: 2, step: .05, def: 1 },
    gravity: { label: 'Gravity', min: .4, max: 2, step: .05, def: 1, note: 'lower = floatier; jump height stays the same' },
    wallKick: { label: 'Wall jump distance', min: 0, max: 2.5, step: .05, def: 1 },
    wallJump: { label: 'Wall jump height', min: .3, max: 2, step: .05, def: 1 },
    wallSlide: { label: 'Wall slide speed', min: .2, max: 3, step: .05, def: 1 },
    airJumps: { label: 'Extra mid-air jumps', min: 0, max: 3, step: 1, def: 0, count: true },
    ammo: { label: 'Starting ammo', min: 0, max: 30, step: 1, def: 0, count: true },
  };
  const playerTune = LF.playerTune = def => {
    const t = {};
    for (const [k, s] of Object.entries(LF.PLAYER_TUNE)) t[k] = def && def.player && def.player[k] != null ? def.player[k] : s.def;
    return t;
  };
  // Every enemy runs this much faster than its base numbers (movement, timers, attacks).
  const ENEMY_SPEED = LF.ENEMY_SPEED = 1.35;
  // Special shots: X fires an explosive round, Q lobs a bouncing grenade. Both use shared ammo.
  const SPECIAL = LF.SPECIAL = {
    rocket: { cost: 2, name: 'explosive round' },
    grenade: { cost: 3, name: 'grenade' },
  };
  const BLINK = LF.BLINK = 2, CONVEY = 110, BULLET = 620, AMMO = { q: 3, Q: 10, $: 25 };
  const TAU = Math.PI * 2;

  // Fruit: touch to gain a power. Picked fruit grows back after REGROW seconds.
  LF.FRUITS = {
    a: { name: 'Apple', power: 'Shield', color: '#E5484D', note: 'shield: blocks one hit' },
    o: { name: 'Orange', power: 'Jump boost', color: '#FF9A2E', dur: 12, note: 'higher jumps for 12s' },
    b: { name: 'Banana', power: 'Double jump', color: '#FFE066', dur: 15, note: 'jump again in mid-air for 15s' },
  };

  // drop: ammo an enemy leaves behind when you kill it — the harder it is to kill, the more.
  LF.ENEMIES = {
    B: { name: 'Wick-beetle', w: 24, h: 16, stomp: true, drop: 1, note: 'walks, turns at edges' },
    K: { name: 'Thornback', w: 26, h: 18, stomp: false, drop: 2, note: 'fast walker, spiky — jump over' },
    F: { name: 'Soot bat', w: 24, h: 14, stomp: true, drop: 1, note: 'flies back and forth' },
    J: { name: 'Puddle frog', w: 22, h: 18, stomp: true, drop: 1, note: 'hops toward you' },
    S: { name: 'Ember pot', w: 24, h: 22, stomp: true, drop: 2, note: 'spits embers' },
    G: { name: 'Wraith', w: 24, h: 28, stomp: false, drop: 3, note: 'drifts toward you, fears lit lanterns' },
    X: { name: 'Wick spider', w: 20, h: 16, stomp: true, drop: 1, note: 'hangs from a ceiling, drops when you pass below' },
    R: { name: 'Coal ram', w: 26, h: 20, stomp: true, drop: 2, note: 'walks, then charges when it sees you' },
    Z: { name: 'Spark', w: 14, h: 14, stomp: false, drop: 3, note: 'circles its spot — time your way past' },
    Y: { name: 'Lantern pike', w: 28, h: 12, stomp: false, drop: 2, note: 'place in water: swims back and forth' },
    U: { name: 'Glow jelly', w: 20, h: 20, stomp: false, drop: 2, note: 'place in water: bobs slowly up and down' },
    W: { name: 'Wasp', w: 22, h: 16, stomp: true, drop: 2, note: 'hovers, then dashes straight at you' },
    A: { name: 'Ash archer', w: 22, h: 26, stomp: true, drop: 2, note: 'shoots aimed arrows' },
    I: { name: 'Iron golem', w: 30, h: 34, stomp: false, hp: 3, drop: 5, note: 'slow, armored: takes 3 shots' },
    '*': { name: 'Lava bubble', w: 16, h: 16, stomp: false, drop: 3, note: 'place in lava: hides, then shoots up out of it every few seconds' },
    N: { name: 'Leaping gar', w: 24, h: 12, stomp: true, drop: 2, note: 'place in water: leaps out at you' },
  };
  // Enemies that live in water: their map cell stays water.
  LF.SWIMMERS = { Y: 1, U: 1, N: 1 };

  LF.rng = seed => () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };

  // T and H are blink blocks (lowercase while switched off); < and > are conveyor belts.
  // i is ice: solid but slippery. 1, 2, 3 are locked doors opened by keys r, u, y.
  const isSolid = LF.isSolid = c => c === '#' || c === 'C' || c === 'O' || c === 'T' || c === 'H' || c === '<' || c === '>' || c === 'i' || c === '1' || c === '2' || c === '3';
  LF.KEYS = {
    r: { name: 'Red key', gate: '1', color: '#FF6B3D', dim: '#7A2E1C' },
    u: { name: 'Blue key', gate: '2', color: '#7FB0E0', dim: '#2E4E82' },
    y: { name: 'Gold key', gate: '3', color: '#FFD447', dim: '#7A5A12' },
  };
  LF.GATES = { 1: 'r', 2: 'u', 3: 'y' };
  const isFloor = LF.isFloor = c => isSolid(c) || c === '=';
  const blocksPlat = c => isSolid(c) || c === '|' || c === '^' || c === '=';

  function tile(W, tx, ty) {
    if (tx < 0 || tx >= W.w) return '#';
    if (ty < 0 || ty >= W.h) return ' ';
    return W.tiles[ty][tx];
  }
  LF.tile = tile;

  LF.normalize = rows => {
    const w = Math.max(1, ...rows.map(r => r.length));
    return rows.map(r => r.padEnd(w, '.'));
  };

  LF.createWorld = function (def) {
    const rows = LF.normalize(def.map);
    const h = rows.length, w = rows[0].length;
    const tiles = rows.map(r => r.split('').map(c => (c === '.' ? ' ' : c)));
    const W = {
      def, name: def.name || 'Untitled', dark: def.dark ?? .6, w, h, tiles,
      lanterns: [], fruits: [], ammo: [], blinks: [], bullets: [], traps: [], rings: [], ghosts: [], keys: [], unlocking: [], freeze: 0, enemies: [], plats: [], projectiles: [], particles: [], floaters: [], crumbles: [],
      door: null, start: { tx: 1, ty: h - 2 }, clock: 0, time: 0, falls: 0, shake: 0,
      deadTimer: 0, cleared: false, events: [],
    };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const c = tiles[y][x];
      if (c === 'P') { W.start = { tx: x, ty: y }; tiles[y][x] = ' '; }
      else if (c === 'L') { W.lanterns.push({ tx: x, ty: y, x: x * TS + 16, y: y * TS + 14, lit: false, f: (x * 7 + y * 3) % 9, pop: 0 }); tiles[y][x] = ' '; }
      else if (LF.KEYS[c]) { W.keys.push({ c, tx: x, ty: y, x: x * TS + 16, y: y * TS + 16, taken: false }); tiles[y][x] = ' '; }
      // & starts a horde chasing right from this column; % one rising from this row.
      else if (c === '&') { W.horde = { c, up: false, f: x * TS, ox: x * TS, oy: y * TS, growl: 0, wait: HORDE_WAIT }; tiles[y][x] = ' '; }
      else if (c === '%') { W.horde = { c, up: true, f: -y * TS, ox: x * TS, oy: y * TS, growl: 0, wait: HORDE_WAIT }; tiles[y][x] = ' '; }
      // E is a pendulum (only the ball hurts); e is a spiked pendulum whose thorny chain hurts too.
      else if (c === 'E' || c === 'e') { W.traps.push({ type: 'pend', spiked: c === 'e', ax: x * TS + 16, ay: y * TS + 2, len: TS * 3.5, amp: 1.1, per: 2.8, ph: (x * 1.3) % TAU, a: 0 }); tiles[y][x] = ' '; }
      else if (c === 'f') { W.traps.push({ type: 'bar', cx: x * TS + 16, cy: y * TS + 16, n: 5, a: (x + y) * .7, spin: (x + y) % 2 ? 1.7 : -1.7 }); tiles[y][x] = '#'; }
      else if (c === 'k') { W.traps.push({ type: 'crush', x: x * TS + 1, y: y * TS + 1, ox: x * TS + 1, oy: y * TS + 1, w: 30, h: 30, state: 'idle', vy: 0, wait: 0 }); tiles[y][x] = ' '; }
      // q ammo, Q big ammo, $ huge ammo.
      else if (AMMO[c]) { W.ammo.push({ big: c !== 'q', huge: c === '$', n: AMMO[c], tx: x, ty: y, x: x * TS + 16, y: y * TS + 20, taken: false }); tiles[y][x] = ' '; }
      else if (c === 'T' || c === 'H') { W.blinks.push({ tx: x, ty: y, c, wait: false }); if (c === 'H') tiles[y][x] = 'h'; }
      else if (LF.FRUITS[c]) { W.fruits.push({ type: c, tx: x, ty: y, x: x * TS + 16, y: y * TS + 18, taken: false, regrow: 0, pop: 0 }); tiles[y][x] = ' '; }
      else if (c === 'D') { W.door = { tx: x, ty: y, x: x * TS, y: (y - 1) * TS + 4, w: 32, h: 60, open: false, glow: 0 }; tiles[y][x] = ' '; }
      else if (c === 'M' || c === 'V') {
        W.plats.push({ axis: c === 'M' ? 'x' : 'y', x: x * TS, y: y * TS, ox: x * TS, oy: y * TS, w: TS * 2, h: 12, v: 70, dir: 1, dx: 0, dy: 0, prevY: y * TS });
        tiles[y][x] = ' ';
      } else if (c === 'd') {
        // Falling shingle: shakes when stood on, drops, then grows back.
        W.plats.push({ kind: 'fall', state: 'idle', t: 0, vy: 0, x: x * TS, y: y * TS, ox: x * TS, oy: y * TS, w: TS, h: 12, dx: 0, dy: 0, prevY: y * TS });
        tiles[y][x] = ' ';
      } else if (LF.ENEMIES[c]) { W.enemies.push(makeEnemy(c, x, y, def.tuning)); tiles[y][x] = LF.SWIMMERS[c] ? '~' : c === '*' ? '!' : ' '; }
    }
    // Markers placed underwater (start, lanterns, fruit…) leave water behind, not an air pocket.
    for (let y = 1; y < h; y++) for (let x = 0; x < w; x++) {
      if (tiles[y][x] === ' ' && (tiles[y - 1][x] === '~' || tiles[y - 1][x] === '!') && rows[y][x] !== '.') tiles[y][x] = tiles[y - 1][x];
    }
    // Lava surface tiles: they glow and throw off embers.
    W.lavaTop = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (tiles[y][x] === '!' && (y === 0 || tiles[y - 1][x] !== '!')) W.lavaTop.push({ tx: x, ty: y });
    // Every lava pool gets lava bubbles, spread evenly and centered along each stretch of
    // surface: one per ~7 tiles, only where there's room above to jump.
    const runs = [];
    for (const l of W.lavaTop) {
      const last = runs[runs.length - 1];
      if (last && last.ty === l.ty && last.x1 === l.tx - 1) last.x1 = l.tx; else runs.push({ ty: l.ty, x0: l.tx, x1: l.tx });
    }
    for (const r of runs) {
      const n = r.x1 - r.x0 + 1, count = Math.max(1, Math.round(n / 7));
      for (let k = 0; k < count; k++) {
        const tx = r.x0 + Math.floor((k + .5) * n / count);
        if (W.enemies.some(e => e.type === '*' && Math.abs(e.ox / TS - tx) < 3)) continue;
        let room = true;
        for (let j = 1; j <= 3; j++) if (isSolid(tile(W, tx, r.ty - j))) room = false;
        if (room) W.enemies.push(makeEnemy('*', tx, r.ty, def.tuning));
      }
    }
    for (const e of W.enemies) if (e.type === '*') e.wait = 1 + Math.floor(e.ox / TS) % 4 * .5;
    // Jellies bob only within their water: find the surface above and the bottom below.
    for (const e of W.enemies) {
      if (e.type !== 'U') continue;
      const tx = Math.floor((e.x + e.w / 2) / TS);
      let top = Math.floor((e.y + e.h / 2) / TS), bot = top;
      while (top > 0 && tiles[top - 1][tx] === '~') top--;
      while (bot < h - 1 && tiles[bot + 1][tx] === '~') bot++;
      e.minY = top * TS + 10; e.maxY = Math.max(e.minY, (bot + 1) * TS - e.h);
    }
    W.total = W.lanterns.length;
    if (W.door && !W.total) W.door.open = true;
    W.checkpoint = { ...W.start };
    W.blinkT = 0; W.blinkOn = 'T';
    W.player = makePlayer(W.start);
    W.player.ammo = playerTune(def).ammo;
    // def.noSpawnInv (Hardcore): no invincible second at the start or after respawning.
    if (def.noSpawnInv) W.player.inv = 0;
    // The horde begins HORDE_BACK behind the start, the same distance it falls back to after a death.
    if (W.horde) W.horde.f = playerAlong(W.horde, W.player) - HORDE_BACK;
    W.emit = (type, data) => W.events.push({ type, data });
    return W;
  };

  // A level can resize and speed up or slow down each enemy type (set in the editor):
  // def.tuning = { B: { size: 1.5, speed: 2 }, ... }.
  const tune = LF.tune = (tuning, type) => ({ size: 1, speed: 1, ...(tuning || {})[type] });

  function makeEnemy(type, tx, ty, tuning) {
    const s = LF.ENEMIES[type];
    let x = tx * TS + (TS - s.w) / 2;
    let y = (ty + 1) * TS - s.h;
    if (type === 'F') y = ty * TS + 9;
    if (type === 'G') y = ty * TS + 2;
    if (type === 'X') y = ty * TS + 2;
    if (type === 'Z' || LF.SWIMMERS[type]) y = ty * TS + (TS - s.h) / 2;
    if (type === '*') y = ty * TS + 12;
    if (type === 'W') y = ty * TS + 8;
    const vx = { B: -48, K: -72, F: -64, R: -40, Y: -85, I: -30 }[type] || 0;
    // Resize around the spot the enemy is anchored to: its top if it hangs from a ceiling,
    // its middle if it flies or swims, otherwise its feet.
    const scale = tune(tuning, type).size;
    let w = s.w, h = s.h;
    if (scale !== 1) {
      const cx = x + w / 2, anchor = type === 'X' ? 0 : 'FWZGYUN'.includes(type) ? .5 : 1, ay = y + h * anchor;
      w = s.w * scale; h = s.h * scale; x = cx - w / 2; y = ay - h * anchor;
    }
    return { scale, hp: s.hp || 1, hurt: 0, type, x, y, w, h, ox: x, oy: y, vx, vy: 0, alive: true, dead: 0, t: (tx * 13 + ty * 5) % 7 * .3, face: -1, cool: 1.2, wait: .8, ground: false, fade: 0, state: 'idle' };
  }

  function makePlayer(cp) {
    const w = 18, h = 26;
    return {
      x: cp.tx * TS + (TS - w) / 2, y: (cp.ty + 1) * TS - h, w, h,
      vx: 0, vy: 0, face: 1, onGround: false, onPlat: null, ammo: 0, keys: {},
      coyote: 0, buffer: 0, jumping: false, drop: 0, sx: 1, sy: 1, anim: 0, dead: false,
      wall: 0, wallDir: 0, wallCoyote: 0, sliding: false, lock: 0, wet: false,
      // One second of invincibility at the start of a level and after every respawn.
      shield: false, boost: 0, dbl: 0, airJumps: 0, inv: 1, conv: 0, cool: 0, flash: 0,
    };
  }

  // ---------- collision ----------
  function moveX(W, e, dx) {
    if (!dx) return false;
    e.x += dx;
    const top = Math.floor(e.y / TS), bot = Math.floor((e.y + e.h - .01) / TS);
    if (dx > 0) {
      const tx = Math.floor((e.x + e.w - .001) / TS);
      for (let ty = top; ty <= bot; ty++) if (isSolid(tile(W, tx, ty))) { e.x = tx * TS - e.w; return true; }
    } else {
      const tx = Math.floor(e.x / TS);
      for (let ty = top; ty <= bot; ty++) if (isSolid(tile(W, tx, ty))) { e.x = (tx + 1) * TS; return true; }
    }
    return false;
  }

  function moveY(W, e, dy, dropping) {
    const prevBottom = e.y + e.h;
    e.y += dy;
    const l = Math.floor(e.x / TS), r = Math.floor((e.x + e.w - .01) / TS);
    if (dy > 0) {
      const ty = Math.floor((e.y + e.h) / TS);
      let hit = null;
      for (let tx = l; tx <= r; tx++) {
        const c = tile(W, tx, ty);
        if (isSolid(c) || (c === '=' && !dropping && prevBottom <= ty * TS + .01)) {
          hit = hit || { dir: 'down', under: [] };
          hit.under.push({ tx, ty, c });
        }
      }
      if (hit) e.y = ty * TS - e.h;
      return hit;
    } else if (dy < 0) {
      const ty = Math.floor(e.y / TS);
      for (let tx = l; tx <= r; tx++) if (isSolid(tile(W, tx, ty))) { e.y = (ty + 1) * TS; return { dir: 'up' }; }
    }
    return null;
  }

  const approach = (v, t, a) => v < t ? Math.min(v + a, t) : Math.max(v - a, t);
  const overlap = LF.overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  LF.flamePos = p => ({ x: p.x + p.w / 2 + p.face * 12, y: p.y - 7 });
  LF.gunPos = p => ({ x: p.x + p.w / 2 + p.face * 14, y: p.y + p.h - 13 });

  const WARM = ['#FFB547', '#FF6B3D', '#FFE2A8'];
  LF.WARM = WARM;
  function burst(W, x, y, n, colors, speed = 180, grav = 400, size = 3) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, s = speed * (.3 + Math.random() * .7);
      const life = .4 + Math.random() * .5;
      W.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - speed * .3, life, max: life, c: colors[i % colors.length], size: size * (.6 + Math.random() * .7), g: grav });
    }
    if (W.particles.length > 600) W.particles.splice(0, W.particles.length - 600);
  }

  // Water only drowns enemies; the player swims (see inWater). Lava (!) kills anything.
  const lavaAt = (W, p) => {
    const x0 = Math.floor((p.x + 3) / TS), x1 = Math.floor((p.x + p.w - 3) / TS);
    const y0 = Math.floor((p.y + 4) / TS), y1 = Math.floor((p.y + p.h - 1) / TS);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      if (tile(W, tx, ty) === '!' && (tile(W, tx, ty - 1) === '!' || p.y + p.h > ty * TS + 10)) return true;
    }
    return false;
  };
  function hazardHit(W, p, swims = false) {
    if (lavaAt(W, p)) return true;
    const x0 = Math.floor((p.x + 3) / TS), x1 = Math.floor((p.x + p.w - 3) / TS);
    const y0 = Math.floor((p.y + 4) / TS), y1 = Math.floor((p.y + p.h - 1) / TS);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      const c = tile(W, tx, ty);
      if (c === '^' && p.y + p.h > ty * TS + 14) return true;
      if (c === '~' && !swims && p.y + p.h > ty * TS + 10) return true;
    }
    return p.y > W.h * TS + 60;
  }

  function kill(W) {
    const p = W.player;
    if (p.dead || W.cleared) return;
    p.dead = true; W.deadTimer = .85; W.falls++;
    burst(W, p.x + p.w / 2, p.y + p.h / 2, 26, ['#FF6B3D', '#FFB547', '#D9D0F0'], 240, 500);
    W.shake = .35; W.freeze = .07; ring(W, p.x + p.w / 2, p.y + p.h / 2, 40, '255,107,61', .4); W.emit('die');
  }

  LF.kill = kill;

  // A hit: the apple shield soaks it (with a short grace period), otherwise the player dies.
  function hurt(W) {
    const p = W.player;
    if (p.dead || p.inv > 0) return;
    if (!p.shield) return kill(W);
    p.shield = false; p.inv = 1.2; p.vy = -520; p.jumping = false;
    burst(W, p.x + p.w / 2, p.y + p.h / 2, 20, ['#9FD8FF', '#D9D0F0'], 200, 300);
    W.floaters.push({ x: p.x + p.w / 2, y: p.y - 8, t: 'shield broke', life: 1, c: '#9FD8FF' });
    W.shake = .15; W.freeze = .06; ring(W, p.x + p.w / 2, p.y + p.h / 2, 46, '159,216,255', .45); W.emit('shield');
  }

  function respawn(W) {
    const { ammo, keys } = W.player;
    Object.assign(W.player, makePlayer(W.checkpoint), { ammo, keys });
    if (W.def.noSpawnInv) W.player.inv = 0;
    W.projectiles = [];
    for (const e of W.enemies) {
      if (e.type === 'G') { e.x = e.ox; e.y = e.oy; e.vx = e.vy = 0; }
      if (e.type === 'X') { e.y = e.oy; e.state = 'idle'; }
      if (e.type === 'R' && e.state !== 'idle') { e.state = 'idle'; e.vx = 40 * (e.face || -1); }
      if (e.type === 'N') { e.x = e.ox; e.y = e.oy; e.state = 'idle'; e.wait = 1.8; }
      if (e.type === 'W') { e.x = e.ox; e.y = e.oy; e.state = 'idle'; e.cool = 1.2; }
    }
    burst(W, W.player.x + 9, W.player.y + 26, 12, ['#D9D0F0', '#FFB547'], 90, -60, 2);
    // After a death the horde falls back so the respawn is fair.
    if (W.horde) { W.horde.f = playerAlong(W.horde, W.player) - HORDE_BACK; W.horde.wait = HORDE_WAIT; }
    W.emit('respawn');
  }

  // ---------- step ----------
  LF.step = function (W, input, dt, playing = true) {
    // Hit-freeze: a few frames of stillness make stomps and kills land harder.
    if (W.freeze > 0) { W.freeze -= dt; return; }
    W.clock += dt;
    stepPlats(W, dt);
    stepCrumbles(W, dt);
    for (const e of W.enemies) {
      if (!e.alive) { e.dead += dt; continue; }
      stepEnemy(W, e, dt * ENEMY_SPEED * tune(W.def.tuning, e.type).speed, playing);
    }
    stepProjectiles(W, dt, playing);
    stepBlinks(W, dt);
    stepBullets(W, dt);
    stepDrops(W, dt);
    stepTraps(W, dt, playing);
    if (W.lavaTop.length && Math.random() < dt * Math.min(40, W.lavaTop.length * .6)) {
      const l = W.lavaTop[Math.floor(Math.random() * W.lavaTop.length)];
      W.particles.push({ x: l.tx * TS + Math.random() * TS, y: l.ty * TS + 8, vx: (Math.random() - .5) * 30, vy: -60 - Math.random() * 90, life: .9, max: .9, c: LF.WARM[Math.floor(Math.random() * 3)], size: 2 + Math.random() * 2, g: 60 });
    }
    stepUnlocking(W, dt);
    stepHorde(W, dt, playing);
    for (const r of W.rings) { r.life -= dt; r.r += (r.max - r.r) * Math.min(1, dt * 10); }
    W.rings = W.rings.filter(r => r.life > 0);
    for (const g of W.ghosts) g.life -= dt;
    W.ghosts = W.ghosts.filter(g => g.life > 0);
    for (const l of W.lanterns) l.pop = Math.max(0, l.pop - dt * 2.5);
    for (const f of W.fruits) {
      f.pop = Math.max(0, f.pop - dt * 2.5);
      if (f.taken && (f.regrow -= dt) <= 0) { f.taken = false; f.pop = 1; }
    }
    if (W.door) W.door.glow = approach(W.door.glow, W.door.open ? 1 : 0, dt * 1.5);

    const p = W.player;
    if (playing && !W.cleared) {
      W.time += dt;
      if (p.dead) { W.deadTimer -= dt; if (W.deadTimer <= 0) respawn(W); }
      else stepPlayer(W, p, input, dt);
    }
    for (const q of W.particles) { q.vy += q.g * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.life -= dt; }
    W.particles = W.particles.filter(q => q.life > 0);
    for (const f of W.floaters) { f.y -= 28 * dt; f.life -= dt; }
    W.floaters = W.floaters.filter(f => f.life > 0);
    W.shake = Math.max(0, W.shake - dt);
  };

  function stepPlats(W, dt) {
    for (const pl of W.plats) {
      pl.prevY = pl.y; pl.dx = 0; pl.dy = 0;
      if (pl.kind === 'fall') { stepShingle(W, pl, dt); continue; }
      const sp = pl.v * dt * pl.dir;
      if (pl.axis === 'x') {
        const nx = pl.x + sp;
        const col = Math.floor((sp > 0 ? nx + pl.w - .01 : nx) / TS), row = Math.floor((pl.y + 6) / TS);
        if (blocksPlat(tile(W, col, row)) || nx < 0 || nx + pl.w > W.w * TS) pl.dir *= -1;
        else { pl.dx = nx - pl.x; pl.x = nx; }
      } else {
        const ny = pl.y + sp;
        const row = Math.floor((sp > 0 ? ny + pl.h : ny) / TS);
        const c0 = tile(W, Math.floor(pl.x / TS), row), c1 = tile(W, Math.floor((pl.x + pl.w - 1) / TS), row);
        if (blocksPlat(c0) || blocksPlat(c1) || ny < 0 || ny + pl.h > W.h * TS) pl.dir *= -1;
        else { pl.dy = ny - pl.y; pl.y = ny; }
      }
    }
  }

  // Blink blocks: every BLINK seconds the T set and the H set swap between solid and empty.
  // A block never switches on inside the player; it waits until they step out.
  function stepBlinks(W, dt) {
    if (!W.blinks.length) return;
    W.blinkT += dt;
    if (W.blinkT >= BLINK) { W.blinkT -= BLINK; W.blinkOn = W.blinkOn === 'T' ? 'H' : 'T'; for (const b of W.blinks) b.wait = true; W.emit('blink'); }
    const p = W.player;
    for (const b of W.blinks) {
      if (!b.wait) continue;
      const on = b.c === W.blinkOn;
      if (on && !p.dead && overlap(p, { x: b.tx * TS, y: b.ty * TS, w: TS, h: TS })) continue;
      W.tiles[b.ty][b.tx] = on ? b.c : b.c.toLowerCase(); b.wait = false;
    }
  }

  // An explosion kills every enemy within `r` (golems included; the horde is immune) and
  // any embers or arrows in range.
  function explode(W, x, y, r, big) {
    for (const e of W.enemies) {
      if (!e.alive || Math.hypot(e.x + e.w / 2 - x, e.y + e.h / 2 - y) > r + Math.max(e.w, e.h) / 2) continue;
      e.alive = false; dropAmmo(W, e);
      burst(W, e.x + e.w / 2, e.y + e.h / 2, 14, ['#FFE2A8', '#FF6B3D', '#463C6B'], 180, 400);
      W.floaters.push({ x: e.x + e.w / 2, y: e.y - 6, t: 'boom', life: .8, c: '#FFB547' });
      W.emit('zap', { type: e.type });
    }
    for (const q of W.projectiles) if (Math.hypot(q.x + q.w / 2 - x, q.y + q.h / 2 - y) < r) q.life = 0;
    burst(W, x, y, big ? 40 : 22, ['#FFF1CF', '#FFB547', '#FF6B3D', '#463C6B'], big ? 320 : 220, 300, big ? 4 : 3);
    ring(W, x, y, r, '255,181,71', big ? .5 : .35);
    ring(W, x, y, r * .55, '255,241,207', .25);
    W.shake = Math.max(W.shake, big ? .3 : .15); W.freeze = Math.max(W.freeze, big ? .06 : .03);
    W.emit(big ? 'boom' : 'pop');
  }

  function stepSpecial(W, b, dt) {
    b.life -= dt;
    const inHorde = () => W.horde && along(W.horde, b.x, b.y) < W.horde.f;
    if (b.kind === 'rocket') {
      b.x += b.vx * dt;
      if (Math.random() < .6) W.particles.push({ x: b.x - Math.sign(b.vx) * 6, y: b.y, vx: -b.vx * .15, vy: (Math.random() - .5) * 30, life: .3, max: .3, c: LF.WARM[Math.floor(Math.random() * 3)], size: 2.5, g: 0 });
      if (inHorde()) { b.life = 0; return; }
      const hitWall = isSolid(tile(W, Math.floor(b.x / TS), Math.floor(b.y / TS)));
      const hitEnemy = W.enemies.some(e => e.alive && overlap({ x: b.x - 5 * b.s, y: b.y - 3 * b.s, w: 10 * b.s, h: 6 * b.s }, e));
      if (hitWall || hitEnemy || b.life <= 0) { b.life = 0; explode(W, b.x - Math.sign(b.vx) * (hitWall ? 6 : 0), b.y, TS * 3 * b.s, true); }
      return;
    }
    // Grenade: falls and bounces; every contact counts. The first two blast 2 blocks,
    // the third explodes on impact with the big 3-block blast (the fuse is just a backstop).
    // It bounces off anything: blocks and spikes from any side; the tops of water, lava,
    // planks, lifts, shingles and crushers when coming down on them; and enemies.
    b.vy = Math.min(MAXFALL, b.vy + G * .8 * dt);
    let bounced = false;
    const wall = c => isSolid(c) || c === '^';
    const surface = c => wall(c) || c === '~' || c === '!' || c === '=';
    const nx = b.x + b.vx * dt;
    if (wall(tile(W, Math.floor(nx / TS), Math.floor(b.y / TS)))) { b.vx *= -.6; bounced = true; }
    else b.x = nx;
    const ny = b.y + b.vy * dt, row = Math.floor(ny / TS), c = tile(W, Math.floor(b.x / TS), row);
    const topHit = b.vy > 0 && Math.floor(b.y / TS) < row && surface(c);
    const onPlat = b.vy > 0 && [...W.plats.filter(pl => pl.state !== 'gone'), ...W.traps.filter(t => t.type === 'crush')]
      .some(pl => b.x > pl.x && b.x < pl.x + pl.w && b.y <= pl.y + 1 && ny >= pl.y);
    if ((b.vy < 0 && wall(c)) || (b.vy > 0 && wall(c)) || topHit || onPlat) {
      b.vy *= -.55; b.vx *= .8; bounced = true;
    } else b.y = ny;
    const foe = W.enemies.find(e => e.alive && overlap({ x: b.x - 5 * b.s, y: b.y - 5 * b.s, w: 10 * b.s, h: 10 * b.s }, e));
    if (foe && !b.lastFoe) { b.vx = -b.vx * .7; b.vy = -Math.max(220, Math.abs(b.vy) * .6); bounced = true; }
    b.lastFoe = foe;
    if (inHorde()) { b.life = 0; return; }
    if (bounced) {
      b.bounces++;
      if (b.bounces >= 3) { b.life = 0; return explode(W, b.x, b.y, TS * 3 * b.s, true); }
      explode(W, b.x, b.y, TS * 2 * b.s, false);
    }
    if (b.life <= 0 || b.y > W.h * TS + 40) { b.life = 0; if (b.y <= W.h * TS + 40) explode(W, b.x, b.y, TS * 3 * b.s, true); }
  }

  // Killing an enemy (shot, blown up or stomped) drops a crate worth its drop value, which
  // falls to the ground. Hardcore has no ammo, so nothing drops there.
  function dropAmmo(W, e) {
    const n = LF.ENEMIES[e.type].drop;
    if (!n || W.def.noSpawnInv) return;
    const x = e.x + e.w / 2, y = e.y + e.h / 2, toward = Math.sign(W.player.x + W.player.w / 2 - x) || 1;
    W.ammo.push({ big: n >= 5, drop: true, n, tx: Math.floor(x / TS), ty: Math.floor(y / TS), x, y, vx: toward * 110, vy: -380, falling: true, taken: false });
  }
  // Dropped crates pop out toward the player and fall until they land; lava burns them up.
  function stepDrops(W, dt) {
    for (const a of W.ammo) {
      if (!a.falling || a.taken) continue;
      a.vy = Math.min(MAXFALL, a.vy + G * dt);
      const nx = a.x + a.vx * dt;
      if (isSolid(tile(W, Math.floor((nx + Math.sign(a.vx) * 8) / TS), Math.floor(a.y / TS)))) a.vx = 0; else a.x = nx;
      const ny = a.y + a.vy * dt, tx = Math.floor(a.x / TS), row = Math.floor((ny + 12) / TS), c = tile(W, tx, row);
      if (a.vy > 0 && (isSolid(c) || c === '^' || c === '=' || c === '~' || c === '!') && !isSolid(tile(W, tx, Math.floor((a.y + 12) / TS)))) {
        if (c === '!') { a.taken = true; burst(W, a.x, a.y, 8, ['#FF6B3D', '#FFB547'], 80, 200, 2); continue; }
        a.y = row * TS - 12; a.ty = Math.floor(a.y / TS); a.falling = false;
      } else if (ny > W.h * TS + 40) a.taken = true;
      else a.y = ny;
    }
  }

  // One bullet hit on an enemy: armored ones lose a point of armor, the rest die.
  function shootEnemy(W, e, dir) {
    if (e.hp > 1) {
      e.hp--; e.hurt = .15; e.x += dir * 5;
      burst(W, e.x + e.w / 2, e.y + e.h / 2, 8, ['#CFC6E8', '#FFE2A8'], 120, 300, 2); W.emit('clank');
      return;
    }
    e.alive = false; dropAmmo(W, e);
    burst(W, e.x + e.w / 2, e.y + e.h / 2, 16, ['#FFE2A8', '#FF6B3D', '#463C6B'], 180, 400);
    W.floaters.push({ x: e.x + e.w / 2, y: e.y - 6, t: 'zap', life: .8, c: '#FFE2A8' });
    W.shake = Math.max(W.shake, .1); W.freeze = .04; ring(W, e.x + e.w / 2, e.y + e.h / 2, 30, '255,226,168'); W.emit('zap', { type: e.type });
  }
  // Regular bullets splash: every other enemy within a block of where it hit takes a hit too
  // (two blocks for a big Shift shot).
  function splash(W, x, y, dir, except, s = 1) {
    ring(W, x, y, TS * s, '255,226,168', .2);
    for (const e of W.enemies) if (e.alive && e !== except && circleHits(x, y, TS * s, e)) shootEnemy(W, e, dir);
  }

  function stepBullets(W, dt) {
    for (const b of W.bullets) {
      if (b.kind) { stepSpecial(W, b, dt); continue; }
      b.x += b.vx * dt; b.life -= dt;
      if (isSolid(tile(W, Math.floor(b.x / TS), Math.floor(b.y / TS)))) { b.life = 0; burst(W, b.x, b.y, 5, ['#FFE2A8', '#FFB547'], 80, 200, 2); splash(W, b.x - Math.sign(b.vx) * 4, b.y, Math.sign(b.vx), null, b.s); continue; }
      // Bullets just vanish into the horde.
      if (W.horde && along(W.horde, b.x, b.y) < W.horde.f) { b.life = 0; burst(W, b.x, b.y, 4, ['#463C6B'], 60, 0, 2); continue; }
      for (const e of W.enemies) {
        if (!e.alive || !overlap({ x: b.x - 4 * b.s, y: b.y - 2 * b.s, w: 8 * b.s, h: 4 * b.s }, e)) continue;
        b.life = 0;
        shootEnemy(W, e, Math.sign(b.vx));
        splash(W, e.x + e.w / 2, e.y + e.h / 2, Math.sign(b.vx), e, b.s);
        break;
      }
      for (const q of W.projectiles) if (b.life > 0 && Math.abs(q.x + q.w / 2 - b.x) < q.w / 2 + 4 * b.s && Math.abs(q.y + q.h / 2 - b.y) < q.h / 2 + 2 * b.s + 2) { q.life = 0; b.life = 0; burst(W, b.x, b.y, 8, LF.WARM, 100, 200, 2); }
    }
    W.bullets = W.bullets.filter(b => b.life > 0);
  }

  // ---------- effects ----------
  const ring = (W, x, y, max, c, life = .35) => W.rings.push({ x, y, r: 2, max, c, life, total: life });
  // Leave a fading copy of the player every few frames while `trail` lasts.
  function trail(W, p, dt, c) {
    p.trail -= dt; p.trailT = (p.trailT || 0) - dt;
    if (p.trail > 0 && p.trailT <= 0) { p.trailT = .03; W.ghosts.push({ x: p.x, y: p.y, w: p.w, h: p.h, face: p.face, life: .22, max: .22, c: p.trailC || c }); }
  }

  // ---------- traps: pendulums, fire bars, crushers ----------
  const circleHits = (cx, cy, r, b) => {
    const nx = Math.max(b.x, Math.min(cx, b.x + b.w)), ny = Math.max(b.y, Math.min(cy, b.y + b.h));
    return (cx - nx) ** 2 + (cy - ny) ** 2 < r * r;
  };
  LF.pendBall = t => ({ x: t.ax + Math.sin(t.a) * t.len, y: t.ay + Math.cos(t.a) * t.len });
  LF.barBalls = t => Array.from({ length: t.n }, (_, k) => ({ x: t.cx + Math.cos(t.a) * (k + 1) * 13, y: t.cy + Math.sin(t.a) * (k + 1) * 13 }));
  function stepTraps(W, dt, playing) {
    const p = W.player;
    for (const t of W.traps) {
      if (t.type === 'pend') t.a = t.amp * Math.sin(W.clock * TAU / t.per + t.ph);
      else if (t.type === 'bar') t.a += t.spin * dt;
      else if (t.type === 'crush') {
        t.prevY = t.y; t.dx = 0;
        if (t.state === 'idle') {
          const below = p.y > t.y && p.y - t.y < TS * 10 && Math.abs(p.x + p.w / 2 - (t.x + t.w / 2)) < TS * 1.1;
          if (playing && !p.dead && below) { t.state = 'fall'; t.vy = 0; }
        } else if (t.state === 'fall') {
          t.vy = Math.min(900, t.vy + G * 1.2 * dt); t.y += t.vy * dt;
          const ty = Math.floor((t.y + t.h) / TS);
          const hit = isSolid(tile(W, Math.floor((t.x + 2) / TS), ty)) || isSolid(tile(W, Math.floor((t.x + t.w - 2) / TS), ty));
          if (hit || t.y > W.h * TS) {
            if (hit) t.y = ty * TS - t.h;
            t.state = 'wait'; t.wait = .8;
            W.shake = Math.max(W.shake, .22);
            burst(W, t.x + t.w / 2, t.y + t.h, 14, ['#8F81AB', '#D9D0F0'], 160, 400, 3);
            ring(W, t.x + t.w / 2, t.y + t.h, 40, '217,208,240');
            W.emit('slam');
          }
        } else if (t.state === 'wait') { if ((t.wait -= dt) <= 0) t.state = 'rise'; }
        else if ((t.y -= 70 * dt) <= t.oy) { t.y = t.oy; t.state = 'idle'; }
        t.dy = t.y - t.prevY;
      }
    }
  }
  function trapHit(W, p) {
    for (const t of W.traps) {
      if (t.type === 'pend') {
        const b = LF.pendBall(t);
        if (circleHits(b.x, b.y, 12, p)) return true;
        // A spiked chain hurts along its whole length.
        if (t.spiked) for (let k = 1; k < 14; k++) { const f = k / 14; if (circleHits(t.ax + (b.x - t.ax) * f, t.ay + (b.y - t.ay) * f, 4, p)) return true; }
      }
      else if (t.type === 'bar') { for (const b of LF.barBalls(t)) if (circleHits(b.x, b.y, 5, p)) return true; }
      // Crushers: only the spiked underside hurts. The top is a platform and the sides are solid.
      else if (p.onPlat !== t && overlap(p, { x: t.x + 3, y: t.y + t.h - 6, w: t.w - 6, h: 12 })) return true;
    }
    return false;
  }

  // ---------- the horde ----------
  // A wall of shadows that advances at a steady pace (right, or up for a rising horde), so
  // you can outrun it. It can't be shot or blocked, and a touch kills you even through a
  // shield. h.f is its front measured along the chase: x for right, -y for up.
  LF.HORDES = {
    '&': { name: 'Horde →', speed: 80, note: 'a wall of shadows that chases you right from this column' },
    '%': { name: 'Horde ↑', speed: 64, note: 'a wall of shadows that rises up after you from this row' },
  };
  // At level start and after every respawn it sits this far behind you, then pauses briefly.
  const HORDE_BACK = TS * 4, HORDE_WAIT = .5;
  const along = LF.hordeAlong = (h, x, y) => h.up ? -y : x;
  const playerAlong = (h, p) => along(h, p.x + p.w / 2, p.y + p.h / 2);
  function stepHorde(W, dt, playing) {
    const h = W.horde, p = W.player;
    if (!h || !playing || W.cleared || p.dead) return;
    if ((h.wait -= dt) > 0) return;
    h.f += LF.HORDES[h.c].speed * tune(W.def.tuning, h.c).speed * dt;
    for (const e of W.enemies) if (e.alive && along(h, e.x + e.w, e.y) < h.f - 10) e.alive = false;
    const gap = playerAlong(h, p) - h.f;
    if (gap < TS * 5 && (h.growl -= dt) <= 0) { h.growl = .9 + gap / TS * .2; W.emit('growl'); W.shake = Math.max(W.shake, .05); }
  }
  function hordeCaught(W, p) {
    if (!W.horde || p.inv > 0 || playerAlong(W.horde, p) > W.horde.f) return false;
    p.shield = false; p.inv = 0; kill(W);
    return true;
  }

  // ---------- keys & locked doors ----------
  // Touching a locked door with its key opens just the block you touched.
  function unlock(W, gate, sx, sy, fx, fy) {
    W.unlocking.push({ tx: sx, ty: sy, gate, t: .1 });
    W.tiles[sy][sx] = gate + '*';
    W.floaters.push({ x: sx * TS + 16, y: sy * TS - 6, t: 'unlocked', life: .9, c: LF.KEYS[LF.GATES[gate]].color });
    W.emit('unlock');
  }
  function stepUnlocking(W, dt) {
    for (const u of W.unlocking) {
      if ((u.t -= dt) > 0) continue;
      W.tiles[u.ty][u.tx] = ' ';
      const k = LF.KEYS[LF.GATES[u.gate]];
      burst(W, u.tx * TS + 16, u.ty * TS + 16, 10, [k.color, '#FFF1CF'], 120, 200, 2.5);
      W.emit('gatepop');
    }
    W.unlocking = W.unlocking.filter(u => u.t > 0);
  }

  function stepShingle(W, pl, dt) {
    pl.t += dt;
    if (pl.state === 'shake' && pl.t > .4) { pl.state = 'fall'; pl.t = 0; pl.vy = 0; W.emit('crumble'); }
    else if (pl.state === 'fall') {
      pl.vy = Math.min(700, pl.vy + G * .6 * dt); pl.dy = pl.vy * dt; pl.y += pl.dy;
      if (pl.y > W.h * TS + 40 || pl.t > 2.5) { pl.state = 'gone'; pl.t = 0; }
    } else if (pl.state === 'gone' && pl.t > 3) {
      const box = { x: pl.ox, y: pl.oy - 4, w: pl.w, h: pl.h + 4 };
      if (W.player.dead || !overlap(W.player, box)) { pl.state = 'idle'; pl.y = pl.prevY = pl.oy; pl.t = 0; }
    }
  }

  function stepCrumbles(W, dt) {
    const p = W.player;
    for (const c of W.crumbles) {
      c.t += dt;
      if (c.state === 'shake' && c.t > .45) {
        c.state = 'gone'; c.t = 0; W.tiles[c.ty][c.tx] = 'c';
        burst(W, c.tx * TS + 16, c.ty * TS + 16, 8, ['#8F81AB', '#5E5173'], 80, 600, 4);
        W.emit('crumble');
      } else if (c.state === 'gone' && c.t > 3.2) {
        const box = { x: c.tx * TS, y: c.ty * TS, w: TS, h: TS };
        if (p.dead || !overlap(p, box)) { W.tiles[c.ty][c.tx] = 'C'; c.state = 'done'; }
      }
    }
    W.crumbles = W.crumbles.filter(c => c.state !== 'done');
  }

  function turnMarker(W, tx, ty) { return tile(W, tx, ty) === '|'; }

  // Ground enemies fall when there's nothing under them (placed in mid-air, or their floor
  // crumbled or blinked away), and die if they land in water or lava or leave the level.
  const WALKERS = new Set(['B', 'K', 'R', 'I', 'S', 'A']);
  function supported(W, e) {
    const ty = Math.floor((e.y + e.h + 1) / TS);
    for (let tx = Math.floor((e.x + 2) / TS); tx <= Math.floor((e.x + e.w - 2) / TS); tx++) if (isFloor(tile(W, tx, ty))) return true;
    return false;
  }

  function stepEnemy(W, e, dt, playing) {
    e.t += dt;
    if (WALKERS.has(e.type)) {
      if (!supported(W, e)) {
        e.vy = Math.min(MAXFALL, (e.vy || 0) + G * dt);
        const hit = moveY(W, e, e.vy * dt, false);
        if (hit && hit.dir === 'down') e.vy = 0;
        if (e.y > W.h * TS + 40 || hazardHit(W, e)) e.alive = false;
        return;
      }
      e.vy = 0;
    }
    const p = W.player;
    const px = p.x + p.w / 2, py = p.y + p.h / 2, ex = e.x + e.w / 2, ey = e.y + e.h / 2;
    switch (e.type) {
      case 'B': case 'K': {
        const nx = e.x + e.vx * dt;
        const ahead = e.vx < 0 ? nx : nx + e.w;
        const tx = Math.floor(ahead / TS);
        const tyBody = Math.floor((e.y + e.h - 1) / TS), below = tile(W, tx, Math.floor((e.y + e.h + 2) / TS));
        if (isSolid(tile(W, tx, tyBody)) || turnMarker(W, tx, tyBody) || !isFloor(below)) e.vx *= -1;
        else e.x = nx;
        e.face = Math.sign(e.vx);
        break;
      }
      case 'X': {
        // Hang, drop on the player, wait, climb back up the thread.
        if (e.state === 'idle') {
          e.y = e.oy + Math.sin(e.t * 2) * 2;
          const below = py > ey && py - ey < TS * 8 && Math.abs(px - ex) < TS * 1.3;
          if (playing && !p.dead && below) { e.state = 'drop'; W.emit('drop'); }
        } else if (e.state === 'drop') {
          e.y += 420 * dt;
          const ty = Math.floor((e.y + e.h) / TS), tx = Math.floor(ex / TS);
          if (isFloor(tile(W, tx, ty)) || e.y - e.oy > TS * 8) { e.y = Math.min(e.y, ty * TS - e.h); e.state = 'wait'; e.wait = .7; }
        } else if (e.state === 'wait') {
          if ((e.wait -= dt) <= 0) e.state = 'climb';
        } else if ((e.y -= 90 * dt) <= e.oy) { e.y = e.oy; e.state = 'idle'; }
        break;
      }
      case 'R': {
        // Walk; when the player is level and ahead, wind up, then charge until a wall or edge, then rest.
        const f = Math.sign(e.vx) || e.face;
        if (e.state === 'idle') {
          const seen = playing && !p.dead && Math.abs(py - ey) < TS * .9 && Math.abs(px - ex) < TS * 7 && Math.sign(px - ex) === f;
          if (seen) { e.state = 'wind'; e.wait = .4; W.emit('snort'); }
        } else if (e.state === 'wind') {
          if ((e.wait -= dt) <= 0) { e.state = 'charge'; e.vx = f * 280; }
        } else if (e.state === 'rest') {
          if ((e.wait -= dt) <= 0) { e.state = 'idle'; e.vx = -f * 40; }
          break;
        }
        if (e.state === 'wind') { e.face = f; break; }
        const nx = e.x + e.vx * dt;
        const tx = Math.floor((e.vx < 0 ? nx : nx + e.w) / TS);
        const tyBody = Math.floor((e.y + e.h - 1) / TS), below = tile(W, tx, Math.floor((e.y + e.h + 2) / TS));
        if (isSolid(tile(W, tx, tyBody)) || turnMarker(W, tx, tyBody) || !isFloor(below)) {
          if (e.state === 'charge') {
            e.state = 'rest'; e.wait = .9; e.vx = f * 40;
            if (isSolid(tile(W, tx, tyBody))) { W.shake = Math.max(W.shake, .1); burst(W, e.vx > 0 ? e.x + e.w : e.x, ey, 8, ['#8F81AB', '#FF6B3D'], 100, 300, 2); }
          } else e.vx *= -1;
        } else e.x = nx;
        e.face = Math.sign(e.vx) || e.face;
        break;
      }
      case 'W': {
        // Hover, lock on, dash at where the player was, drift home.
        e.hurt = Math.max(0, e.hurt - dt);
        if (e.state === 'idle') {
          e.x += (e.ox - e.x) * Math.min(1, dt * 2); e.y += (e.oy + Math.sin(e.t * 4) * 6 - e.y) * Math.min(1, dt * 3);
          e.face = Math.sign(px - ex) || e.face;
          e.cool -= dt;
          if (e.cool <= 0 && playing && !p.dead && Math.hypot(px - ex, py - ey) < TS * 6) { e.state = 'aim'; e.wait = .5; e.tx = px; e.ty = py; W.emit('buzz'); }
        } else if (e.state === 'aim') {
          e.tx = px; e.ty = py;
          if ((e.wait -= dt) <= 0) {
            const d = Math.hypot(e.tx - ex, e.ty - ey) || 1;
            e.vx = (e.tx - ex) / d * 340; e.vy = (e.ty - ey) / d * 340; e.state = 'dash'; e.wait = .8;
          }
        } else if (e.state === 'dash') {
          e.x += e.vx * dt; e.y += e.vy * dt; e.face = Math.sign(e.vx) || e.face;
          if ((e.wait -= dt) <= 0 || isSolid(tile(W, Math.floor((e.x + e.w / 2) / TS), Math.floor((e.y + e.h / 2) / TS)))) { e.state = 'idle'; e.cool = 1.4; }
        }
        break;
      }
      case 'A': {
        e.cool -= dt;
        const d = px - ex, dy = py - ey, dist = Math.hypot(d, dy);
        if (dist < TS * 10) e.face = Math.sign(d) || e.face;
        if (e.cool <= 0 && playing && !p.dead && dist < TS * 10) {
          e.cool = 2.4;
          const sp = 210, ax = ex + e.face * 10, ay = e.y + 8;
          const n = Math.hypot(px - ax, py - ay) || 1;
          W.projectiles.push({ kind: 'arrow', x: ax - 5, y: ay - 5, w: 10, h: 6, vx: (px - ax) / n * sp, vy: (py - ay) / n * sp, life: 5 });
          W.emit('bow');
        }
        break;
      }
      case 'I': {
        e.hurt = Math.max(0, e.hurt - dt);
        const nx = e.x + e.vx * dt;
        const tx = Math.floor((e.vx < 0 ? nx : nx + e.w) / TS);
        const tyBody = Math.floor((e.y + e.h - 1) / TS), below = tile(W, tx, Math.floor((e.y + e.h + 2) / TS));
        if (isSolid(tile(W, tx, tyBody)) || turnMarker(W, tx, tyBody) || !isFloor(below)) e.vx *= -1;
        else e.x = nx;
        e.face = Math.sign(e.vx);
        if (Math.floor(e.t * 1.6) !== Math.floor((e.t - dt) * 1.6) && Math.abs(px - ex) < TS * 8) { W.shake = Math.max(W.shake, .06); }
        break;
      }
      case 'Y': {
        // Stays in the water: turns where the water (or a stop marker) ends.
        const nx = e.x + e.vx * dt;
        const tx = Math.floor((e.vx < 0 ? nx : nx + e.w) / TS), row = Math.floor((e.oy + e.h / 2) / TS);
        const c = tile(W, tx, row);
        if (c !== '~' || turnMarker(W, tx, row)) e.vx *= -1;
        else e.x = nx;
        e.y = e.oy + Math.sin(e.t * 2.5) * 3;
        e.face = Math.sign(e.vx);
        break;
      }
      case 'U': {
        // Bob up and down, but stop at the water's surface and bottom.
        e.y = Math.max(e.minY, Math.min(e.maxY, e.oy + Math.sin(e.t * 1.1) * 44));
        e.x = e.ox + Math.sin(e.t * .5) * 6;
        break;
      }
      case 'N': {
        // Wait under the surface, then leap toward the player in an arc.
        if (e.state === 'idle') {
          e.y = e.oy + Math.sin(e.t * 3) * 2;
          if ((e.wait -= dt) <= 0 && playing && !p.dead && Math.abs(px - ex) < TS * 7) {
            e.state = 'leap'; e.vy = -680; e.vx = Math.sign(px - ex) * 70 || 0; e.face = Math.sign(e.vx) || e.face;
            W.emit('leap');
          }
        } else {
          // Falling back: splash down wherever it meets water and stay there;
          // land on anything solid (or fall out of the level) and it dies.
          e.vy += G * .8 * dt; e.x += e.vx * dt; e.y += e.vy * dt;
          if (e.vy > 0) {
            const cx = e.x + e.w / 2, tx = Math.floor(cx / TS);
            if (tile(W, tx, Math.floor((e.y + e.h / 2) / TS)) === '~') {
              e.ox = e.x; e.oy = e.y; e.vx = 0; e.state = 'idle'; e.wait = 1.8;
              burst(W, cx, e.y, 6, ['#7FB0E0', '#D9D0F0'], 70, 300, 2);
            } else if (isSolid(tile(W, tx, Math.floor((e.y + e.h) / TS))) || e.y > W.h * TS) {
              e.alive = false;
              burst(W, cx, e.y + e.h / 2, 12, ['#A9B8C8', '#7C8C9E', '#D9E2EC'], 120, 400, 2.5);
              W.emit('flop');
            }
          }
        }
        break;
      }
      case '*': {
        // Rest just under the lava, then rise slowly about 5.5 tiles, hang at the top for
        // half a second, and sink back in.
        if (e.state === 'idle') {
          e.y = e.oy;
          if ((e.wait -= dt) <= 0) { e.state = 'up'; e.vy = -640; burst(W, ex, e.oy, 8, LF.WARM, 110, 300, 2); W.emit('bubble'); }
        } else if (e.state === 'hang') {
          e.y = e.hangY + Math.sin(e.t * 12) * 1.5;
          if ((e.wait -= dt) <= 0) { e.state = 'down'; e.vy = 0; }
        } else {
          e.vy += G * .55 * dt; e.y += e.vy * dt;
          if (e.state === 'up' && e.vy >= 0) { e.state = 'hang'; e.wait = .5 * ENEMY_SPEED; e.hangY = e.y; e.vy = 0; break; }
          if (Math.random() < .5) W.particles.push({ x: ex + (Math.random() - .5) * 8, y: e.y + e.h, vx: 0, vy: 20, life: .35, max: .35, c: LF.WARM[Math.floor(Math.random() * 3)], size: 2.5, g: 0 });
          if (e.vy > 0 && e.y >= e.oy) {
            e.y = e.oy; e.state = 'idle'; e.wait = 2 + Math.floor(e.ox / TS) % 3 * .6;
            burst(W, ex, e.oy, 10, LF.WARM, 130, 400, 2.5);
          }
        }
        break;
      }
      case 'Z': {
        const a = e.t * 2.4, r = 46;
        e.x = e.ox + Math.cos(a) * r; e.y = e.oy + Math.sin(a) * r;
        if (Math.random() < .3) W.particles.push({ x: e.x + 7, y: e.y + 7, vx: 0, vy: 0, life: .25, max: .25, c: '#FFB547', size: 2, g: 0 });
        break;
      }
      case 'F': {
        const nx = e.x + e.vx * dt;
        const tx = Math.floor((e.vx < 0 ? nx : nx + e.w) / TS), row = Math.floor((e.oy + e.h / 2) / TS);
        const far = Math.abs(nx - e.ox) > TS * 4 && Math.sign(nx - e.ox) === Math.sign(e.vx);
        if (isSolid(tile(W, tx, row)) || turnMarker(W, tx, row) || far) e.vx *= -1;
        else e.x = nx;
        e.y = e.oy + Math.sin(e.t * 3) * 14;
        e.face = Math.sign(e.vx);
        break;
      }
      case 'J': {
        e.vy = Math.min(MAXFALL, e.vy + G * dt);
        if (moveX(W, e, e.vx * dt)) e.vx = 0;
        const hit = moveY(W, e, e.vy * dt, false);
        if (hit && hit.dir === 'down') { e.vy = 0; e.vx = 0; e.ground = true; }
        else { if (hit && hit.dir === 'up') e.vy = 0; e.ground = false; }
        if (e.ground) {
          e.wait -= dt;
          if (e.wait <= 0 && playing && !p.dead && Math.abs(px - ex) < TS * 8 && Math.abs(py - ey) < TS * 5) {
            const d = Math.sign(px - ex) || 1;
            e.face = d; e.vx = d * 130; e.vy = -560; e.wait = 1.2; e.ground = false;
            W.emit('hop');
          }
        }
        if (e.y > W.h * TS + 40 || hazardHit(W, e)) e.alive = false;
        break;
      }
      case 'S': {
        e.cool -= dt;
        const d = px - ex;
        if (Math.abs(d) < TS * 11) e.face = Math.sign(d) || e.face;
        if (e.cool <= 0 && playing && !p.dead && Math.abs(d) < TS * 11 && Math.abs(py - ey) < TS * 2.5) {
          // Fireball settings from the editor: shotSpeed, fireRate and shotSize (all 1 by default).
          const t = tune(W.def.tuning, 'S'), r = 5 * (t.shotSize ?? 1);
          e.cool = 2.3 / (t.fireRate ?? 1);
          W.projectiles.push({ x: ex + e.face * (7 + r) - r, y: e.y + 9 - r, w: r * 2, h: r * 2, vx: e.face * 175 * (t.shotSpeed ?? 1), life: 6 });
          W.emit('spit');
        }
        break;
      }
      case 'G': {
        let tx = 0, ty = 0;
        if (playing && !p.dead) {
          const dx = px - ex, dy = py - ey, dist = Math.hypot(dx, dy) || 1;
          if (dist < TS * 10) { tx = dx / dist * 44; ty = dy / dist * 44; }
        } else { tx = (e.ox - e.x) * .8; ty = (e.oy - e.y) * .8; }
        let fear = 0;
        for (const l of W.lanterns) {
          if (!l.lit) continue;
          const lx = ex - l.x, ly = ey - l.y, ld = Math.hypot(lx, ly) || 1;
          if (ld < 170) { const push = (170 - ld) / 170 * 170; tx += lx / ld * push; ty += ly / ld * push; fear = Math.max(fear, (170 - ld) / 170); }
        }
        e.vx += (tx - e.vx) * Math.min(1, dt * 2);
        e.vy += (ty - e.vy) * Math.min(1, dt * 2);
        e.x += e.vx * dt; e.y += e.vy * dt;
        e.face = Math.sign(e.vx) || e.face;
        e.fade += (fear - e.fade) * Math.min(1, dt * 4);
        break;
      }
    }
  }

  function stepProjectiles(W, dt, playing) {
    const p = W.player;
    for (const b of W.projectiles) {
      b.x += b.vx * dt; b.y += (b.vy || 0) * dt; b.life -= dt;
      const bx = b.x + b.w / 2, by = b.y + b.h / 2;
      if (isSolid(tile(W, Math.floor(bx / TS), Math.floor(by / TS)))) {
        b.life = 0; burst(W, bx, by, 6, WARM, 90, 200, 2);
      } else if (playing && !p.dead && overlap(p, b)) { b.life = 0; hurt(W); }
      if (Math.random() < .4) W.particles.push({ x: bx, y: by, vx: -b.vx * .1, vy: -20, life: .3, max: .3, c: '#FF6B3D', size: 2, g: 0 });
    }
    W.projectiles = W.projectiles.filter(b => b.life > 0);
  }

  // Is there a wall directly beside the player on this side (-1 left, 1 right)?
  function wallBeside(W, p, side) {
    const tx = Math.floor(side > 0 ? (p.x + p.w + 1) / TS : (p.x - 1) / TS);
    const top = Math.floor((p.y + 4) / TS), bot = Math.floor((p.y + p.h - 4) / TS);
    for (let ty = top; ty <= bot; ty++) if (isSolid(tile(W, tx, ty))) return true;
    return false;
  }

  // Is the lower part of the body under the water surface?
  function inWater(W, p) {
    const x0 = Math.floor((p.x + 3) / TS), x1 = Math.floor((p.x + p.w - 3) / TS);
    const y0 = Math.floor((p.y + p.h * .4) / TS), y1 = Math.floor((p.y + p.h - 1) / TS);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      if (tile(W, tx, ty) !== '~') continue;
      if (tile(W, tx, ty - 1) === '~' || p.y + p.h > ty * TS + 10) return true;
    }
    return false;
  }

  function stepPlayer(W, p, input, dt) {
    const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    p.lock -= dt; p.inv -= dt;
    p.boost = Math.max(0, p.boost - dt); p.dbl = Math.max(0, p.dbl - dt);
    if (dir && p.lock <= 0) p.face = dir;
    // Right after a wall jump, steering is weak so the kick carries you off the wall.
    const wet = inWater(W, p);
    if (wet && !p.wet) {
      burst(W, p.x + p.w / 2, p.y + p.h, 10, ['#7FB0E0', '#D9D0F0'], 110, 500, 2);
      W.emit('splash');
    }
    p.wet = wet;
    const T = playerTune(W.def), grav = G * T.gravity, run = RUN * T.run;
    const accel = p.onGround ? (p.ice ? (dir ? 450 : 120) : dir ? 2600 : 2200) : p.lock > 0 ? 250 : (dir ? 1700 : 700) * T.air;
    p.vx = approach(p.vx, dir * run * (wet ? .65 : 1), accel * dt);

    if (input.jumpPressed) { p.buffer = .13; input.jumpPressed = false; } else p.buffer -= dt;
    p.coyote = p.onGround ? .1 : p.coyote - dt;
    if (input.down && p.onGround) p.drop = .2;
    p.drop -= dt;
    const dropping = p.drop > 0;

    // Walls: touching one in the air allows a wall jump; pushing into it while falling slides slowly.
    p.wall = p.onGround ? 0 : wallBeside(W, p, -1) ? -1 : wallBeside(W, p, 1) ? 1 : 0;
    const airJumps = T.airJumps + (p.dbl > 0 ? 1 : 0);
    if (p.wall) { p.wallDir = p.wall; p.wallCoyote = .1; p.airJumps = airJumps; }
    else p.wallCoyote -= dt;
    if (p.onGround || wet) p.airJumps = airJumps;
    p.sliding = !!p.wall && dir === p.wall && p.vy > 0;

    // Jump speed scales with sqrt(height x gravity) so the height setting is exact at any gravity.
    const jumpV = JUMP * Math.sqrt(T.jump * T.gravity) * (p.boost > 0 ? BOOST : 1);
    if (p.buffer > 0 && p.coyote > 0 && !dropping) {
      p.vy = -jumpV; p.buffer = 0; p.coyote = 0; p.jumping = true;
      p.onGround = false; p.onPlat = null; p.sx = .75; p.sy = 1.3;
      burst(W, p.x + p.w / 2, p.y + p.h, 6, p.boost > 0 ? ['#FFB547', '#FF6B3D'] : ['#9A8FBF'], 60, 200, 2);
      W.emit('jump');
    } else if (p.buffer > 0 && wet) {
      // Swimming: as many jumps as you like while in the water.
      p.vy = -jumpV * .88; p.buffer = 0; p.jumping = true; p.sx = .85; p.sy = 1.2;
      burst(W, p.x + p.w / 2, p.y + p.h, 6, ['#7FB0E0', '#D9D0F0'], 70, 150, 2);
      W.emit('swim');
    } else if (p.buffer > 0 && p.wallCoyote > 0 && !p.onGround) {
      const away = -p.wallDir;
      p.vy = -jumpV * .92 * Math.sqrt(T.wallJump); p.vx = away * WALL_KICK * T.wallKick; p.face = away; p.lock = .16;
      p.buffer = 0; p.wallCoyote = 0; p.jumping = true; p.sliding = false; p.sx = .8; p.sy = 1.25;
      burst(W, p.wallDir > 0 ? p.x + p.w : p.x, p.y + p.h / 2, 7, ['#9A8FBF', '#D9D0F0'], 90, 200, 2);
      const wx = p.wallDir > 0 ? p.x + p.w : p.x;
      burst(W, wx, p.y + p.h / 2, 10, ['#D9D0F0', '#9A8FBF', '#A99CC4'], 150, 300, 2.5);
      for (let k = 0; k < 5; k++) W.particles.push({ x: wx, y: p.y + 4 + k * 5, vx: away * (60 + k * 25), vy: -30 - k * 10, life: .3, max: .3, c: '#D9D0F0', size: 2, g: 200 });
      ring(W, wx, p.y + p.h / 2, 22, '217,208,240', .25);
      p.trail = .22; p.trailC = '154,143,191'; W.shake = Math.max(W.shake, .05);
      W.emit('walljump');
    } else if (p.buffer > 0 && p.airJumps > 0 && !p.onGround) {
      p.vy = -jumpV * .9; p.airJumps--; p.buffer = 0; p.jumping = true; p.sx = .8; p.sy = 1.25;
      burst(W, p.x + p.w / 2, p.y + p.h, 12, ['#FFE066', '#FFF6C2'], 110, 100, 2.5);
      ring(W, p.x + p.w / 2, p.y + p.h, 26, '255,224,102', .3);
      p.trail = .25; p.trailC = '255,224,102';
      W.emit('djump');
    }
    if (p.jumping && !input.jump && p.vy < 0) { p.vy *= .45; p.jumping = false; }
    if (p.vy >= 0) p.jumping = false;
    if (wet) {
      p.vy = Math.min(SINK, p.vy + grav * .45 * dt);
      if (Math.random() < .05) W.particles.push({ x: p.x + p.w / 2 + p.face * 4, y: p.y + 4, vx: 0, vy: -40, life: .6, max: .6, c: '#9FD8FF', size: 2, g: -60 });
    } else p.vy = Math.min(MAXFALL * Math.sqrt(T.gravity), p.vy + grav * dt * (p.vy > 0 ? 1.15 : 1));
    if (p.sliding) {
      p.vy = Math.min(p.vy, WALL_SLIDE * T.wallSlide);
      if (Math.random() < .12) W.particles.push({ x: p.wall > 0 ? p.x + p.w : p.x, y: p.y + p.h - 4, vx: -p.wall * 20, vy: -30, life: .35, max: .35, c: '#9A8FBF', size: 2, g: 200 });
    }
    if (p.boost > 0 && Math.random() < .08) W.particles.push({ x: p.x + Math.random() * p.w, y: p.y + p.h, vx: 0, vy: -40, life: .4, max: .4, c: '#FFB547', size: 2, g: -40 });
    if (p.dbl > 0 && Math.random() < .08) W.particles.push({ x: p.x + Math.random() * p.w, y: p.y + p.h * Math.random(), vx: 0, vy: -20, life: .4, max: .4, c: '#FFE066', size: 2, g: 0 });

    if (p.onPlat && !dropping) { moveX(W, p, p.onPlat.dx); p.y += p.onPlat.dy; }
    if (p.onGround && p.conv) moveX(W, p, p.conv * CONVEY * dt);

    // Gun: finite ammo, kills anything it hits. Each press fires one shot;
    // holding fire keeps shooting until you let go or run out.
    // Holding Shift makes any shot big: twice the size and blast, twice the ammo.
    p.cool -= dt; p.flash -= dt;
    const s = input.big ? 2 : 1;
    if ((input.firePressed || input.fire) && p.cool <= 0) {
      const tapped = input.firePressed;
      input.firePressed = false;
      if (p.ammo >= s) {
        p.ammo -= s; p.cool = .16; p.flash = .08;
        const g = LF.gunPos(p);
        W.bullets.push({ x: g.x, y: g.y, vx: p.face * BULLET, life: 1.1, s });
        p.vx -= p.face * 40;
        W.emit('shoot');
      } else if (tapped) {
        p.cool = .5; W.emit('empty');
        W.floaters.push({ x: p.x + p.w / 2, y: p.y - 10, t: p.ammo > 0 ? `big shot needs ${s} ammo` : 'no ammo — find a crate', life: 1, c: '#D9D0F0' });
      }
    }
    // X and Q work like E: tap for one, hold to keep firing while there's ammo for it.
    for (const kind of ['rocket', 'grenade']) {
      const tapped = input[kind + 'Pressed'];
      if (!tapped && !input[kind]) continue;
      if (p.cool > 0) continue;
      input[kind + 'Pressed'] = false;
      const spec = SPECIAL[kind], cost = spec.cost * s;
      if (p.ammo < cost) {
        if (tapped) {
          p.cool = .3; W.emit('empty');
          W.floaters.push({ x: p.x + p.w / 2, y: p.y - 10, t: `${s > 1 ? 'big ' : ''}${spec.name} needs ${cost} ammo`, life: 1, c: '#D9D0F0' });
        }
        continue;
      }
      p.ammo -= cost; p.cool = .4; p.flash = .1;
      const g = LF.gunPos(p);
      if (kind === 'rocket') W.bullets.push({ kind, x: g.x, y: g.y, vx: p.face * 430, vy: 0, life: 1.6, s });
      else W.bullets.push({ kind, x: g.x, y: g.y - 4, vx: p.face * 270 + p.vx * .3, vy: -420, life: 2.2, bounces: 0, s });
      p.vx -= p.face * 70;
      W.emit(kind === 'rocket' ? 'rocket' : 'lob');
    }

    const wasAir = !p.onGround, fallSpeed = p.vy;
    p.onGround = false; p.onPlat = null; p.conv = 0; p.ice = false;
    if (moveX(W, p, p.vx * dt)) p.vx = 0;
    const pb = p.y + p.h;
    const hit = moveY(W, p, p.vy * dt, dropping);
    let bounced = false;
    if (hit && hit.dir === 'down') {
      p.vy = 0; p.onGround = true;
      for (const u of hit.under) {
        if (u.c === 'O') bounced = true;
        if (u.c === '<') p.conv = -1; else if (u.c === '>') p.conv = 1;
        if (u.c === 'i') p.ice = true;
        if (u.c === 'C' && !W.crumbles.some(c => c.tx === u.tx && c.ty === u.ty)) W.crumbles.push({ tx: u.tx, ty: u.ty, t: 0, state: 'shake' });
      }
    } else if (hit && hit.dir === 'up') { p.vy = 0; p.jumping = false; }

    if (!p.onGround && p.vy >= 0 && !dropping) {
      for (const pl of W.plats) {
        if (pl.state === 'gone') continue;
        if (p.x + p.w > pl.x + 2 && p.x < pl.x + pl.w - 2 && pb <= Math.max(pl.prevY, pl.y) + 1 && p.y + p.h >= pl.y) {
          p.y = pl.y - p.h; p.vy = 0; p.onGround = true; p.onPlat = pl;
          if (pl.kind === 'fall' && pl.state === 'idle') { pl.state = 'shake'; pl.t = 0; }
          break;
        }
      }
      // Crusher tops work like a moving platform (you can ride them, not stomp them).
      if (!p.onGround) for (const t of W.traps) {
        if (t.type !== 'crush') continue;
        if (p.x + p.w > t.x + 2 && p.x < t.x + t.w - 2 && pb <= Math.max(t.prevY ?? t.y, t.y) + 1 && p.y + p.h >= t.y) {
          p.y = t.y - p.h; p.vy = 0; p.onGround = true; p.onPlat = t; break;
        }
      }
    }
    if (bounced) {
      p.vy = -SPRING * Math.sqrt(T.gravity); p.onGround = false; p.coyote = 0; p.jumping = false; p.sx = .7; p.sy = 1.35;
      burst(W, p.x + p.w / 2, p.y + p.h, 10, ['#FFB547', '#D9D0F0'], 120, 300, 2);
      ring(W, p.x + p.w / 2, p.y + p.h, 30, '255,181,71', .3);
      p.trail = .4; p.trailC = '255,181,71';
      W.emit('spring');
    } else if (p.onGround && wasAir && fallSpeed > 250) {
      p.sx = 1.3; p.sy = .72;
      burst(W, p.x + p.w / 2, p.y + p.h, fallSpeed > 700 ? 16 : 8, ['#9A8FBF', '#D9D0F0'], fallSpeed > 700 ? 140 : 80, 250, 2);
      if (fallSpeed > 700) { ring(W, p.x + p.w / 2, p.y + p.h, 30, '217,208,240', .3); W.shake = Math.max(W.shake, .08); }
      W.emit('land');
    }
    p.sx += (1 - p.sx) * Math.min(1, dt * 14);
    p.sy += (1 - p.sy) * Math.min(1, dt * 14);
    p.anim += dt * (Math.abs(p.vx) / run);
    trail(W, p, dt, '154,143,191');

    // Water at the bottom edge of the map has a floor: you can't sink out of the world.
    if (p.y + p.h > W.h * TS && tile(W, Math.floor((p.x + p.w / 2) / TS), W.h - 1) === '~') { p.y = W.h * TS - p.h; p.vy = Math.min(p.vy, 0); }
    if (p.y > W.h * TS + 60) return kill(W);
    // Lava kills outright; the shield doesn't help.
    if (p.inv <= 0 && lavaAt(W, p)) { p.shield = false; return kill(W); }
    if (hazardHit(W, p, true)) { hurt(W); if (p.dead) return; }
    if (p.inv <= 0 && trapHit(W, p)) { hurt(W); if (p.dead) return; }
    // Crusher sides push you out instead of hurting.
    for (const t of W.traps) {
      if (t.type !== 'crush' || p.onPlat === t || !overlap(p, { x: t.x, y: t.y + 4, w: t.w, h: t.h - 10 })) continue;
      if (p.x + p.w / 2 < t.x + t.w / 2) p.x = t.x - p.w; else p.x = t.x + t.w;
      p.vx = 0;
    }
    if (hordeCaught(W, p)) return;

    for (const e of W.enemies) {
      if (!e.alive || !overlap(p, e)) continue;
      const spec = LF.ENEMIES[e.type];
      if (e.type === 'G' && e.fade > .85) continue;
      if (spec.stomp && p.vy > 0 && p.y + p.h - e.y < 14) {
        e.alive = false; dropAmmo(W, e); p.vy = (input.jump ? -620 : -460) * Math.sqrt(T.gravity); p.jumping = input.jump;
        burst(W, e.x + e.w / 2, e.y + e.h / 2, 14, ['#FF6B3D', '#463C6B'], 160, 500);
        W.floaters.push({ x: e.x + e.w / 2, y: e.y - 6, t: 'stomp', life: .8, c: '#FF6B3D' });
        W.shake = .12; W.freeze = .05; ring(W, e.x + e.w / 2, e.y + e.h / 2, 28, '255,107,61'); W.emit('stomp', { type: e.type });
      } else { hurt(W); if (p.dead) return; }
    }

    const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
    for (const l of W.lanterns) {
      if (l.lit || Math.abs(cx - l.x) > 22 || Math.abs(cy - l.y) > 26) continue;
      l.lit = true; l.pop = 1;
      const cpY = findFloorBelow(W, l);
      if (cpY !== null) W.checkpoint = { tx: l.tx, ty: cpY };
      burst(W, l.x, l.y, 22, WARM, 150, 120, 2.5);
      const lit = W.lanterns.filter(q => q.lit).length;
      W.floaters.push({ x: l.x, y: l.y - 22, t: `${lit}/${W.total}`, life: 1, c: '#FFB547' });
      W.emit('light', { lit, total: W.total });
      if (lit === W.total && W.door && !W.door.open) { W.door.open = true; W.emit('door'); }
    }

    for (const k of W.keys) {
      if (k.taken || Math.abs(cx - k.x) > 20 || Math.abs(cy - k.y) > 22) continue;
      const spec = LF.KEYS[k.c];
      k.taken = true; p.keys[k.c] = true;
      burst(W, k.x, k.y, 22, [spec.color, '#FFF1CF'], 150, 150, 2.5);
      ring(W, k.x, k.y, 34, '255,241,207', .4);
      W.floaters.push({ x: k.x, y: k.y - 20, t: spec.name.toLowerCase(), life: 1.2, c: spec.color });
      W.emit('key');
    }
    // Touching a locked door block while holding its key opens that one block. You keep the key.
    for (const kc in p.keys) {
      const gate = LF.KEYS[kc].gate;
      const x0 = Math.floor((p.x - 3) / TS), x1 = Math.floor((p.x + p.w + 3) / TS);
      const y0 = Math.floor((p.y - 3) / TS), y1 = Math.floor((p.y + p.h + 3) / TS);
      let hit = null;
      for (let ty = y0; ty <= y1 && !hit; ty++) for (let tx = x0; tx <= x1 && !hit; tx++) if (tile(W, tx, ty) === gate) hit = { tx, ty };
      if (!hit) continue;
      unlock(W, gate, hit.tx, hit.ty, cx, cy);
    }

    for (const a of W.ammo) {
      if (a.taken || Math.abs(cx - a.x) > 20 || Math.abs(cy - a.y) > 22) continue;
      a.taken = true; p.ammo += a.n;
      burst(W, a.x, a.y, a.huge ? 40 : a.big ? 24 : 12, ['#FFE2A8', '#FFB547'], a.huge ? 180 : 130, 150, 2.5);
      W.floaters.push({ x: a.x, y: a.y - 20, t: `+${a.n} ammo`, life: 1.1, c: '#FFE2A8' });
      W.emit(a.big && !a.drop ? 'bigammo' : 'ammo');
    }

    for (const f of W.fruits) {
      if (f.taken || Math.abs(cx - f.x) > 20 || Math.abs(cy - f.y) > 22) continue;
      const spec = LF.FRUITS[f.type];
      f.taken = true; f.regrow = REGROW; f.pop = 1;
      if (f.type === 'a') p.shield = true;
      else if (f.type === 'o') p.boost = spec.dur;
      else if (f.type === 'b') { p.dbl = spec.dur; p.airJumps = Math.max(p.airJumps, 1); }
      burst(W, f.x, f.y, 16, [spec.color, '#FFF6C2'], 130, 150, 2.5);
      W.floaters.push({ x: f.x, y: f.y - 20, t: spec.power.toLowerCase(), life: 1.1, c: spec.color });
      W.emit('fruit', { type: f.type });
    }

    const d = W.door;
    if (d && d.open && overlap(p, { x: d.x + 8, y: d.y + 10, w: 16, h: d.h - 10 })) {
      W.cleared = true;
      burst(W, d.x + 16, d.y + 20, 40, WARM, 260, 200, 3);
      W.emit('clear');
    }
  }

  // Checkpoint: the first safe standing tile at or below the lantern; null keeps the old checkpoint.
  function findFloorBelow(W, l) {
    for (let y = l.ty; y < Math.min(W.h - 1, l.ty + 5); y++) {
      const here = tile(W, l.tx, y);
      if (isSolid(here) || here === '^' || here === '~') return null;
      const below = tile(W, l.tx, y + 1);
      if (below === '#' || below === '=' || below === 'O') return y;
    }
    return null;
  }
})();
