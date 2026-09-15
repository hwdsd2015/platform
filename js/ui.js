// Lanternfall app: menus, play loop, HUD, storage, audio.
(() => {
  const LF = window.LF;
  const $ = id => document.getElementById(id);
  const STEP = 1 / 120;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = t => { const m = Math.floor(t / 60), s = t - m * 60; return `${m}:${s < 10 ? '0' : ''}${s.toFixed(1)}`; };
  const ROMAN = ['I', 'II', 'III', 'IV', 'V'];

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
    door: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, f, .22, 'triangle', .05, .25 + i * .08)),
    clear: () => [392, 523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, f, .3, 'triangle', .05, i * .07)),
  };

  // ---------- state ----------
  let screen = 'title', W = null, playDef = null, playCtx = null;
  const cam = { x: 0, y: 0, zoom: 1 };
  const input = { left: false, right: false, jump: false, down: false, jumpPressed: false };
  let attract = LF.createWorld(LF.LEVELS[0]);
  let story = { time: 0, falls: 0 };

  const app = { canvas: cvs, renderer: R };
  const editor = LF.createEditor(app);

  function setVisible({ hud = false, overlay = false, select = false, touch = false }) {
    $('hud').hidden = !hud; $('overlay').hidden = !overlay; $('select').hidden = !select; $('touch').hidden = !touch;
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

  // ---------- screens ----------
  function showTitle() {
    screen = 'title';
    attract = LF.createWorld(LF.LEVELS[0]);
    LF.followCamera(attract, cam, 0, true);
    setVisible({ overlay: true });
    const n = nextStory(), cleared = Object.keys(progress).length;
    card(`
      <p class="eyebrow">A lamplighter's night · ${LF.LEVELS.length} levels · ${cleared} lit</p>
      <h1>Lanternfall</h1>
      <p class="lede">Night is falling on the old town. Light every lantern to open each door: across the rooftops, up the belfry, down through the kilns and into the Hollow Spire.</p>
      <div class="menu">
        <button class="go" data-act="story" data-i="${n}">${cleared ? `Continue · ${n + 1}. ${esc(LF.LEVELS[n].name)}` : 'Light the first lamp'}</button>
        <button class="alt" data-act="select">Choose a level</button>
        <button class="alt" data-act="random">Random map</button>
        <button class="alt" data-act="editor">Level editor</button>
      </div>
      <ul class="keys">
        <li><kbd>←</kbd><kbd>→</kbd> walk · <kbd>Space</kbd> jump (hold for height) · <kbd>↓</kbd> drop through planks</li>
        <li><kbd>R</kbd> restart · <kbd>Esc</kbd> pause · <kbd>M</kbd> sound ${muted ? 'off' : 'on'}</li>
      </ul>`);
  }

  function showSelect() {
    screen = 'select';
    setVisible({ select: true });
    const chapters = [];
    LF.LEVELS.forEach((lv, i) => {
      let ch = chapters[chapters.length - 1];
      if (!ch || ch.name !== lv.chapter) chapters.push(ch = { name: lv.chapter, items: [] });
      ch.items.push({ lv, i });
    });
    let html = chapters.map((ch, k) => `
      <section class="chapter">
        <h3><span>Chapter ${ROMAN[k]}</span>${esc(ch.name)}</h3>
        <div class="tiles">${ch.items.map(({ lv, i }) => {
          const p = progress[i];
          return `<button class="lvl${p ? ' lit' : ''}" data-act="story" data-i="${i}">
            <b>${i + 1}</b><strong>${esc(lv.name)}</strong>
            <small>${lv.map[0].length}×${lv.map.length} · ${shapeOf(lv)}</small>
            <em>${p ? 'best ' + fmt(p.best) : 'not yet lit'}</em></button>`;
        }).join('')}</div>
      </section>`).join('');
    html += `<section class="chapter"><h3><span>Workshop</span>Your levels</h3>` + (customs.length
      ? `<ul class="customs">${customs.map(c => `<li><div><strong>${esc(c.name)}</strong><small>${c.map[0].length}×${c.map.length} · ${shapeOf(c)}</small></div>
          <span><button class="mini go-mini" data-act="custom" data-id="${c.id}">Play</button><button class="mini" data-act="editCustom" data-id="${c.id}">Edit</button><button class="mini danger" data-act="deleteCustom" data-id="${c.id}">Delete</button></span></li>`).join('')}</ul>`
      : `<p class="empty">Nothing saved yet. Build one in the editor, or generate a random map and save it.</p>`) + `</section>`;
    $('sel-body').innerHTML = html;
    for (const b of $('sel-body').querySelectorAll('[data-act]')) b.addEventListener('click', () => { initAudio(); ACTIONS[b.dataset.act](b.dataset); });
  }

  function hudLabel() {
    if (playCtx.kind === 'story') return `Chapter ${ROMAN[chapterIndex(playCtx.index)]} · Level ${playCtx.index + 1} of ${LF.LEVELS.length}`;
    if (playCtx.kind === 'random') return `Random · ${playCtx.opts.shape === 'mixed' ? 'up & across' : playCtx.opts.shape === 'up' ? 'upward' : 'across'} · seed ${playCtx.opts.seed}`;
    if (playCtx.kind === 'test') return 'Test play · Esc to edit';
    return 'Your level';
  }
  const chapterIndex = i => { const names = [...new Set(LF.LEVELS.map(l => l.chapter))]; return names.indexOf(LF.LEVELS[i].chapter); };

  function play(def, ctx) {
    playDef = def; playCtx = ctx;
    W = LF.createWorld(def);
    for (const k in input) input[k] = false;
    LF.followCamera(W, cam, 0, true);
    screen = 'play';
    setVisible({ hud: true, touch: true });
    $('hud-num').textContent = hudLabel();
    $('hud-name').textContent = W.name;
    hudCache = '';
    flash(W.name);
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
      <div class="menu">
        <button class="go" data-act="resume">Resume</button>
        <button class="alt" data-act="restart">Restart level</button>
        ${playCtx.kind === 'test' ? '<button class="alt" data-act="backToEditor">Back to editor</button>' : ''}
        ${playCtx.kind === 'random' ? '<button class="alt" data-act="editRandom">Open in editor</button>' : ''}
        <button class="alt" data-act="menu">Main menu</button>
      </div>`);
  }

  function cleared() {
    screen = 'clear';
    setVisible({ hud: true, overlay: true });
    const t = W.time, falls = W.falls;
    let eyebrow = 'Every lamp lit', title = W.name, stats = '', buttons = '';
    const tally = (extra = '') => `<dl class="tally"><div><dt>Time</dt><dd>${fmt(t)}</dd></div><div><dt>Falls</dt><dd>${falls}</dd></div>${extra}</dl>`;
    if (playCtx.kind === 'story') {
      const i = playCtx.index, prev = progress[i];
      const isBest = !prev || t < prev.best;
      if (isBest) { progress[i] = { best: t, falls }; store.set('progress', progress); }
      story.time += t; story.falls += falls;
      const last = i === LF.LEVELS.length - 1;
      eyebrow = `Level ${i + 1} of ${LF.LEVELS.length} · every lamp lit`;
      stats = tally(`<div class="best"><dt>${isBest ? 'New best' : 'Best'}</dt><dd>${fmt(isBest ? t : prev.best)}</dd></div>`);
      if (last) {
        eyebrow = 'The whole town is lit'; title = 'Every lamp burns.';
        stats += `<p class="lede">All ${LF.LEVELS.length} levels done. The lamplighter goes home. Try the random maps, or build a level of your own.</p>`;
        buttons = `<button class="go" data-act="random">Random map</button><button class="alt" data-act="editor">Level editor</button><button class="alt" data-act="menu">Main menu</button>`;
      } else {
        const nx = LF.LEVELS[i + 1];
        stats += `<p class="lede">Next: ${esc(nx.name)} · ${nx.map[0].length}×${nx.map.length}, ${shapeOf(nx)}.</p>`;
        buttons = `<button class="go" data-act="story" data-i="${i + 1}">Next level</button><button class="alt" data-act="restart">Replay</button><button class="alt" data-act="select">Choose a level</button>`;
      }
    } else if (playCtx.kind === 'random') {
      eyebrow = `Random map · seed ${playCtx.opts.seed}`; stats = tally();
      buttons = `<button class="go" data-act="rerollRandom">Another random map</button><button class="alt" data-act="saveRandom">Save to Your levels</button><button class="alt" data-act="editRandom">Open in editor</button><button class="alt" data-act="menu">Main menu</button>`;
    } else if (playCtx.kind === 'test') {
      eyebrow = 'Test play · cleared'; stats = tally();
      buttons = `<button class="go" data-act="backToEditor">Back to editor</button><button class="alt" data-act="restart">Play again</button>`;
    } else {
      eyebrow = 'Your level · cleared'; stats = tally();
      buttons = `<button class="go" data-act="restart">Play again</button><button class="alt" data-act="editCustom" data-id="${playCtx.id}">Edit</button><button class="alt" data-act="select">Choose a level</button>`;
    }
    card(`<p class="eyebrow">${esc(eyebrow)}</p><h2>${esc(title)}</h2>${stats}<div class="menu">${buttons}</div>`);
  }

  function openEditor(def) {
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

  const encode = d => 'LF1:' + btoa(unescape(encodeURIComponent(JSON.stringify({ n: d.name, d: d.dark, m: d.map.join('/') }))));
  const decode = code => {
    const j = JSON.parse(decodeURIComponent(escape(atob(code.trim().replace(/^LF1:/, '')))));
    if (!j.m) throw new Error('no map');
    return { name: j.n || 'Imported level', dark: typeof j.d === 'number' ? j.d : .6, map: j.m.split('/') };
  };
  app.openCode = d => {
    $('code-text').value = encode(d);
    $('code-msg').textContent = 'Copy this code to share your level. Paste someone else’s code here and choose Load.';
    $('code-dialog').showModal();
    $('code-text').select();
  };
  $('code-copy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText($('code-text').value); $('code-msg').textContent = 'Copied.'; }
    catch (e) { $('code-text').select(); $('code-msg').textContent = 'Select the text and copy it with ⌘C / Ctrl+C.'; }
  });
  $('code-load').addEventListener('click', () => {
    try { const d = decode($('code-text').value); $('code-dialog').close(); openEditor(d); flash('Level loaded'); }
    catch (e) { $('code-msg').textContent = 'That code could not be read. Check that you pasted the whole thing, starting with LF1:'; }
  });
  $('code-cancel').addEventListener('click', () => $('code-dialog').close());

  app.saveCustom = d => {
    const id = d.id || 'c' + Date.now().toString(36);
    const rec = { id, name: d.name || 'Untitled', dark: d.dark, map: d.map, updated: Date.now() };
    const i = customs.findIndex(c => c.id === id);
    if (i >= 0) customs[i] = rec; else customs.unshift(rec);
    store.set('custom', customs);
    return rec;
  };
  app.menu = showTitle;

  // ---------- actions ----------
  const ACTIONS = {
    story: d => { story = +d.i === 0 ? { time: 0, falls: 0 } : story; play(LF.LEVELS[+d.i], { kind: 'story', index: +d.i }); },
    select: showSelect,
    random: () => app.openGenerator('menu'),
    editor: () => openEditor(),
    menu: showTitle,
    resume: () => { screen = 'play'; setVisible({ hud: true, touch: true }); },
    restart: () => play(playDef, playCtx),
    backToEditor: () => { screen = 'editor'; setVisible({}); editor.resume(); },
    editRandom: () => openEditor({ ...playDef }),
    rerollRandom: () => { const o = { ...playCtx.opts, seed: Math.floor(Math.random() * 1e6) }; play(LF.generate(o), { kind: 'random', opts: o }); },
    saveRandom: () => { app.saveCustom({ ...playDef }); flash('Saved to Your levels'); },
    custom: d => { const c = customs.find(x => x.id === d.id); if (c) play(c, { kind: 'custom', id: c.id }); },
    editCustom: d => { const c = customs.find(x => x.id === d.id); if (c) openEditor({ ...c }); },
    deleteCustom: d => {
      const c = customs.find(x => x.id === d.id);
      if (!c || !confirm(`Delete “${c.name}”? This can’t be undone.`)) return;
      customs = customs.filter(x => x.id !== d.id); store.set('custom', customs); showSelect();
    },
  };
  $('sel-back').addEventListener('click', showTitle);

  // ---------- input ----------
  const KEYMAP = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'jump', KeyW: 'jump', Space: 'jump', KeyZ: 'jump', ArrowDown: 'down', KeyS: 'down' };
  addEventListener('keydown', e => {
    if (e.target.closest && e.target.closest('input, textarea, select, dialog')) return;
    if (screen === 'editor') { if (e.code === 'Escape') showTitle(); return; }
    const k = KEYMAP[e.code];
    if (screen === 'play') {
      if (k) {
        e.preventDefault();
        if (k === 'jump' && !input.jump && !e.repeat) input.jumpPressed = true;
        input[k] = true;
      }
      if (e.code === 'KeyR') { play(playDef, playCtx); flash('Restarted'); }
      if (e.code === 'Escape' && playCtx.kind === 'test') ACTIONS.backToEditor();
      else if (e.code === 'Escape' || e.code === 'KeyP') pause();
      if (e.code === 'KeyM') { muted = !muted; store.set('muted', muted); flash(muted ? 'Sound off' : 'Sound on'); }
      initAudio();
      return;
    }
    if (screen === 'paused' && (e.code === 'Escape' || e.code === 'KeyP')) { ACTIONS.resume(); return; }
    if (screen === 'select' && e.code === 'Escape') { showTitle(); return; }
    if (k === 'jump' || e.code === 'Space') e.preventDefault();
  });
  addEventListener('keyup', e => { const k = KEYMAP[e.code]; if (k) input[k] = false; });
  addEventListener('blur', () => { for (const k in input) input[k] = false; });
  document.addEventListener('visibilitychange', () => { if (document.hidden && screen === 'play') pause(); });

  function bindTouch(id, k) {
    const el = $(id);
    const on = e => { e.preventDefault(); initAudio(); if (k === 'jump' && !input.jump) input.jumpPressed = true; input[k] = true; el.classList.add('on'); };
    const off = e => { e.preventDefault(); input[k] = false; el.classList.remove('on'); };
    el.addEventListener('pointerdown', on); el.addEventListener('pointerup', off);
    el.addEventListener('pointercancel', off); el.addEventListener('pointerleave', off);
  }
  bindTouch('t-left', 'left'); bindTouch('t-right', 'right'); bindTouch('t-jump', 'jump'); bindTouch('t-down', 'down');
  $('t-pause').addEventListener('click', () => pause());

  // ---------- HUD ----------
  let hudCache = '';
  function hud() {
    const lit = W.lanterns.filter(l => l.lit).length, open = W.door && W.door.open;
    const key = `${lit}|${Math.floor(W.time * 10)}|${W.falls}|${open}`;
    if (key === hudCache) return;
    hudCache = key;
    $('hud-lamps-label').textContent = open ? 'Door' : 'Lanterns';
    $('hud-lamps').textContent = open ? 'open' : `${lit}/${W.total}`;
    $('hud-lamps-wrap').className = open ? 'open' : 'lamps';
    $('hud-time').textContent = fmt(W.time);
    $('hud-falls').textContent = W.falls;
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
    else showTitle();
    requestAnimationFrame(frame);
  }
  window.claude?.hot?.ready ? window.claude.hot.ready(start) : start(window.claude?.hot?.data ?? {});
})();
