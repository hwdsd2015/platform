// Lanternfall engine: level parsing, physics, enemies. No DOM.
(() => {
  const LF = window.LF = window.LF || {};
  const TS = LF.TS = 32;
  const G = 2100, MAXFALL = 900, RUN = 250, JUMP = 700, SPRING = 1080;
  const WALL_SLIDE = 110, WALL_KICK = 330, BOOST = 1.22, REGROW = 12, SINK = 55;
  const TAU = Math.PI * 2;

  // Fruit: touch to gain a power. Picked fruit grows back after REGROW seconds.
  LF.FRUITS = {
    a: { name: 'Apple', power: 'Shield', color: '#E5484D', note: 'shield: blocks one hit' },
    o: { name: 'Orange', power: 'Jump boost', color: '#FF9A2E', dur: 12, note: 'higher jumps for 12s' },
    b: { name: 'Banana', power: 'Double jump', color: '#FFE066', dur: 15, note: 'jump again in mid-air for 15s' },
  };

  LF.ENEMIES = {
    B: { name: 'Wick-beetle', w: 24, h: 16, stomp: true, note: 'walks, turns at edges' },
    K: { name: 'Thornback', w: 26, h: 18, stomp: false, note: 'fast walker, spiky — jump over' },
    F: { name: 'Soot bat', w: 24, h: 14, stomp: true, note: 'flies back and forth' },
    J: { name: 'Puddle frog', w: 22, h: 18, stomp: true, note: 'hops toward you' },
    S: { name: 'Ember pot', w: 24, h: 22, stomp: true, note: 'spits embers' },
    G: { name: 'Wraith', w: 24, h: 28, stomp: false, note: 'drifts toward you, fears lit lanterns' },
  };

  LF.rng = seed => () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };

  const isSolid = LF.isSolid = c => c === '#' || c === 'C' || c === 'O';
  const isFloor = LF.isFloor = c => isSolid(c) || c === '=';
  const blocksPlat = c => c === '#' || c === 'C' || c === 'O' || c === '|' || c === '^' || c === '=';

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
      lanterns: [], fruits: [], enemies: [], plats: [], projectiles: [], particles: [], floaters: [], crumbles: [],
      door: null, start: { tx: 1, ty: h - 2 }, clock: 0, time: 0, falls: 0, shake: 0,
      deadTimer: 0, cleared: false, events: [],
    };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const c = tiles[y][x];
      if (c === 'P') { W.start = { tx: x, ty: y }; tiles[y][x] = ' '; }
      else if (c === 'L') { W.lanterns.push({ tx: x, ty: y, x: x * TS + 16, y: y * TS + 14, lit: false, f: (x * 7 + y * 3) % 9, pop: 0 }); tiles[y][x] = ' '; }
      else if (LF.FRUITS[c]) { W.fruits.push({ type: c, tx: x, ty: y, x: x * TS + 16, y: y * TS + 18, taken: false, regrow: 0, pop: 0 }); tiles[y][x] = ' '; }
      else if (c === 'D') { W.door = { tx: x, ty: y, x: x * TS, y: (y - 1) * TS + 4, w: 32, h: 60, open: false, glow: 0 }; tiles[y][x] = ' '; }
      else if (c === 'M' || c === 'V') {
        W.plats.push({ axis: c === 'M' ? 'x' : 'y', x: x * TS, y: y * TS, ox: x * TS, oy: y * TS, w: TS * 2, h: 12, v: 70, dir: 1, dx: 0, dy: 0, prevY: y * TS });
        tiles[y][x] = ' ';
      } else if (LF.ENEMIES[c]) { W.enemies.push(makeEnemy(c, x, y)); tiles[y][x] = ' '; }
    }
    W.total = W.lanterns.length;
    if (W.door && !W.total) W.door.open = true;
    W.checkpoint = { ...W.start };
    W.player = makePlayer(W.start);
    W.emit = (type, data) => W.events.push({ type, data });
    return W;
  };

  function makeEnemy(type, tx, ty) {
    const s = LF.ENEMIES[type];
    const x = tx * TS + (TS - s.w) / 2;
    let y = (ty + 1) * TS - s.h;
    if (type === 'F') y = ty * TS + 9;
    if (type === 'G') y = ty * TS + 2;
    const vx = { B: -48, K: -72, F: -64 }[type] || 0;
    return { type, x, y, w: s.w, h: s.h, ox: x, oy: y, vx, vy: 0, alive: true, dead: 0, t: (tx * 13 + ty * 5) % 7 * .3, face: -1, cool: 1.2, wait: .8, ground: false, fade: 0 };
  }

  function makePlayer(cp) {
    const w = 18, h = 26;
    return {
      x: cp.tx * TS + (TS - w) / 2, y: (cp.ty + 1) * TS - h, w, h,
      vx: 0, vy: 0, face: 1, onGround: false, onPlat: null,
      coyote: 0, buffer: 0, jumping: false, drop: 0, sx: 1, sy: 1, anim: 0, dead: false,
      wall: 0, wallDir: 0, wallCoyote: 0, sliding: false, lock: 0, wet: false,
      shield: false, boost: 0, dbl: 0, airJumps: 0, inv: 0,
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

  // Water only drowns enemies; the player swims (see inWater).
  function hazardHit(W, p, swims = false) {
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
    W.shake = .35; W.emit('die');
  }

  // A hit: the apple shield soaks it (with a short grace period), otherwise the player dies.
  function hurt(W) {
    const p = W.player;
    if (p.dead || p.inv > 0) return;
    if (!p.shield) return kill(W);
    p.shield = false; p.inv = 1.2; p.vy = -520; p.jumping = false;
    burst(W, p.x + p.w / 2, p.y + p.h / 2, 20, ['#9FD8FF', '#D9D0F0'], 200, 300);
    W.floaters.push({ x: p.x + p.w / 2, y: p.y - 8, t: 'shield broke', life: 1, c: '#9FD8FF' });
    W.shake = .15; W.emit('shield');
  }

  function respawn(W) {
    Object.assign(W.player, makePlayer(W.checkpoint));
    W.projectiles = [];
    for (const e of W.enemies) if (e.type === 'G') { e.x = e.ox; e.y = e.oy; e.vx = e.vy = 0; }
    burst(W, W.player.x + 9, W.player.y + 26, 12, ['#D9D0F0', '#FFB547'], 90, -60, 2);
    W.emit('respawn');
  }

  // ---------- step ----------
  LF.step = function (W, input, dt, playing = true) {
    W.clock += dt;
    stepPlats(W, dt);
    stepCrumbles(W, dt);
    for (const e of W.enemies) {
      if (!e.alive) { e.dead += dt; continue; }
      stepEnemy(W, e, dt, playing);
    }
    stepProjectiles(W, dt, playing);
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

  function stepEnemy(W, e, dt, playing) {
    e.t += dt;
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
          e.cool = 2.3;
          W.projectiles.push({ x: ex + e.face * 12 - 5, y: e.y + 4, w: 10, h: 10, vx: e.face * 175, life: 6 });
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
      b.x += b.vx * dt; b.life -= dt;
      if (isSolid(tile(W, Math.floor((b.x + 5) / TS), Math.floor((b.y + 5) / TS)))) {
        b.life = 0; burst(W, b.x + 5, b.y + 5, 6, WARM, 90, 200, 2);
      } else if (playing && !p.dead && overlap(p, b)) { b.life = 0; hurt(W); }
      if (Math.random() < .4) W.particles.push({ x: b.x + 5, y: b.y + 5, vx: -b.vx * .1, vy: -20, life: .3, max: .3, c: '#FF6B3D', size: 2, g: 0 });
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
    const accel = p.onGround ? (dir ? 2600 : 2200) : p.lock > 0 ? 250 : (dir ? 1700 : 700);
    p.vx = approach(p.vx, dir * RUN * (wet ? .65 : 1), accel * dt);

    if (input.jumpPressed) { p.buffer = .13; input.jumpPressed = false; } else p.buffer -= dt;
    p.coyote = p.onGround ? .1 : p.coyote - dt;
    if (input.down && p.onGround) p.drop = .2;
    p.drop -= dt;
    const dropping = p.drop > 0;

    // Walls: touching one in the air allows a wall jump; pushing into it while falling slides slowly.
    p.wall = p.onGround ? 0 : wallBeside(W, p, -1) ? -1 : wallBeside(W, p, 1) ? 1 : 0;
    if (p.wall) { p.wallDir = p.wall; p.wallCoyote = .1; p.airJumps = p.dbl > 0 ? 1 : 0; }
    else p.wallCoyote -= dt;
    if (p.onGround || wet) p.airJumps = p.dbl > 0 ? 1 : 0;
    p.sliding = !!p.wall && dir === p.wall && p.vy > 0;

    const jumpV = JUMP * (p.boost > 0 ? BOOST : 1);
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
      p.vy = -jumpV * .92; p.vx = away * WALL_KICK; p.face = away; p.lock = .16;
      p.buffer = 0; p.wallCoyote = 0; p.jumping = true; p.sliding = false; p.sx = .8; p.sy = 1.25;
      burst(W, p.wallDir > 0 ? p.x + p.w : p.x, p.y + p.h / 2, 7, ['#9A8FBF', '#D9D0F0'], 90, 200, 2);
      W.emit('walljump');
    } else if (p.buffer > 0 && p.airJumps > 0 && !p.onGround) {
      p.vy = -jumpV * .9; p.airJumps--; p.buffer = 0; p.jumping = true; p.sx = .8; p.sy = 1.25;
      burst(W, p.x + p.w / 2, p.y + p.h, 12, ['#FFE066', '#FFF6C2'], 110, 100, 2.5);
      W.emit('djump');
    }
    if (p.jumping && !input.jump && p.vy < 0) { p.vy *= .45; p.jumping = false; }
    if (p.vy >= 0) p.jumping = false;
    if (wet) {
      p.vy = Math.min(SINK, p.vy + G * .45 * dt);
      if (Math.random() < .05) W.particles.push({ x: p.x + p.w / 2 + p.face * 4, y: p.y + 4, vx: 0, vy: -40, life: .6, max: .6, c: '#9FD8FF', size: 2, g: -60 });
    } else p.vy = Math.min(MAXFALL, p.vy + G * dt * (p.vy > 0 ? 1.15 : 1));
    if (p.sliding) {
      p.vy = Math.min(p.vy, WALL_SLIDE);
      if (Math.random() < .12) W.particles.push({ x: p.wall > 0 ? p.x + p.w : p.x, y: p.y + p.h - 4, vx: -p.wall * 20, vy: -30, life: .35, max: .35, c: '#9A8FBF', size: 2, g: 200 });
    }
    if (p.boost > 0 && Math.random() < .08) W.particles.push({ x: p.x + Math.random() * p.w, y: p.y + p.h, vx: 0, vy: -40, life: .4, max: .4, c: '#FFB547', size: 2, g: -40 });
    if (p.dbl > 0 && Math.random() < .08) W.particles.push({ x: p.x + Math.random() * p.w, y: p.y + p.h * Math.random(), vx: 0, vy: -20, life: .4, max: .4, c: '#FFE066', size: 2, g: 0 });

    if (p.onPlat && !dropping) { moveX(W, p, p.onPlat.dx); p.y += p.onPlat.dy; }

    const wasAir = !p.onGround, fallSpeed = p.vy;
    p.onGround = false; p.onPlat = null;
    if (moveX(W, p, p.vx * dt)) p.vx = 0;
    const pb = p.y + p.h;
    const hit = moveY(W, p, p.vy * dt, dropping);
    let bounced = false;
    if (hit && hit.dir === 'down') {
      p.vy = 0; p.onGround = true;
      for (const u of hit.under) {
        if (u.c === 'O') bounced = true;
        if (u.c === 'C' && !W.crumbles.some(c => c.tx === u.tx && c.ty === u.ty)) W.crumbles.push({ tx: u.tx, ty: u.ty, t: 0, state: 'shake' });
      }
    } else if (hit && hit.dir === 'up') { p.vy = 0; p.jumping = false; }

    if (!p.onGround && p.vy >= 0 && !dropping) {
      for (const pl of W.plats) {
        if (p.x + p.w > pl.x + 2 && p.x < pl.x + pl.w - 2 && pb <= Math.max(pl.prevY, pl.y) + 1 && p.y + p.h >= pl.y) {
          p.y = pl.y - p.h; p.vy = 0; p.onGround = true; p.onPlat = pl; break;
        }
      }
    }
    if (bounced) {
      p.vy = -SPRING; p.onGround = false; p.coyote = 0; p.jumping = false; p.sx = .7; p.sy = 1.35;
      burst(W, p.x + p.w / 2, p.y + p.h, 10, ['#FFB547', '#D9D0F0'], 120, 300, 2);
      W.emit('spring');
    } else if (p.onGround && wasAir && fallSpeed > 250) {
      p.sx = 1.3; p.sy = .72;
      burst(W, p.x + p.w / 2, p.y + p.h, 8, ['#9A8FBF', '#D9D0F0'], 80, 250, 2);
      W.emit('land');
    }
    p.sx += (1 - p.sx) * Math.min(1, dt * 14);
    p.sy += (1 - p.sy) * Math.min(1, dt * 14);
    p.anim += dt * (Math.abs(p.vx) / RUN);

    // Water at the bottom edge of the map has a floor: you can't sink out of the world.
    if (p.y + p.h > W.h * TS && tile(W, Math.floor((p.x + p.w / 2) / TS), W.h - 1) === '~') { p.y = W.h * TS - p.h; p.vy = Math.min(p.vy, 0); }
    if (p.y > W.h * TS + 60) return kill(W);
    if (hazardHit(W, p, true)) { hurt(W); if (p.dead) return; }

    for (const e of W.enemies) {
      if (!e.alive || !overlap(p, e)) continue;
      const spec = LF.ENEMIES[e.type];
      if (e.type === 'G' && e.fade > .85) continue;
      if (spec.stomp && p.vy > 0 && p.y + p.h - e.y < 14) {
        e.alive = false; p.vy = input.jump ? -620 : -460; p.jumping = input.jump;
        burst(W, e.x + e.w / 2, e.y + e.h / 2, 14, ['#FF6B3D', '#463C6B'], 160, 500);
        W.floaters.push({ x: e.x + e.w / 2, y: e.y - 6, t: 'stomp', life: .8, c: '#FF6B3D' });
        W.shake = .12; W.emit('stomp');
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
