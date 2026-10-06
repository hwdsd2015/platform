// Lanternfall app: menus, play loop, HUD, storage, audio.
(() => {
  const LF = window.LF;
  const $ = id => document.getElementById(id);
  const STEP = 1 / 120;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = t => { const m = Math.floor(t / 60), s = t - m * 60; return `${m}:${s < 10 ? '0' : ''}${s.toFixed(1)}`; };
  // Chapter numbers in Roman numerals: roman(0) is "I".
  const roman = k => { let n = k + 1, out = ''; for (const [v, r] of [[50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]) while (n >= v) { out += r; n -= v; } return out; };

  const cvs = $('game');
  const R = LF.createRenderer(cvs);
  R.resize(); addEventListener('resize', R.resize);

  // ---------- storage ----------
  const store = {
    get(k, d) { try { const v = localStorage.getItem('lanternfall.' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('lanternfall.' + k, JSON.stringify(v)); } catch (e) {} },
  };
  let progress = store.get('progress', {});
  let customs = store.get('custom', []);
  // Hardcore: every lantern is removed, so the door starts open and there are no checkpoints,
  // and water turns to lava wherever the level can be finished without swimming.
  let hardcore = store.get('hardcore', false);
  let progressHC = store.get('progressHC', {});
  // Saves number the levels by position, and boss fights have been slotted in since: first
  // after every 10th level (save version 2), then giants halfway between (version 3). Move
  // each saved level from where it was in its save's numbering to where it is now (once).
  const levelsV = store.get('levelsV', 1);
  if (levelsV < 3) {
    const was = LF.LEVELS.map((lv, i) => i).filter(i => levelsV < 2 ? !LF.LEVELS[i].boss : !LF.LEVELS[i].giantFight);
    const move = book => Object.fromEntries(Object.entries(book).map(([k, v]) => [was[k] ?? k, v]));
    progress = move(progress); progressHC = move(progressHC);
    store.set('progress', progress); store.set('progressHC', progressHC); store.set('levelsV', 3);
  }

  // ---------- audio ----------
  let ac = null, muted = store.get('muted', false);
  const initAudio = () => {
    if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; } }
    if (ac && ac.state === 'suspended') ac.resume();
  };
  function tone(f1, f2, dur, type = 'square', vol = .05, delay = 0) {
    if (!ac || muted) return;
    const t0 = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f1, t0); o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t0 + dur);
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
    o.connect(g).connect(ac.destination); o.start(t0); o.stop(t0 + dur + .02);
  }
  const SFX = {
    jump: () => tone(420, 760, .09, 'square', .03),
    land: () => tone(160, 90, .06, 'triangle', .05),
    light: () => { tone(880, 880, .18, 'triangle', .06); tone(1320, 1320, .3, 'triangle', .05, .07); },
    stomp: () => tone(260, 70, .14, 'square', .06),
    die: () => tone(340, 50, .4, 'sawtooth', .05),
    spring: () => tone(300, 1200, .2, 'triangle', .05),
    crumble: () => tone(120, 50, .15, 'sawtooth', .03),
    spit: () => tone(700, 200, .12, 'sawtooth', .02),
    hop: () => tone(200, 380, .08, 'sine', .04),
    drop: () => tone(900, 300, .15, 'sine', .03),
    shoot: () => { tone(900, 200, .08, 'square', .04); tone(160, 60, .08, 'sawtooth', .03); },
    empty: () => tone(200, 180, .05, 'square', .02),
    zap: () => { tone(600, 80, .2, 'sawtooth', .04); tone(1200, 300, .12, 'square', .02, .02); },
    ammotick: () => tone(1100 + Math.random() * 300, 1500, .04, 'square', .02),
    ammo: () => { tone(500, 700, .06, 'square', .03); tone(700, 900, .06, 'square', .03, .05); },
    bigammo: () => [500, 630, 750, 1000].forEach((f, i) => tone(f, f, .1, 'square', .03, i * .05)),
    blink: () => tone(1500, 1500, .03, 'sine', .015),
    key: () => [660, 880, 1320].forEach((f, i) => tone(f, f, .12, 'triangle', .05, i * .06)),
    unlock: () => { tone(300, 600, .15, 'square', .03); tone(900, 900, .2, 'triangle', .04, .1); },
    gatepop: () => tone(500 + Math.random() * 300, 200, .06, 'square', .015),
    growl: () => { tone(70, 45, .5, 'sawtooth', .05); tone(95, 60, .45, 'triangle', .04, .05); },
    slam: () => { tone(120, 40, .25, 'sawtooth', .06); tone(80, 30, .3, 'triangle', .06); },
    buzz: () => tone(220, 260, .3, 'sawtooth', .02),
    bow: () => tone(600, 250, .1, 'triangle', .03),
    clank: () => { tone(1400, 900, .08, 'square', .03); tone(300, 200, .1, 'triangle', .04); },
    flop: () => { tone(260, 120, .08, 'triangle', .04); tone(200, 90, .1, 'triangle', .03, .09); },
    award: () => [784, 988, 1175, 1568].forEach((f, i) => tone(f, f, .16, 'triangle', .045, i * .07)),
    rocket: () => { tone(220, 900, .12, 'sawtooth', .035); tone(120, 60, .15, 'square', .03); },
    lob: () => tone(500, 260, .12, 'triangle', .04),
    pop: () => { tone(220, 60, .18, 'sawtooth', .05); tone(900, 200, .08, 'square', .02); },
    boom: () => { tone(160, 30, .5, 'sawtooth', .07); tone(80, 25, .6, 'square', .05, .02); tone(1200, 200, .15, 'triangle', .03); },
    bubble: () => tone(180, 520, .15, 'sine', .035),
    leap: () => tone(400, 800, .12, 'sine', .03),
    snort: () => tone(140, 90, .2, 'sawtooth', .04),
    roar: () => { tone(90, 50, .7, 'sawtooth', .07); tone(140, 70, .6, 'square', .03, .05); },
    bossdown: () => [400, 300, 500, 700, 1000].forEach((f, i) => tone(f, f * 1.2, .16, 'square', .04, i * .09)),
    splash: () => tone(500, 120, .18, 'sine', .04),
    swim: () => tone(300, 520, .1, 'sine', .035),
    walljump: () => tone(360, 680, .08, 'square', .03),
    djump: () => { tone(520, 980, .1, 'triangle', .04); tone(780, 1400, .08, 'sine', .03, .04); },
    fruit: () => { tone(660, 990, .1, 'triangle', .05); tone(990, 1480, .14, 'triangle', .04, .06); },
    shield: () => { tone(900, 300, .25, 'triangle', .05); tone(1200, 400, .2, 'sine', .03, .03); },
    door: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, f, .22, 'triangle', .05, .25 + i * .08)),
    clear: () => [392, 523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, f, .3, 'triangle', .05, i * .07)),
  };

  // ---------- state ----------
  let screen = 'title', W = null, playDef = null, playCtx = null;
  const cam = { x: 0, y: 0, zoom: 1 };
  const input = { left: false, right: false, jump: false, down: false, jumpPressed: false, fire: false, firePressed: false, rocket: false, rocketPressed: false, grenade: false, grenadePressed: false, big: false };
  let attract = LF.createWorld(LF.LEVELS[0]);
  let story = { time: 0, falls: 0 };

  const app = { canvas: cvs, renderer: R };
  const editor = LF.createEditor(app);

  function setVisible({ hud = false, overlay = false, select = false, touch = false, map = false }) {
    $('hud').hidden = !hud; $('overlay').hidden = !overlay; $('select').hidden = !select; $('touch').hidden = !touch; $('map').hidden = !map;
    if (screen !== 'editor' && editor.active) editor.close();
  }
  function card(html) {
    $('card').innerHTML = html;
    for (const b of $('card').querySelectorAll('[data-act]')) b.addEventListener('click', () => { initAudio(); ACTIONS[b.dataset.act](b.dataset); });
    const first = $('card').querySelector('.go');
    if (first) first.focus({ preventScroll: true });
  }
  let flashT = 0;
  const flash = app.flash = text => {
    const el = $('flash'); el.textContent = text; el.classList.add('show');
    clearTimeout(flashT); flashT = setTimeout(() => el.classList.remove('show'), 1800);
  };

  const shapeOf = def => {
    const h = def.map.length, w = def.map[0].length;
    return h > w * 1.2 ? 'upward' : w > h * 2.6 ? 'across' : 'up & across';
  };
  const nextStory = () => { const i = LF.LEVELS.findIndex((_, k) => !progress[k]); return i < 0 ? 0 : i; };

  // Remove every lantern, ammo crate and piece of fruit (each becomes empty space, or water if
  // it was underwater) and any starting ammo, then turn the water and anything swimming in it
  // into lava, unless the level needs swimming.
  // Shot doors (v, w, z) go too: with no ammo they could never open.
  const HARDCORE_GONE = new Set(['L', 'q', 'Q', '$', 'a', 'o', 'b', 'v', 'w', 'z']);
  function hardcoreDef(def) {
    const rows = LF.normalize(def.map).map(r => r.split(''));
    rows.forEach((r, y) => r.forEach((c, x) => { if (HARDCORE_GONE.has(c)) r[x] = rows[y - 1]?.[x] === '~' ? '~' : '.'; }));
    const water = { ...def, map: rows.map(r => r.join('')), player: { ...def.player, ammo: 0 }, noSpawnInv: true };
    const lava = { ...water, map: water.map.map(r => r.replace(/[~YUN]/g, '!')) };
    if (!lava.map.some((r, i) => r !== water.map[i])) return water;
    if (!LF.analyze(lava).ok && LF.analyze(water).ok) return { ...water, needsSwim: true };
    return lava;
  }

  // ---------- awards ----------
  function showAwards() {
    setVisible({ overlay: true });
    const { earned, total } = LF.awards.count();
    const items = LF.awards.list().map(a => `
      <li class="${a.earned ? 'won' : ''}">
        <i aria-hidden="true">${a.earned ? '★' : '☆'}</i>
        <div><b>${esc(a.name)}</b><small>${esc(a.desc)}</small>
        ${a.goal && !a.earned ? `<span class="bar"><span style="width:${Math.round(a.have / a.goal * 100)}%"></span></span><em>${a.have} / ${a.goal}</em>` : ''}</div>
      </li>`).join('');
    card(`
      <p class="eyebrow">${earned} of ${total} earned</p>
      <h2>Awards</h2>
      <p class="lede">Awards count in story levels. Random maps only earn Wanderer, and the editor only Architect.</p>
      <ul class="awards">${items}</ul>
      <div class="menu"><button class="go" data-act="menu">Back</button></div>`);
  }
  LF.awards.onEarn = () => SFX.award();
  LF.awards.sync({ storyLit: Object.keys(progress).length, hcLit: Object.keys(progressHC).length, first: !!progress[0] });

  // ---------- screens ----------
  // ---------- world map ----------
  // Every story level is a stop on a winding path, laid out world by world (see worlds.js).
  // Clearing a level opens the next one; a fork opens two; leaving by a secret exit also
  // opens a shortcut (a gold dashed line) further on. At the end of each world a cannon
  // fires the lamplighter to the start of the next. The lamplighter marks where you are:
  // arrow keys (or a click or tap) move along open stops, Enter plays, Shift+→ takes a
  // secret path you've found.
  let mapAt = Math.min(store.get('mapAt', 0), LF.LEVELS.length - 1);
  let secrets = store.get('secrets', {});
  let mapBusy = false;   // while the cannon's doing its thing
  const into = {};       // level index -> the levels whose forks or secret paths lead to it
  LF.LEVELS.forEach((lv, i) => {
    for (const t of lv.alsoUnlocks || []) (into[t] ||= []).push({ from: i, fork: true });
    if (lv.secretTo != null) (into[lv.secretTo] ||= []).push({ from: i, fork: false });
  });
  const unlocked = i => i === 0 || !!progress[i] || !!progress[i - 1] ||
    (into[i] || []).some(({ from, fork }) => fork ? progress[from] : secrets[from]);
  const COLS = 8, CW = 104, RH = 100, PAD = 70;
  const stopR = lv => lv.finalFight ? 22 : lv.boss ? 17 : 12;

  // Where everything goes: each world starts a new block of rows under its title, snaking
  // back and forth; its cannon sits one step past its last stop.
  let layout = null;
  function mapLayout() {
    if (layout) return layout;
    const pos = [], worlds = [], right = PAD + (COLS - 1) * CW;
    let y = PAD + 80;
    LF.WORLDS.forEach((wd, k) => {
      const top = y - 100;
      let row = 0;
      for (let i = wd.first, c = 0; i <= wd.last; i++, c++) {
        if (c === COLS) { c = 0; row++; y += RH; }
        pos[i] = { x: PAD + (row % 2 ? COLS - 1 - c : c) * CW, y, row };
      }
      const last = pos[wd.last], dir = last.row % 2 ? -1 : 1, cx = last.x + dir * CW;
      const cannon = k === LF.WORLDS.length - 1 ? null : cx >= PAD && cx <= right ? { x: cx, y: last.y, dir } : { x: last.x, y: last.y + RH * .7, dir };
      worlds.push({ top, bottom: (cannon ? Math.max(cannon.y, y) : y) + 50, cannon });
      y = (cannon ? Math.max(cannon.y, y) : y) + RH + 90;
    });
    return layout = { pos, worlds, w: PAD * 2 + (COLS - 1) * CW, h: y - RH - 90 + PAD + 20 };
  }
  const arcPoint = (a, b, u) => {
    const mx = (a.x + b.x) / 2, my = Math.min(a.y, b.y) - 170;
    return { x: (1 - u) * (1 - u) * a.x + 2 * (1 - u) * u * mx + u * u * b.x, y: (1 - u) * (1 - u) * a.y + 2 * (1 - u) * u * my + u * u * b.y };
  };
  const markerSvg = '<path d="M-7 14 L0 -2 L7 14 Z" fill="#D9D0F0"/><circle cy="-6" r="5" fill="#D9D0F0"/><line x1="6" y1="0" x2="12" y2="-12" stroke="#8F81AB" stroke-width="2"/><circle cx="12" cy="-15" r="3.5" fill="#FFB547"/>';

  function showMap() {
    screen = 'map';
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    attract = LF.createWorld(LF.LEVELS[0]);
    LF.followCamera(attract, cam, 0, true);
    setVisible({ map: true });
    renderMap(true);
    // Just finished a world? Into the cannon.
    const k = store.get('launch', null);
    if (k != null && LF.WORLDS[k + 1]) { store.set('launch', null); launch(k); }
  }

  function renderMap(scroll) {
    const L = LF.LEVELS, n = L.length, { pos, worlds, w, h } = mapLayout();
    let out = '';
    // The worlds: a tinted region each, with its name.
    worlds.forEach((wl, k) => {
      out += `<rect class="world${k % 2 ? ' alt' : ''}" x="12" y="${wl.top}" width="${w - 24}" height="${wl.bottom - wl.top}" rx="18"/>`;
      out += `<text class="wname" x="${PAD - 30}" y="${wl.top + 34}">World ${k + 1} · ${esc(LF.WORLDS[k].name)}</text>`;
    });
    // The path within each world, lit up to the furthest stop you can reach.
    for (let i = 0; i < n - 1; i++) {
      if (L[i].world !== L[i + 1].world) continue;
      const a = pos[i], b = pos[i + 1], cls = unlocked(i + 1) ? 'seg open' : 'seg';
      if (a.y === b.y) out += `<line class="${cls}" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/>`;
      else { const side = a.x > w / 2 ? 1 : -1; out += `<path class="${cls}" d="M${a.x} ${a.y} C${a.x + side * 60} ${a.y} ${b.x + side * 60} ${b.y} ${b.x} ${b.y}"/>`; }
    }
    // Forks: a short arc over the path to the stop after next.
    L.forEach((lv, i) => {
      for (const t of lv.alsoUnlocks || []) {
        const a = pos[i], b = pos[t], mx = (a.x + b.x) / 2, my = Math.min(a.y, b.y) - 46;
        out += `<path class="fork${progress[i] ? ' open' : ''}" d="M${a.x} ${a.y} Q${a.y === b.y ? mx : a.x + (a.x > w / 2 ? 90 : -90)} ${a.y === b.y ? my : (a.y + b.y) / 2} ${b.x} ${b.y}"/>`;
      }
    });
    // Each world's cannon, aimed along the dotted arc to the next world's first stop.
    worlds.forEach((wl, k) => {
      const c = wl.cannon;
      if (!c) return;
      const to = pos[LF.WORLDS[k + 1].first], d = to.x < c.x ? -1 : 1, open = unlocked(LF.WORLDS[k + 1].first);
      let arc = `M${c.x} ${c.y}`;
      for (let u = .05; u <= 1.001; u += .05) { const q = arcPoint(c, to, u); arc += ` L${q.x.toFixed(1)} ${q.y.toFixed(1)}`; }
      out += `<path class="arc${open ? ' open' : ''}" d="${arc}"/>`;
      out += `<g class="cannon" data-world="${k}" transform="translate(${c.x} ${c.y})">
        <g class="barrel" transform="rotate(${d < 0 ? -140 : -40})"><rect x="-4" y="-9" width="34" height="18" rx="5"/><rect class="rim" x="26" y="-11" width="8" height="22" rx="3"/></g>
        <circle class="wheel" r="11"/><circle class="hub" r="4"/></g>`;
    });
    // Secret shortcuts you've found.
    for (const j of Object.keys(secrets)) {
      const t = L[j] && L[j].secretTo;
      if (t == null) continue;
      const a = pos[+j], b = pos[t];
      out += `<path class="warp" d="M${a.x} ${a.y} Q${(a.x + b.x) / 2 + 90} ${(a.y + b.y) / 2} ${b.x} ${b.y}"/>`;
    }
    // Chapter names where each chapter starts, run the way the path goes (unless that's
    // off the edge) and clear of the lamplighter. (Ones that collide are moved below.)
    L.forEach((lv, i) => {
      if (i && L[i - 1].chapter === lv.chapter) return;
      const p = pos[i], forward = p.row % 2 === 0, right = p.x < 230 || (forward && p.x < w - 230);
      out += `<text class="ch" x="${p.x + (right ? 22 : -22)}" y="${p.y - 30}" text-anchor="${right ? 'start' : 'end'}">${roman(chapterIndex(i))} · ${esc(lv.chapter)}</text>`;
    });
    // The stops: dim if locked, outlined if open, lit if cleared. A star marks a secret exit
    // you've found; a blue ? one still hiding in a level you've cleared.
    L.forEach((lv, i) => {
      const p = pos[i], r = stopR(lv);
      const cls = ['stop', !unlocked(i) ? 'locked' : progress[i] ? 'lit' : 'open', lv.boss ? 'boss' : '', i === mapAt ? 'at' : ''].join(' ');
      let badge = '';
      if (secrets[i]) badge = `<text class="badge found" x="${r}" y="${-r + 2}">★</text>`;
      else if (lv.secretTo != null && progress[i]) badge = `<text class="badge hint" x="${r}" y="${-r + 2}">?</text>`;
      out += `<g class="${cls}" data-i="${i}" transform="translate(${p.x} ${p.y})"><title>${i + 1}. ${esc(lv.name)}</title><circle r="${r}"/><text y="4">${i + 1}</text>${badge}</g>`;
    });
    // The lamplighter, standing over the current stop.
    const m = pos[mapAt], mr = stopR(L[mapAt]);
    out += `<g class="marker" transform="translate(${m.x} ${m.y - mr - 16})">${markerSvg}</g>`;
    $('map-board').innerHTML = `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="World map: ${n} levels in ${LF.WORLDS.length} worlds">${out}</svg>`;
    // A chapter name that runs into the one before it on its row drops under the path.
    const boxes = [];
    for (const t of $('map-board').querySelectorAll('.ch')) {
      const b = t.getBBox();
      if (boxes.some(o => Math.abs(o.y - b.y) < 2 && o.x < b.x + b.width + 10 && b.x < o.x + o.width + 10)) t.setAttribute('y', +t.getAttribute('y') + 68);
      boxes.push(t.getBBox());
    }
    for (const g of $('map-board').querySelectorAll('.stop')) g.addEventListener('click', () => {
      initAudio();
      if (mapBusy) return;
      const i = +g.dataset.i;
      if (!unlocked(i)) return flash('Clear the levels before it first');
      if (i === mapAt) ACTIONS.story({ i });
      else { mapAt = i; store.set('mapAt', i); renderMap(); }
    });
    const lit = Object.keys(progress).length, found = Object.keys(secrets).length, total = L.filter(lv => lv.secretTo != null).length;
    $('map-stats').textContent = `World ${L[mapAt].world + 1} of ${LF.WORLDS.length} · ${lit} of ${n} lit · secret exits ${found} of ${total}${hardcore ? ` · hardcore ${Object.keys(progressHC).length} lit` : ''}`;
    $('map-awards').textContent = `Awards · ${LF.awards.count().earned}/${LF.awards.count().total}`;
    $('map-hc').textContent = `Hardcore: ${hardcore ? 'on' : 'off'}`; $('map-hc').classList.toggle('hc-on', hardcore);
    mapInfo();
    if (scroll !== false) mapScroll(m.y, scroll === true);
  }
  // Keep a point (in map units) in view, centred if asked.
  function mapScroll(y, center) {
    const svg = $('map-board').querySelector('svg'), board = $('map-board');
    const k = svg.getBoundingClientRect().width / mapLayout().w, target = y * k - board.clientHeight / 2;
    if (center || Math.abs(board.scrollTop - target) > board.clientHeight * .35) board.scrollTop = target;
  }

  // The cannon: walk in, shrink inside, BOOM, tumble along the arc to the next world.
  function launch(k) {
    const { pos, worlds } = mapLayout(), c = worlds[k].cannon, from = pos[LF.WORLDS[k].last], dest = LF.WORLDS[k + 1].first, to = pos[dest];
    const svg = $('map-board').querySelector('svg'), marker = svg.querySelector('.marker'), cannon = svg.querySelector(`.cannon[data-world="${k}"]`);
    if (!c || !marker) return;
    mapBusy = true;
    let fired = false;
    const t0 = performance.now();
    const step = now => {
      const t = (now - t0) / 1000;
      let x, y, turn = 0, size = 1;
      if (t < .7) { const u = t / .7; x = from.x + (c.x - from.x) * u; y = from.y + (c.y - from.y) * u - 28; }
      else if (t < 1.1) { x = c.x; y = c.y - 28 + (t - .7) / .4 * 20; size = 1 - (t - .7) / .4 * .8; }
      else if (t < 2.3) {
        if (!fired) {
          fired = true; SFX.boom(); cannon.classList.add('fire');
          for (let s = 0; s < 6; s++) svg.insertAdjacentHTML('beforeend', `<circle class="puff" cx="${c.x + (Math.random() - .5) * 40}" cy="${c.y - 20 - Math.random() * 30}" r="${8 + Math.random() * 10}"/>`);
        }
        const u = (t - 1.1) / 1.2, q = arcPoint(c, to, u);
        x = q.x; y = q.y - 28; turn = u * 720; size = .6 + Math.sin(u * Math.PI) * .6;
      } else { x = to.x; y = to.y - 28; }
      marker.setAttribute('transform', `translate(${x} ${y}) rotate(${turn}) scale(${size})`);
      mapScroll(y, false);
      if (t < 2.4) return requestAnimationFrame(step);
      mapBusy = false;
      mapAt = dest; store.set('mapAt', dest);
      renderMap();
      flash(`World ${k + 2} · ${LF.WORLDS[k + 1].name}`);
    };
    requestAnimationFrame(step);
  }

  function mapInfo() {
    const L = LF.LEVELS, lv = L[mapAt], p = progress[mapAt], hc = progressHC[mapAt];
    const secret = lv.secretTo == null ? '' : secrets[mapAt] ? ' · secret exit found ★' : p ? ' · a secret exit hides here' : '';
    const fork = lv.alsoUnlocks ? ' · a fork: opens two ways on' : '';
    $('map-info').innerHTML = `<div>
        <small>World ${lv.world + 1} · chapter ${roman(chapterIndex(mapAt))} · ${esc(lv.chapter)} · level ${mapAt + 1} · key ${levelKey(lv.name)}</small>
        <strong>${esc(lv.name)}</strong>
        <em>${lv.boss ? 'boss fight · ' : ''}${p ? 'best ' + fmt(p.best) : 'not yet lit'}${hc ? ` · hardcore ${fmt(hc.best)}` : ''}${fork}${secret}</em>
      </div>
      <div class="map-actions">
        <button class="go" data-act="story" data-i="${mapAt}">Play</button>
        ${secrets[mapAt] ? `<button class="mini" data-act="warp" data-i="${mapAt}">Secret path → ${esc(L[lv.secretTo].name)}</button>` : ''}
        <button class="mini" data-act="copyStory" data-i="${mapAt}">Copy to editor</button>
      </div>`;
    for (const b of $('map-info').querySelectorAll('[data-act]')) b.addEventListener('click', () => { initAudio(); if (!mapBusy) ACTIONS[b.dataset.act](b.dataset); });
  }
  for (const b of $('map').querySelectorAll('.map-nav [data-act]')) b.addEventListener('click', () => { initAudio(); if (!mapBusy) ACTIONS[b.dataset.act](b.dataset); });
  // Chapter names are measured to keep them apart, so lay the map out again once the
  // web fonts (which are wider than the fallback) have loaded.
  if (document.fonts) document.fonts.ready.then(() => { if (screen === 'map' && !mapBusy) renderMap(false); });

  // Move the lamplighter to stop i if it's open.
  function mapMove(i) {
    if (mapBusy || i < 0 || i >= LF.LEVELS.length || !unlocked(i)) return;
    mapAt = i; store.set('mapAt', i); renderMap();
  }

  function showHelp() {
    screen = 'help';
    setVisible({ overlay: true });
    card(`
      <p class="eyebrow">How to play</p>
      <h2>Light every lamp</h2>
      <p class="lede">Night is falling on the old town. Light every lantern to open each door: across the rooftops, up the belfry, down through the kilns and into the Hollow Spire. On the map, each level you clear opens the next; some hide a secret exit that opens a shortcut further on.</p>
      <ul class="keys">
        <li>Map: <kbd>←</kbd><kbd>→</kbd> move · <kbd>Enter</kbd> play · <kbd>Shift</kbd>+<kbd>→</kbd> take a secret path you've found</li>
        <li><kbd>←</kbd><kbd>→</kbd> walk · <kbd>Space</kbd> jump (hold for height) · <kbd>↓</kbd> drop through planks</li>
        <li>Push into a wall to slide down it · jump off walls to climb</li>
        <li><kbd>E</kbd> fire: tap for one shot, hold for autofire; shots splash 1 block · <kbd>X</kbd> explosive round (2 ammo, 3-block blast) · every shot counts as one hit (a grenade one per blast, up to three), so golems take 3 and TNT carts 5; a TNT blast kills everything near it · <kbd>Q</kbd> bouncing grenade (3 ammo) · hold any of them to keep firing · hold <kbd>Shift</kbd> for a big shot: 2× size and blast, 2× ammo · ammo crates are hidden through each level; big crates hold 10, huge ones 25; enemies drop 1–5 ammo when killed, more for tougher ones (TNT carts drop none)</li>
        <li>Keys open the locked-door blocks you touch, one block at a time; you keep the key</li>
        <li>Water is safe: you sink slowly and can jump as often as you like</li>
        <li>Fruit: 🍎 shield · 🍊 jump boost · 🍌 double jump</li>
        <li><kbd>R</kbd> give up (back to last lantern) · <kbd>Shift</kbd>+<kbd>R</kbd> restart level · <kbd>Esc</kbd> pause · <kbd>M</kbd> sound ${muted ? 'off' : 'on'}</li>
      </ul>
      ${hardcore ? '<p class="lede hc-note">Hardcore is on: no lanterns, no ammo, no fruit, no invincibility after respawning. The door is already open, but there are no checkpoints: every fall sends you back to the start, in the dark. Water turns to lava.</p>' : ''}
      <div class="menu"><button class="go" data-act="menu">Back to the map</button></div>`);
  }

  // Your own saved levels (the story levels live on the map).
  function showYours() {
    screen = 'select';
    setVisible({ select: true });
    let html = '';
    html += `<section class="chapter"><h3><span>Workshop</span>Saved in this browser</h3>` + (customs.length
      ? `<ul class="customs">${customs.map(c => `<li><div><strong>${esc(c.name)}</strong><small>${c.map[0].length}×${c.map.length} · ${shapeOf(c)} · key <span class="lvl-key">${customKey(c)}</span></small></div>
          <span><button class="mini go-mini" data-act="custom" data-id="${c.id}">Play</button><button class="mini" data-act="editCustom" data-id="${c.id}">Edit</button><button class="mini danger" data-act="deleteCustom" data-id="${c.id}">Delete</button></span></li>`).join('')}</ul>`
      : `<p class="empty">Nothing saved yet. Build one in the editor, or generate a random map and save it.</p>`) + `</section>`;
    $('sel-body').innerHTML = html;
    for (const b of $('sel-body').querySelectorAll('[data-act]')) b.addEventListener('click', () => { initAudio(); ACTIONS[b.dataset.act](b.dataset); });
  }

  function hudLabel() {
    return hudLabelBase() + (hardcore && playCtx.kind !== 'test' ? ' · Hardcore' : '');
  }
  function hudLabelBase() {
    if (playCtx.kind === 'story') return `Chapter ${roman(chapterIndex(playCtx.index))} · Level ${playCtx.index + 1} of ${LF.LEVELS.length} · key ${levelKey(LF.LEVELS[playCtx.index].name)}`;
    if (playCtx.kind === 'random') return `Random · ${playCtx.opts.shape === 'mixed' ? 'up & across' : playCtx.opts.shape === 'up' ? 'upward' : 'across'} · seed ${playCtx.opts.seed}`;
    if (playCtx.kind === 'test') return 'Test play · Esc to edit';
    if (playCtx.kind === 'shared') return 'Shared level';
    const key = keyFor(playCtx);
    return key ? `Your level · key ${key}` : 'Your level';
  }
  const chapterIndex = i => { const names = [...new Set(LF.LEVELS.map(l => l.chapter))]; return names.indexOf(LF.LEVELS[i].chapter); };

  function play(def, ctx) {
    playDef = def; playCtx = ctx;
    if (ctx.kind !== 'shared') setHash(keyFor(ctx));
    W = LF.createWorld(hardcore && ctx.kind !== 'test' ? hardcoreDef(def) : def);
    for (const k in input) input[k] = false;
    syncBig(false);
    LF.followCamera(W, cam, 0, true);
    screen = 'play';
    setVisible({ hud: true, touch: true });
    $('hud-num').textContent = hudLabel();
    $('hud-name').textContent = W.name;
    hudCache = '';
    flash(W.def.needsSwim ? `${W.name} · no lava here: you have to swim` : W.name);
  }
  app.play = play;

  function pause() {
    if (screen !== 'play') return;
    screen = 'paused';
    setVisible({ hud: true, overlay: true });
    const lit = W.lanterns.filter(l => l.lit).length;
    card(`
      <p class="eyebrow">${esc(hudLabel())}</p>
      <h2>Paused</h2>
      <p class="lede">${esc(W.name)} · ${lit} of ${W.total} lanterns lit · ${fmt(W.time)}</p>
      ${keyFor(playCtx) ? `<p class="lede">Level key <b class="lvl-key">${keyFor(playCtx)}</b> · <span class="key-link">${esc(keyLink(keyFor(playCtx)))}</span>${playCtx.kind === 'custom' ? '<br><small>Your own levels’ keys only work in this browser. To share one, use Copy play link in the editor’s Share code.</small>' : ''}</p>` : ''}
      <div class="menu">
        <button class="go" data-act="resume">Resume</button>
        <button class="alt" data-act="restart">Restart level</button>
        ${playCtx.kind === 'test' ? '<button class="alt" data-act="backToEditor">Back to editor</button>' : ''}
        ${playCtx.kind === 'random' ? '<button class="alt" data-act="editRandom">Open in editor</button>' : ''}
        ${playCtx.kind !== 'test' ? '<button class="alt" data-act="copyToEditor">Copy to editor</button>' : ''}
        <button class="alt" data-act="menu">Back to the map</button>
      </div>`);
  }

  function cleared() {
    screen = 'clear';
    setVisible({ hud: true, overlay: true });
    const t = W.time, falls = W.falls;
    let eyebrow = 'Every lamp lit', title = W.name, stats = '', buttons = '';
    const tally = (extra = '') => `<dl class="tally"><div><dt>Time</dt><dd>${fmt(t)}</dd></div><div><dt>Falls</dt><dd>${falls}</dd></div>${extra}</dl>`;
    if (playCtx.kind === 'story') {
      // Hardcore runs keep their own best times; a hardcore clear also counts the level as lit.
      const book = hardcore ? progressHC : progress, i = playCtx.index, prev = book[i], wasLit = !!progress[i];
      const isBest = !prev || t < prev.best;
      if (isBest) { book[i] = { best: t, falls }; store.set(hardcore ? 'progressHC' : 'progress', book); }
      if (hardcore && !progress[i]) { progress[i] = { best: t, falls }; store.set('progress', progress); }
      LF.awards.clear({ kind: 'story', index: i, time: t, falls, hardcore, horde: !!W.horde, storyLit: Object.keys(progress).length, hcLit: Object.keys(progressHC).length });
      story.time += t; story.falls += falls;
      const last = i === LF.LEVELS.length - 1, secret = W.clearedBy === 'secret' && LF.LEVELS[i].secretTo != null;
      // On the map the lamplighter moves on: to the next level, or down the secret path.
      if (secret) { secrets[i] = true; store.set('secrets', secrets); }
      mapAt = secret ? LF.LEVELS[i].secretTo : Math.min(i + 1, LF.LEVELS.length - 1); store.set('mapAt', mapAt);
      // The first time you finish a world, the map fires you out of its cannon to the next.
      const world = LF.WORLDS[LF.LEVELS[i].world], worldDone = !secret && !wasLit && world.last === i && LF.WORLDS[LF.LEVELS[i].world + 1];
      if (worldDone) { store.set('launch', LF.LEVELS[i].world); mapAt = i; store.set('mapAt', i); }
      eyebrow = secret ? `Level ${i + 1} · secret exit found!` : `Level ${i + 1} of ${LF.LEVELS.length} · ${hardcore ? 'hardcore clear' : 'every lamp lit'}`;
      stats = tally(`<div class="best"><dt>${isBest ? 'New best' : 'Best'}</dt><dd>${fmt(isBest ? t : prev.best)}</dd></div>`);
      if (worldDone) {
        const next = LF.WORLDS[LF.LEVELS[i].world + 1];
        eyebrow = `World ${LF.LEVELS[i].world + 1} · ${world.name} · complete!`;
        stats += `<p class="lede">The lamplighter climbs into the cannon at the end of ${esc(world.name)}… next stop, World ${LF.LEVELS[i].world + 2}: ${esc(next.name)}.</p>`;
        buttons = `<button class="go" data-act="menu">Into the cannon!</button><button class="alt" data-act="restart">Replay</button><button class="alt" data-act="copyToEditor">Copy to editor</button>`;
      } else if (secret) {
        const to = LF.LEVELS[i].secretTo;
        stats += `<p class="lede">A secret path opens on the map, straight to level ${to + 1}: ${esc(LF.LEVELS[to].name)}.</p>`;
        buttons = `<button class="go" data-act="story" data-i="${to}">Take the secret path</button><button class="alt" data-act="menu">Back to the map</button><button class="alt" data-act="restart">Replay</button>`;
      } else if (last) {
        eyebrow = 'The whole town is lit'; title = 'Every lamp burns.';
        stats += `<p class="lede">All ${LF.LEVELS.length} levels done. The lamplighter goes home. Try the random maps, or build a level of your own.</p>`;
        buttons = `<button class="go" data-act="menu">Back to the map</button><button class="alt" data-act="random">Random map</button><button class="alt" data-act="copyToEditor">Copy to editor</button><button class="alt" data-act="editor">Level editor</button>`;
      } else {
        const nx = LF.LEVELS[i + 1];
        stats += `<p class="lede">Next: ${esc(nx.name)} · ${nx.map[0].length}×${nx.map.length}, ${shapeOf(nx)}.</p>`;
        buttons = `<button class="go" data-act="story" data-i="${i + 1}">Next level</button><button class="alt" data-act="menu">Back to the map</button><button class="alt" data-act="restart">Replay</button><button class="alt" data-act="copyToEditor">Copy to editor</button>`;
      }
    } else if (playCtx.kind === 'random') {
      LF.awards.clear({ kind: 'random', time: t, falls, hardcore, horde: !!W.horde });
      eyebrow = `Random map · seed ${playCtx.opts.seed}`; stats = tally();
      buttons = `<button class="go" data-act="rerollRandom">Another random map</button><button class="alt" data-act="saveRandom">Save to Your levels</button><button class="alt" data-act="editRandom">Open in editor</button><button class="alt" data-act="menu">Back to the map</button>`;
    } else if (playCtx.kind === 'test') {
      eyebrow = 'Test play · cleared'; stats = tally();
      buttons = `<button class="go" data-act="backToEditor">Back to editor</button><button class="alt" data-act="restart">Play again</button>`;
    } else if (playCtx.kind === 'shared') {
      eyebrow = 'Shared level · cleared'; stats = tally();
      buttons = `<button class="go" data-act="restart">Play again</button><button class="alt" data-act="editShared">Open in editor</button><button class="alt" data-act="menu">Back to the map</button>`;
    } else {
      LF.awards.clear({ kind: 'custom', time: t, falls, hardcore, horde: !!W.horde });
      eyebrow = 'Your level · cleared'; stats = tally();
      buttons = `<button class="go" data-act="restart">Play again</button><button class="alt" data-act="editCustom" data-id="${playCtx.id}">Edit</button><button class="alt" data-act="yours">Your levels</button>`;
    }
    card(`<p class="eyebrow">${esc(eyebrow)}</p><h2>${esc(title)}</h2>${stats}<div class="menu">${buttons}</div>`);
  }

  function openEditor(def) {
    setHash(null);
    screen = 'editor';
    setVisible({});
    editor.open(def);
  }

  // ---------- dialogs ----------
  let genFrom = 'menu';
  app.openGenerator = from => {
    genFrom = from;
    $('gen-seed').value = Math.floor(Math.random() * 1e6);
    $('gen-edit').textContent = from === 'editor' ? 'Replace editor map' : 'Open in editor';
    $('gen-dialog').showModal();
  };
  const genOpts = () => ({
    shape: $('gen-shape').value, size: $('gen-size').value,
    difficulty: +$('gen-diff').value, seed: Math.abs(parseInt($('gen-seed').value, 10)) || 1,
  });
  $('gen-reseed').addEventListener('click', () => { $('gen-seed').value = Math.floor(Math.random() * 1e6); });
  $('gen-play').addEventListener('click', () => {
    initAudio();
    const o = genOpts(); $('gen-dialog').close();
    play(LF.generate(o), { kind: 'random', opts: o });
  });
  $('gen-edit').addEventListener('click', () => {
    const o = genOpts(); $('gen-dialog').close();
    openEditor(LF.generate(o));
  });
  $('gen-cancel').addEventListener('click', () => $('gen-dialog').close());

  const encode = d => 'LF1:' + btoa(unescape(encodeURIComponent(JSON.stringify({ n: d.name, d: d.dark, m: d.map.join('/'), t: d.tuning, p: d.player }))));
  // Accepts an LF1: share code, or a raw map: lines of tiles like the editor's (P start, D door...).
  const decode = code => {
    const text = code.trim();
    const lines = text.split(/\r?\n|\//).map(l => l.trimEnd()).filter(l => l.length);
    if (!/^LF1:/.test(text) && lines.length > 1 && lines.join('').includes('P')) return { name: 'Pasted level', dark: .6, map: lines };
    const j = JSON.parse(decodeURIComponent(escape(atob(text.replace(/^LF1:/, '')))));
    if (!j.m) throw new Error('no map');
    return { name: j.n || 'Imported level', dark: typeof j.d === 'number' ? j.d : .6, map: j.m.split('/'), tuning: j.t, player: j.p };
  };
  // Every story level has a short, permanent key made from its name, e.g. K7QXM.
  // Typing the site address followed by #KEY opens that level.
  const KEY_ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const hashKey = (text, len) => {
    let h = 2166136261;
    for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
    let key = '';
    for (let k = 0; k < len; k++) { key += KEY_ABC[h % 32]; h = Math.floor(h / 32); }
    return key;
  };
  const levelKey = LF.levelKey = name => hashKey(name, 5);
  // Your own saved levels get 6-character keys (so they never clash with story keys).
  // They're stored in this browser, so the key only opens the level here.
  const customKey = c => hashKey('custom:' + c.id, 6);
  const keyFor = ctx => ctx.kind === 'story' ? levelKey(LF.LEVELS[ctx.index].name)
    : ctx.kind === 'custom' ? (customs.find(c => c.id === ctx.id) ? customKey(customs.find(c => c.id === ctx.id)) : null) : null;
  const siteBase = () => `${location.origin}${location.pathname.replace(/lanternfall\.html$/, '')}`;
  const keyLink = key => `${siteBase()}#${key}`;
  // Keep the address bar's #part in step with what's being played.
  const setHash = h => history.replaceState(null, '', location.pathname + location.search + (h ? '#' + h : ''));

  // A link that opens straight into a level: lanternfall.html#level=LF1:...  or  #KEY for a story level.
  const linkFor = d => `${location.origin}${location.pathname}#level=${encodeURIComponent(encode(d))}`;
  function openFromLink() {
    const k = location.hash.match(/^#([A-Za-z0-9]{5,6})$/);
    if (k) {
      const key = k[1].toUpperCase();
      const i = LF.LEVELS.findIndex(lv => levelKey(lv.name) === key);
      if (i >= 0) { play(LF.LEVELS[i], { kind: 'story', index: i }); return true; }
      const c = customs.find(x => customKey(x) === key);
      if (c) { play(c, { kind: 'custom', id: c.id }); return true; }
      flash(key.length === 6 ? `${key} is a level saved in someone else's browser — ask them for its play link` : `No level has the key ${key}`);
      return false;
    }
    const m = location.hash.match(/^#level=(.+)$/);
    if (!m) return false;
    try { play(decode(decodeURIComponent(m[1])), { kind: 'shared' }); return true; }
    catch (e) { flash('That level link could not be read'); return false; }
  }
  addEventListener('hashchange', () => { if (screen !== 'editor') openFromLink(); });
  app.openCode = d => {
    $('code-text').value = encode(d);
    $('code-msg').textContent = 'Copy this code or a play link to share your level. Paste someone else’s code (or a raw map) here and choose Load.';
    $('code-link').onclick = async () => {
      const url = linkFor(d);
      try { await navigator.clipboard.writeText(url); $('code-msg').textContent = 'Link copied. Anyone who opens it plays the level straight away.'; }
      catch (e) { $('code-text').value = url; $('code-text').select(); $('code-msg').textContent = 'Copy this link with ⌘C / Ctrl+C.'; }
    };
    $('code-dialog').showModal();
    $('code-text').select();
  };
  $('code-copy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText($('code-text').value); $('code-msg').textContent = 'Copied.'; }
    catch (e) { $('code-text').select(); $('code-msg').textContent = 'Select the text and copy it with ⌘C / Ctrl+C.'; }
  });
  $('code-load').addEventListener('click', () => {
    try { const raw = $('code-text').value.trim(), link = raw.match(/#level=(.+)$/); const d = decode(link ? decodeURIComponent(link[1]) : raw); $('code-dialog').close(); openEditor(d); flash('Level loaded'); }
    catch (e) { $('code-msg').textContent = 'That could not be read. Paste a whole LF1: code, a level link, or a raw map with a start (P).'; }
  });
  $('code-cancel').addEventListener('click', () => $('code-dialog').close());

  app.saveCustom = d => {
    LF.awards.saved();
    const id = d.id || 'c' + Date.now().toString(36);
    const rec = { id, name: d.name || 'Untitled', dark: d.dark, map: d.map, tuning: d.tuning, player: d.player, updated: Date.now() };
    const i = customs.findIndex(c => c.id === id);
    if (i >= 0) customs[i] = rec; else customs.unshift(rec);
    store.set('custom', customs);
    return rec;
  };
  app.menu = showMap;

  // ---------- actions ----------
  const ACTIONS = {
    story: d => { story = +d.i === 0 ? { time: 0, falls: 0 } : story; play(LF.LEVELS[+d.i], { kind: 'story', index: +d.i }); },
    select: showMap,
    yours: showYours,
    help: showHelp,
    // Follow a secret path you've found: the lamplighter goes to the level it leads to.
    warp: d => { const t = LF.LEVELS[+(d.i ?? mapAt)].secretTo; if (t != null) { mapAt = t; store.set('mapAt', t); showMap(); } },
    random: () => app.openGenerator('menu'),
    editor: () => openEditor(),
    menu: showMap,
    awards: showAwards,
    toggleHardcore: () => { hardcore = !hardcore; store.set('hardcore', hardcore); renderMap(false); flash(hardcore ? 'Hardcore on' : 'Hardcore off'); },
    resume: () => { screen = 'play'; setVisible({ hud: true, touch: true }); },
    restart: () => play(playDef, playCtx),
    backToEditor: () => { screen = 'editor'; setVisible({}); editor.resume(); },
    editRandom: () => openEditor({ ...playDef }),
    rerollRandom: () => { const o = { ...playCtx.opts, seed: Math.floor(Math.random() * 1e6) }; play(LF.generate(o), { kind: 'random', opts: o }); },
    saveRandom: () => { app.saveCustom({ ...playDef }); flash('Saved to Your levels'); },
    custom: d => { const c = customs.find(x => x.id === d.id); if (c) play(c, { kind: 'custom', id: c.id }); },
    editShared: () => { history.replaceState(null, '', location.pathname); openEditor({ ...playDef }); },
    // Open a copy of any level in the editor (saved as a new level of your own).
    copyToEditor: () => openEditor({ ...playDef, name: `${playDef.name} (copy)`, id: null }),
    copyStory: d => { const lv = LF.LEVELS[+d.i]; openEditor({ ...lv, name: `${lv.name} (copy)`, id: null }); },
    editCustom: d => { const c = customs.find(x => x.id === d.id); if (c) openEditor({ ...c }); },
    deleteCustom: d => {
      const c = customs.find(x => x.id === d.id);
      if (!c || !confirm(`Delete “${c.name}”? This can’t be undone.`)) return;
      customs = customs.filter(x => x.id !== d.id); store.set('custom', customs); showYours();
    },
  };
  $('sel-back').addEventListener('click', showMap);

  // ---------- input ----------
  const KEYMAP = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'jump', KeyW: 'jump', Space: 'jump', KeyZ: 'jump', ArrowDown: 'down', KeyS: 'down', KeyE: 'fire', KeyF: 'fire', KeyX: 'rocket', KeyQ: 'grenade' };
  // Big shots: hold Shift, or on a phone tap BIG to switch them on until tapped again.
  let bigLock = false;
  const syncBig = shift => { input.big = shift || bigLock; };
  addEventListener('keydown', e => {
    syncBig(e.shiftKey);
    if (e.target.closest && e.target.closest('input, textarea, select, dialog')) return;
    // Leave browser and OS shortcuts (⌘W, ⌘T, ⌘R…) alone.
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (screen === 'editor') { if (e.code === 'Escape') showMap(); return; }
    const k = KEYMAP[e.code];
    if (screen === 'play') {
      if (k) {
        e.preventDefault();
        if (k === 'jump' && !input.jump && !e.repeat) input.jumpPressed = true;
        if ((k === 'fire' || k === 'rocket' || k === 'grenade') && !input[k] && !e.repeat) input[k + 'Pressed'] = true;
        input[k] = true;
      }
      // R is instant death: respawn at the last lit lantern. Shift+R restarts the whole level.
      if (e.code === 'KeyR' && !e.repeat) { if (e.shiftKey) ACTIONS.restart(); else LF.kill(W); }
      if (e.code === 'Escape' && playCtx.kind === 'test') ACTIONS.backToEditor();
      else if (e.code === 'Escape' || e.code === 'KeyP') pause();
      if (e.code === 'KeyM') { muted = !muted; store.set('muted', muted); flash(muted ? 'Sound off' : 'Sound on'); }
      initAudio();
      return;
    }
    if (screen === 'paused' && (e.code === 'Escape' || e.code === 'KeyP')) { ACTIONS.resume(); return; }
    if (screen === 'select' && e.code === 'Escape') { showMap(); return; }
    if (screen === 'map') {
      if (mapBusy) { e.preventDefault(); return; }
      if (e.code === 'ArrowRight' && e.shiftKey && secrets[mapAt]) { e.preventDefault(); ACTIONS.warp({ i: mapAt }); return; }
      if (e.code === 'ArrowLeft' || e.code === 'ArrowUp' || e.code === 'KeyA' || e.code === 'KeyW') { e.preventDefault(); mapMove(mapAt - 1); return; }
      if (e.code === 'ArrowRight' || e.code === 'ArrowDown' || e.code === 'KeyD' || e.code === 'KeyS') { e.preventDefault(); mapMove(mapAt + 1); return; }
      if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); initAudio(); ACTIONS.story({ i: mapAt }); return; }
    }
    if (k === 'jump' || e.code === 'Space') e.preventDefault();
  });
  addEventListener('keyup', e => { syncBig(e.shiftKey); const k = KEYMAP[e.code]; if (k) input[k] = false; });
  addEventListener('blur', () => { for (const k in input) input[k] = false; syncBig(false); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && screen === 'play') pause(); });

  function bindTouch(id, k) {
    const el = $(id);
    const on = e => { e.preventDefault(); initAudio(); if (k === 'jump' && !input.jump) input.jumpPressed = true; if ((k === 'fire' || k === 'rocket' || k === 'grenade') && !input[k]) input[k + 'Pressed'] = true; input[k] = true; el.classList.add('on'); };
    const off = e => { e.preventDefault(); input[k] = false; el.classList.remove('on'); };
    el.addEventListener('pointerdown', on); el.addEventListener('pointerup', off);
    el.addEventListener('pointercancel', off); el.addEventListener('pointerleave', off);
  }
  bindTouch('t-left', 'left'); bindTouch('t-right', 'right'); bindTouch('t-jump', 'jump'); bindTouch('t-down', 'down'); bindTouch('t-fire', 'fire'); bindTouch('t-rocket', 'rocket'); bindTouch('t-grenade', 'grenade');
  $('t-pause').addEventListener('click', () => pause());
  $('t-big').addEventListener('pointerdown', e => {
    e.preventDefault(); initAudio();
    bigLock = !bigLock; syncBig(false);
    e.currentTarget.classList.toggle('on', bigLock); e.currentTarget.setAttribute('aria-pressed', bigLock);
  });

  // ---------- HUD ----------
  let hudCache = '';
  function hud() {
    const lit = W.lanterns.filter(l => l.lit).length, open = W.door && W.door.open;
    const p = W.player;
    const boss = W.enemies.find(e => e.alive && e.awake && LF.isBoss(e));
    const key = `${lit}|${Math.floor(W.time * 10)}|${W.falls}|${open}|${p.shield}|${Math.ceil(p.boost)}|${Math.ceil(p.dbl)}|${p.ammo}|${JSON.stringify(p.keys)}|${boss ? boss.type + boss.hp : ''}`;
    if (key === hudCache) return;
    hudCache = key;
    // With no lanterns (a boss arena, or Hardcore) the door is all there is to show.
    $('hud-lamps-label').textContent = open || !W.total ? 'Door' : 'Lanterns';
    $('hud-lamps').textContent = open ? 'open' : W.total ? `${lit}/${W.total}` : 'shut';
    $('hud-lamps-wrap').className = open ? 'open' : 'lamps';
    $('hud-time').textContent = fmt(W.time);
    $('hud-falls').textContent = W.falls;
    $('hud-ammo').textContent = p.ammo;
    const held = Object.keys(p.keys);
    $('hud-keys-wrap').hidden = !held.length;
    $('hud-keys').innerHTML = held.map(k => `<i style="color:${LF.KEYS[k].color}">${LF.KEYS[k].name.split(' ')[0]}</i>`).join('');
    $('hud-ammo-wrap').className = p.ammo ? 'ammo' : 'ammo empty';
    const powers = [];
    if (p.shield) powers.push('<i class="pw-a">Shield</i>');
    if (p.boost > 0) powers.push(`<i class="pw-o">Boost ${Math.ceil(p.boost)}</i>`);
    if (p.dbl > 0) powers.push(`<i class="pw-b">Double ${Math.ceil(p.dbl)}</i>`);
    $('hud-powers-wrap').hidden = !powers.length;
    $('hud-powers').innerHTML = powers.join('');
    $('boss-bar').hidden = !boss;
    if (boss) {
      $('boss-name').textContent = LF.ENEMIES[boss.type].name;
      $('boss-fill').style.width = `${boss.hp / boss.maxHp * 100}%`;
    }
  }

  // ---------- loop ----------
  let last = performance.now(), acc = 0, clearTimer = 0;
  function frame(now) {
    const dt = Math.min(.1, (now - last) / 1000); last = now;
    if (screen === 'editor') editor.frame(dt);
    else if (W && (screen === 'play' || screen === 'paused' || screen === 'clear')) {
      if (screen !== 'paused') {
        acc += dt;
        while (acc >= STEP) { LF.step(W, input, STEP, true); acc -= STEP; }
      }
      for (const ev of W.events) {
        if (SFX[ev.type]) SFX[ev.type]();
        // Awards only count in story levels (random maps have their own award; the editor only Architect).
        if (playCtx.kind === 'story') LF.awards.event(ev);
        if (ev.type === 'door') flash('The door is open');
        if (ev.type === 'clear') clearTimer = .7;
      }
      W.events.length = 0;
      if (clearTimer > 0 && screen === 'play') { clearTimer -= dt; if (clearTimer <= 0) cleared(); }
      LF.followCamera(W, cam, dt);
      R.render(W, cam, {}, dt);
      hud();
    } else {
      acc += dt;
      while (acc >= STEP) { LF.step(attract, input, STEP, false); acc -= STEP; }
      attract.events.length = 0;
      LF.followCamera(attract, cam, dt);
      R.render(attract, cam, {}, dt);
    }
    requestAnimationFrame(frame);
  }

  function start(data) {
    try { window.claude?.hot?.snapshot?.(() => ({ screen, ctx: playCtx && playCtx.kind === 'story' ? playCtx : null })); } catch (e) {}
    if (data && data.ctx && data.ctx.kind === 'story' && LF.LEVELS[data.ctx.index]) play(LF.LEVELS[data.ctx.index], data.ctx);
    else if (!openFromLink()) showMap();
    requestAnimationFrame(frame);
  }
  window.claude?.hot?.ready ? window.claude.hot.ready(start) : start(window.claude?.hot?.data ?? {});
})();
