// Lanternfall level editor.
(() => {
  const LF = window.LF;
  const TS = LF.TS;
  const $ = id => document.getElementById(id);

  const TOOLS = [
    { c: 'hand', label: 'Pan', group: 'Tools', chip: '#3A2A55', glyph: '✥' },
    { c: '.', label: 'Erase', group: 'Tools', chip: '#17142F', glyph: '⌫' },
    { c: '#', label: 'Stone', group: 'Terrain', chip: '#5E5173' },
    { c: '=', label: 'Plank', group: 'Terrain', chip: '#9A6A45', note: 'jump up through, ↓ to drop' },
    { c: 'C', label: 'Crumble', group: 'Terrain', chip: '#7B6A8C', note: 'breaks after you stand on it' },
    { c: 'O', label: 'Spring', group: 'Terrain', chip: '#FF6B3D', note: 'launches about 8 tiles up' },
    { c: '^', label: 'Spikes', group: 'Terrain', chip: '#CFC6E8' },
    { c: '~', label: 'Water', group: 'Terrain', chip: '#2E4E82' },
    { c: '|', label: 'Stop', group: 'Terrain', chip: '#FF6B3D', glyph: '┆', note: 'invisible: turns lifts, walkers and bats' },
    { c: 'P', label: 'Start', group: 'Level', chip: '#D9D0F0' },
    { c: 'L', label: 'Lantern', group: 'Level', chip: '#FFB547' },
    { c: 'D', label: 'Door', group: 'Level', chip: '#8F81AB' },
    { c: 'M', label: 'Lift ↔', group: 'Level', chip: '#C08A5C', note: '2 wide, bounces between blocks or stops' },
    { c: 'V', label: 'Lift ↕', group: 'Level', chip: '#C08A5C', note: '2 wide, bounces between blocks or stops' },
    ...Object.entries(LF.ENEMIES).map(([c, e]) => ({ c, label: e.name, group: 'Enemies', chip: { B: '#2A2348', K: '#3B2F57', F: '#3D3458', J: '#2F5260', S: '#7A3E1C', G: '#C9D2F0' }[c], note: e.note })),
  ];

  LF.createEditor = function (app) {
    const cvs = app.canvas, R = app.renderer;
    const E = { active: false };
    let grid = [], meta = { name: 'My level', dark: .6, id: null };
    let tool = TOOLS[2], world = null, dirty = true;
    const cam = { x: 0, y: 0, zoom: 1 };
    let hover = null, painting = null, panning = null, spaceDown = false;
    let undo = [], redo = [];

    // ---------- palette ----------
    const pal = $('ed-palette');
    let lastGroup = '';
    for (const t of TOOLS) {
      if (t.group !== lastGroup) {
        const g = document.createElement('span'); g.className = 'ed-group'; g.textContent = t.group; pal.appendChild(g);
        lastGroup = t.group;
      }
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'ed-tool'; b.id = 'tool-' + (t.c === '.' ? 'erase' : t.c === 'hand' ? 'hand' : t.c.charCodeAt(0));
      b.title = t.note ? `${t.label} — ${t.note}` : t.label;
      b.innerHTML = `<i style="background:${t.chip}">${t.glyph || ''}</i>${t.label}`;
      b.addEventListener('click', () => selectTool(t));
      t.el = b; pal.appendChild(b);
    }
    function selectTool(t) {
      tool = t;
      for (const x of TOOLS) x.el.classList.toggle('on', x === t);
      status(t.note ? `${t.label}: ${t.note}` : t.label);
      cvs.style.cursor = t.c === 'hand' ? 'grab' : 'crosshair';
    }

    // ---------- grid helpers ----------
    const H = () => grid.length, Wd = () => grid[0].length;
    const toRows = () => grid.map(r => r.join(''));
    function load(def) {
      grid = LF.normalize(def.map).map(r => r.split(''));
      meta = { name: def.name || 'My level', dark: def.dark ?? .6, id: def.id || null, signs: def.signs };
      undo = []; redo = [];
      syncInputs(); fitCamera(); dirty = true;
    }
    function def() { return { name: meta.name, dark: meta.dark, map: toRows(), id: meta.id }; }
    function snapshot() { undo.push(toRows().join('\n')); if (undo.length > 80) undo.shift(); redo = []; }
    function restore(str) { grid = str.split('\n').map(r => r.split('')); syncInputs(); dirty = true; }

    function put(tx, ty, c) {
      if (tx < 0 || ty < 0 || ty >= H() || tx >= Wd()) return;
      if (c === 'P' || c === 'D') for (const row of grid) for (let x = 0; x < row.length; x++) if (row[x] === c) row[x] = '.';
      if (grid[ty][tx] === c) return;
      grid[ty][tx] = c;
      if ((c === 'M' || c === 'V') && tx + 1 < Wd()) grid[ty][tx + 1] = '.';
      dirty = true;
    }

    function resize(nw, nh) {
      nw = Math.max(12, Math.min(300, nw | 0)); nh = Math.max(10, Math.min(200, nh | 0));
      snapshot();
      let rows = grid.map(r => r.slice(0, nw).concat(Array(Math.max(0, nw - r.length)).fill('.')));
      if (nh > rows.length) rows = Array.from({ length: nh - rows.length }, () => Array(nw).fill('.')).concat(rows);
      else rows = rows.slice(rows.length - nh);
      grid = rows; dirty = true; syncInputs();
    }

    function syncInputs() {
      $('ed-name').value = meta.name;
      $('ed-w').value = Wd(); $('ed-h').value = H();
      $('ed-dark').value = meta.dark;
    }

    function fitCamera() {
      cam.zoom = 1;
      const { vw, vh } = R.viewSize(cam);
      const fit = Math.min((vw - 40) / (Wd() * TS), (vh - 200) / (H() * TS));
      cam.zoom = Math.max(.25, Math.min(1.25, fit));
      const v = R.viewSize(cam);
      cam.x = Math.min(0, (Wd() * TS - v.vw) / 2);
      if (Wd() * TS > v.vw) cam.x = -20;
      cam.y = (H() * TS - v.vh) + 40 / cam.zoom;
    }

    function status(msg) { $('ed-status').textContent = msg; }
    function counts() {
      let l = 0, e = 0;
      for (const row of grid) for (const c of row) { if (c === 'L') l++; else if (LF.ENEMIES[c]) e++; }
      return `${Wd()}×${H()} · ${l} lantern${l === 1 ? '' : 's'} · ${e} enem${e === 1 ? 'y' : 'ies'}`;
    }

    // ---------- pointer ----------
    function cellAt(ev) {
      const rect = cvs.getBoundingClientRect();
      const p = R.screenToWorld(ev.clientX - rect.left, ev.clientY - rect.top, cam);
      return { tx: Math.floor(p.x / TS), ty: Math.floor(p.y / TS) };
    }
    cvs.addEventListener('pointerdown', ev => {
      if (!E.active) return;
      cvs.setPointerCapture(ev.pointerId);
      if (ev.button === 1 || spaceDown || tool.c === 'hand') {
        panning = { x: ev.clientX, y: ev.clientY, cx: cam.x, cy: cam.y }; cvs.style.cursor = 'grabbing'; return;
      }
      const cell = cellAt(ev);
      snapshot();
      painting = { erase: ev.button === 2 };
      put(cell.tx, cell.ty, painting.erase ? '.' : tool.c);
    });
    cvs.addEventListener('pointermove', ev => {
      if (!E.active) return;
      if (panning) {
        const k = R.dpr / R.scale(cam);
        cam.x = panning.cx - (ev.clientX - panning.x) * k;
        cam.y = panning.cy - (ev.clientY - panning.y) * k;
        return;
      }
      const cell = cellAt(ev);
      hover = cell;
      if (painting) put(cell.tx, cell.ty, painting.erase ? '.' : tool.c);
      if (cell.tx >= 0 && cell.ty >= 0 && cell.tx < Wd() && cell.ty < H()) {
        const ch = grid[cell.ty][cell.tx];
        const t = TOOLS.find(x => x.c === ch);
        $('ed-coords').textContent = `col ${cell.tx + 1} · row ${cell.ty + 1}${t && ch !== '.' ? ' · ' + t.label : ''}`;
      }
    });
    const endStroke = () => {
      if (painting && undo.length && undo[undo.length - 1] === toRows().join('\n')) undo.pop();
      painting = null; panning = null;
      if (E.active) cvs.style.cursor = tool.c === 'hand' ? 'grab' : 'crosshair';
      saveDraft();
    };
    cvs.addEventListener('pointerup', endStroke);
    cvs.addEventListener('pointercancel', endStroke);
    cvs.addEventListener('pointerleave', () => { hover = null; });
    cvs.addEventListener('contextmenu', ev => { if (E.active) ev.preventDefault(); });
    cvs.addEventListener('wheel', ev => {
      if (!E.active) return;
      ev.preventDefault();
      if (ev.ctrlKey || ev.metaKey) {
        const rect = cvs.getBoundingClientRect();
        const before = R.screenToWorld(ev.clientX - rect.left, ev.clientY - rect.top, cam);
        cam.zoom = Math.max(.2, Math.min(2.5, cam.zoom * Math.exp(-ev.deltaY * .002)));
        const after = R.screenToWorld(ev.clientX - rect.left, ev.clientY - rect.top, cam);
        cam.x += before.x - after.x; cam.y += before.y - after.y;
      } else {
        const k = R.dpr / R.scale(cam);
        cam.x += (ev.shiftKey ? ev.deltaY : ev.deltaX) * k;
        if (!ev.shiftKey) cam.y += ev.deltaY * k;
      }
    }, { passive: false });

    addEventListener('keydown', ev => {
      if (!E.active || ev.target.closest('input, textarea, dialog')) return;
      if (ev.code === 'Space') { spaceDown = true; ev.preventDefault(); }
      const mod = ev.ctrlKey || ev.metaKey;
      if (mod && ev.code === 'KeyZ') {
        ev.preventDefault();
        const cur = toRows().join('\n');
        if (ev.shiftKey) { if (redo.length) { undo.push(cur); restore(redo.pop()); } }
        else if (undo.length) { redo.push(cur); restore(undo.pop()); }
        return;
      }
      const step = 64 / cam.zoom;
      if (ev.code === 'ArrowLeft') cam.x -= step;
      if (ev.code === 'ArrowRight') cam.x += step;
      if (ev.code === 'ArrowUp') cam.y -= step;
      if (ev.code === 'ArrowDown') cam.y += step;
      if (ev.code === 'KeyT') testPlay();
      if (ev.code === 'KeyF') fitCamera();
    });
    addEventListener('keyup', ev => { if (ev.code === 'Space') spaceDown = false; });

    // ---------- toolbar ----------
    $('ed-name').addEventListener('input', e => { meta.name = e.target.value || 'Untitled'; saveDraft(); });
    $('ed-dark').addEventListener('input', e => { meta.dark = +e.target.value; dirty = true; });
    const applySize = () => resize(+$('ed-w').value, +$('ed-h').value);
    $('ed-w').addEventListener('change', applySize);
    $('ed-h').addEventListener('change', applySize);

    function check() {
      const a = LF.analyze(def());
      if (a.ok) status(`Looks playable: start reaches all ${a.lanterns} lantern${a.lanterns === 1 ? '' : 's'} and the door. ${counts()}`);
      else status(a.problems.join(' '));
      return a;
    }
    function testPlay() {
      const a = LF.analyze(def());
      if (!grid.some(r => r.includes('P'))) { status('Place a start (P) before test playing.'); return; }
      saveDraft();
      app.play(def(), { kind: 'test' });
      if (!a.ok) app.flash('Heads up: ' + a.problems[0]);
    }
    $('ed-check').addEventListener('click', check);
    $('ed-play').addEventListener('click', testPlay);
    $('ed-fit').addEventListener('click', fitCamera);
    $('ed-save').addEventListener('click', () => {
      const d = def();
      const saved = app.saveCustom(d);
      meta.id = saved.id;
      status(`Saved “${saved.name}” to Your levels. ${counts()}`);
    });
    $('ed-new').addEventListener('click', () => { snapshot(); load(blank()); status('New blank level. Paint stone, then place a start, lanterns and a door.'); });
    $('ed-gen').addEventListener('click', () => app.openGenerator('editor'));
    $('ed-code').addEventListener('click', () => app.openCode(def()));
    $('ed-exit').addEventListener('click', () => { saveDraft(); app.menu(); });

    function blank() {
      return {
        name: 'My level', dark: .6,
        map: LF.build(40, 16, ({ r, s }) => { r(0, 13, 39, 15); s(2, 12, 'P'); s(20, 12, 'L'); s(37, 12, 'D'); }),
      };
    }
    function saveDraft() { try { localStorage.setItem('lanternfall.draft', JSON.stringify(def())); } catch (e) {} }
    function loadDraft() { try { const d = JSON.parse(localStorage.getItem('lanternfall.draft')); return d && d.map ? d : null; } catch (e) { return null; } }

    // ---------- lifecycle ----------
    E.open = d => {
      if (d) load(d); else if (!grid.length) load(loadDraft() || blank());
      E.active = true;
      $('editor').hidden = false;
      selectTool(tool);
      status(`${counts()} · paint with the mouse, right-click erases, space-drag or wheel pans, ⌘/Ctrl-wheel zooms, T test plays.`);
    };
    E.resume = () => { E.active = true; $('editor').hidden = false; selectTool(tool); };
    E.close = () => { E.active = false; $('editor').hidden = true; cvs.style.cursor = ''; };
    E.frame = dt => {
      if (dirty) { world = LF.createWorld(def()); dirty = false; }
      world.clock += dt;
      R.render(world, cam, { edit: true, hover }, dt);
    };
    E.current = def;
    return E;
  };
})();
