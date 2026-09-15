// Lanternfall renderer: sky, tiles, sprites, darkness and light.
(() => {
  const LF = window.LF;
  const TS = LF.TS, TAU = Math.PI * 2;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  LF.reduced = reduced;

  function skyline(n, minH, maxH, seed) {
    const rr = LF.rng(seed); const items = []; let x = 0;
    for (let i = 0; i < n; i++) {
      const w = 36 + rr() * 60, h = minH + rr() * (maxH - minH);
      const roof = rr() < .25 ? 'spire' : rr() < .55 ? 'peak' : 'flat';
      const wins = [];
      for (let k = 0; k < 4; k++) if (rr() < .35) wins.push({ x: 6 + rr() * (w - 14), y: 12 + rr() * (h - 30) });
      items.push({ x, w, h, roof, wins }); x += w + rr() * 10;
    }
    return { items, total: x };
  }
  const layers = [
    { f: .15, color: '#231D44', win: .28, ...skyline(40, 90, 230, 11) },
    { f: .4, color: '#2D2552', win: .45, ...skyline(40, 50, 150, 23) },
  ];
  const starRand = LF.rng(7);
  const stars = Array.from({ length: 120 }, () => ({ x: starRand(), y: starRand() * .7, r: starRand() < .15 ? 1.6 : .9, ph: starRand() * TAU }));

  LF.createRenderer = function (cvs) {
    const ctx = cvs.getContext('2d');
    const dark = document.createElement('canvas'), dctx = dark.getContext('2d');
    const R = { W: 0, H: 0, dpr: 1, base: 1, sc: 1 };
    let clock = 0;

    R.resize = () => {
      R.dpr = Math.min(2, window.devicePixelRatio || 1);
      const cw = window.innerWidth, ch = window.innerHeight;
      R.W = cvs.width = Math.round(cw * R.dpr);
      R.H = cvs.height = Math.round(ch * R.dpr);
      dark.width = R.W; dark.height = R.H;
      R.base = R.dpr * Math.min(ch / (14 * TS), cw / (22 * TS));
    };
    R.scale = cam => R.base * (cam.zoom || 1);
    R.viewSize = cam => ({ vw: R.W / R.scale(cam), vh: R.H / R.scale(cam) });
    R.screenToWorld = (cx, cy, cam) => {
      const sc = R.scale(cam);
      return { x: cx * R.dpr / sc + cam.x, y: cy * R.dpr / sc + cam.y };
    };

    LF.followCamera = (W, cam, dt, snap) => {
      const { vw, vh } = R.viewSize(cam);
      const p = W.player, ww = W.w * TS, wh = W.h * TS;
      let tx = ww <= vw ? -(vw - ww) / 2 : Math.max(0, Math.min(ww - vw, p.x + p.w / 2 - vw / 2 + p.face * 40));
      let ty = wh <= vh ? wh - vh : Math.max(0, Math.min(wh - vh, p.y + p.h / 2 - vh * .55));
      if (snap) { cam.x = tx; cam.y = ty; return; }
      cam.x += (tx - cam.x) * Math.min(1, dt * 5);
      cam.y += (ty - cam.y) * Math.min(1, dt * 4);
    };

    function drawSky(W, cam) {
      const { W: SW, H: SH } = R, sc = R.scale(cam);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const g = ctx.createLinearGradient(0, 0, 0, SH);
      g.addColorStop(0, '#100D26'); g.addColorStop(.55, '#261E4A'); g.addColorStop(.85, '#46305E'); g.addColorStop(1, '#5B3A63');
      ctx.fillStyle = g; ctx.fillRect(0, 0, SW, SH);
      ctx.fillStyle = '#D9D0F0';
      for (const s of stars) {
        const tw = reduced ? .7 : .5 + .5 * Math.sin(clock * 1.5 + s.ph);
        ctx.globalAlpha = .3 + tw * .55;
        const x = ((s.x * SW - cam.x * sc * .03) % SW + SW) % SW;
        const y = ((s.y * SH - cam.y * sc * .03) % SH + SH) % SH;
        ctx.fillRect(x, y, s.r * R.dpr, s.r * R.dpr);
      }
      ctx.globalAlpha = 1;

      const bottom = (W.h * TS - cam.y) * sc;
      const mx = SW * .78 - cam.x * sc * .05, my = SH * .22 - (cam.y - (W.h * TS - SH / sc)) * sc * .05;
      const mr = 22 * R.base;
      const mg = ctx.createRadialGradient(mx, my, 0, mx, my, mr * 5);
      mg.addColorStop(0, 'rgba(217,208,240,.2)'); mg.addColorStop(1, 'rgba(217,208,240,0)');
      ctx.fillStyle = mg; ctx.fillRect(mx - mr * 5, my - mr * 5, mr * 10, mr * 10);
      ctx.fillStyle = '#CFC4EA'; ctx.beginPath(); ctx.arc(mx, my, mr, 0, TAU); ctx.fill();
      ctx.fillStyle = '#2A2150'; ctx.beginPath(); ctx.arc(mx + mr * .4, my - mr * .22, mr * .9, 0, TAU); ctx.fill();

      const base = Math.min(SH * 1.8, SH * .8 + (bottom - SH) * .25);
      const bs = R.base;
      for (const layer of layers) {
        const span = layer.total * bs;
        const start = -((cam.x * layer.f * sc) % span + span) % span;
        for (let rep = start; rep < SW; rep += span) {
          for (const b of layer.items) {
            const x = rep + b.x * bs, w = b.w * bs, h = b.h * bs;
            if (x > SW || x + w < 0) continue;
            ctx.fillStyle = layer.color;
            ctx.fillRect(x, base - h, w, SH * 2);
            ctx.beginPath();
            if (b.roof === 'peak') { ctx.moveTo(x - 3 * bs, base - h); ctx.lineTo(x + w / 2, base - h - 22 * bs); ctx.lineTo(x + w + 3 * bs, base - h); }
            else if (b.roof === 'spire') { ctx.moveTo(x + w * .3, base - h); ctx.lineTo(x + w / 2, base - h - 48 * bs); ctx.lineTo(x + w * .7, base - h); }
            ctx.fill();
            ctx.fillStyle = `rgba(255,181,71,${layer.win})`;
            for (const wn of b.wins) ctx.fillRect(x + wn.x * bs, base - h + wn.y * bs, 4 * bs, 5 * bs);
          }
        }
      }
      const mistTop = bottom - 3 * TS * sc;
      const mist = ctx.createLinearGradient(0, mistTop, 0, bottom);
      mist.addColorStop(0, 'rgba(14,12,34,0)'); mist.addColorStop(1, 'rgba(14,12,34,.95)');
      ctx.fillStyle = mist; ctx.fillRect(0, mistTop, SW, 3 * TS * sc);
      ctx.fillStyle = '#0E0C22'; ctx.fillRect(0, bottom - 1, SW, SH);
    }

    function worldTransform(W, cam, opts) {
      const sc = R.scale(cam);
      let sx = 0, sy = 0;
      if (W.shake > 0 && !reduced && !opts.edit) { sx = (Math.random() - .5) * W.shake * 18 * R.dpr; sy = (Math.random() - .5) * W.shake * 18 * R.dpr; }
      ctx.setTransform(sc, 0, 0, sc, -cam.x * sc + sx, -cam.y * sc + sy);
    }

    function visibleRange(W, cam) {
      const { vw, vh } = R.viewSize(cam);
      return {
        x0: Math.max(0, Math.floor(cam.x / TS) - 1), x1: Math.min(W.w - 1, Math.ceil((cam.x + vw) / TS) + 1),
        y0: Math.max(0, Math.floor(cam.y / TS) - 1), y1: Math.min(W.h - 1, Math.ceil((cam.y + vh) / TS) + 1),
      };
    }

    function drawStone(W, tx, ty, x, y, fill, seam) {
      ctx.fillStyle = fill; ctx.fillRect(x, y, TS, TS);
      ctx.fillStyle = seam;
      ctx.fillRect(x, y + 15, TS, 2);
      const off = ty % 2 ? 8 : 24;
      ctx.fillRect(x + off, y, 2, 15);
      ctx.fillRect(x + ((off + 16) % 32), y + 17, 2, 15);
    }

    function drawTiles(W, cam, opts) {
      const { x0, x1, y0, y1 } = visibleRange(W, cam);
      const t = (x, y) => LF.tile(W, x, y);
      for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
        const c = W.tiles[ty][tx], x = tx * TS, y = ty * TS;
        if (c === '#') {
          drawStone(W, tx, ty, x, y, '#5E5173', '#4C4062');
          if (!LF.isSolid(t(tx, ty - 1))) { ctx.fillStyle = '#8F81AB'; ctx.fillRect(x, y, TS, 4); ctx.fillStyle = '#A99CC4'; ctx.fillRect(x, y, TS, 1.5); }
          if (!LF.isSolid(t(tx - 1, ty)) && tx > 0) { ctx.fillStyle = '#6E6186'; ctx.fillRect(x, y, 2, TS); }
          if (!LF.isSolid(t(tx + 1, ty)) && tx < W.w - 1) { ctx.fillStyle = '#433858'; ctx.fillRect(x + TS - 2, y, 2, TS); }
        } else if (c === 'C') {
          const cr = W.crumbles.find(k => k.tx === tx && k.ty === ty);
          const j = cr && !reduced ? (Math.random() - .5) * 3 : 0;
          ctx.fillStyle = '#7B6A8C'; ctx.fillRect(x + 1 + j, y + 1, TS - 2, TS - 2);
          ctx.fillStyle = '#9C8BAE'; ctx.fillRect(x + 1 + j, y + 1, TS - 2, 3);
          ctx.strokeStyle = '#4C4062'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(x + 6 + j, y + 6); ctx.lineTo(x + 14 + j, y + 15); ctx.lineTo(x + 11 + j, y + 25);
          ctx.moveTo(x + 14 + j, y + 15); ctx.lineTo(x + 25 + j, y + 12); ctx.stroke();
        } else if (c === 'c') {
          ctx.strokeStyle = 'rgba(156,139,174,.35)'; ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
          ctx.strokeRect(x + 2, y + 2, TS - 4, TS - 4); ctx.setLineDash([]);
        } else if (c === '=') {
          ctx.fillStyle = '#9A6A45'; ctx.fillRect(x, y, TS, 7);
          ctx.fillStyle = '#C08A5C'; ctx.fillRect(x, y, TS, 2);
          ctx.fillStyle = '#6B452C'; ctx.fillRect(x, y + 7, TS, 3); ctx.fillRect(x + 14, y + 2, 2, 5);
        } else if (c === '^') {
          ctx.fillStyle = '#2A2348'; ctx.fillRect(x, y + TS - 4, TS, 4);
          for (let k = 0; k < 3; k++) {
            const sx = x + 2 + k * 10;
            ctx.fillStyle = '#CFC6E8';
            ctx.beginPath(); ctx.moveTo(sx, y + TS - 4); ctx.lineTo(sx + 4, y + 13); ctx.lineTo(sx + 8, y + TS - 4); ctx.fill();
            ctx.fillStyle = '#8D82B0';
            ctx.beginPath(); ctx.moveTo(sx + 4, y + 13); ctx.lineTo(sx + 8, y + TS - 4); ctx.lineTo(sx + 4, y + TS - 4); ctx.fill();
          }
        } else if (c === '~') {
          ctx.fillStyle = 'rgba(46,78,130,.88)';
          if (t(tx, ty - 1) !== '~') {
            const wave = reduced ? 0 : Math.sin(clock * 2.2 + tx * .8) * 2;
            ctx.fillRect(x, y + 8 + wave, TS, TS - 8 - wave);
            ctx.fillStyle = '#7FB0E0'; ctx.fillRect(x, y + 8 + wave, TS, 2);
          } else ctx.fillRect(x, y, TS, TS);
        } else if (c === 'O') {
          drawStone(W, tx, ty, x, y + 12, '#5E5173', '#4C4062');
          ctx.fillStyle = '#2A2348'; ctx.fillRect(x + 2, y + 10, TS - 4, 6);
          ctx.strokeStyle = '#D9D0F0'; ctx.lineWidth = 2;
          ctx.beginPath();
          for (let k = 0; k < 3; k++) { ctx.moveTo(x + 8, y + 5 + k * 3); ctx.lineTo(x + 24, y + 7 + k * 3); }
          ctx.stroke();
          ctx.fillStyle = '#FF6B3D'; ctx.fillRect(x + 3, y, TS - 6, 4);
        } else if (c === '|' && opts.edit) {
          ctx.strokeStyle = 'rgba(255,107,61,.8)'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]);
          ctx.beginPath(); ctx.moveTo(x + 16, y + 2); ctx.lineTo(x + 16, y + TS - 2); ctx.stroke(); ctx.setLineDash([]);
        }
      }
    }

    function drawPlats(W) {
      for (const p of W.plats) {
        ctx.fillStyle = '#6B452C'; ctx.fillRect(p.x + 4, p.y + 10, p.w - 8, 3);
        ctx.fillStyle = '#9A6A45'; ctx.fillRect(p.x, p.y, p.w, 10);
        ctx.fillStyle = '#C08A5C'; ctx.fillRect(p.x, p.y, p.w, 2);
        ctx.fillStyle = '#FFB547';
        if (p.axis === 'x') { ctx.fillRect(p.x + 26, p.y + 4, 4, 2); ctx.fillRect(p.x + 34, p.y + 4, 4, 2); }
        else { ctx.fillRect(p.x + 31, p.y + 2, 2, 6); }
      }
    }

    function drawLantern(l) {
      const s = 1 + l.pop * .25;
      ctx.save(); ctx.translate(l.x, l.y); ctx.scale(s, s);
      ctx.fillStyle = '#2A2348';
      ctx.fillRect(-1.5, 8, 3, 10); ctx.fillRect(-5, 16, 10, 2); ctx.fillRect(-7, -9, 14, 18);
      ctx.beginPath(); ctx.moveTo(-9, -9); ctx.lineTo(9, -9); ctx.lineTo(0, -16); ctx.fill();
      ctx.fillStyle = l.lit ? '#FFB547' : '#3D3458'; ctx.fillRect(-5, -7, 10, 14);
      ctx.fillStyle = '#2A2348'; ctx.fillRect(-.75, -7, 1.5, 14);
      ctx.restore();
    }

    function doorPath(d, inset) {
      const { x, y, w, h } = d;
      ctx.beginPath();
      ctx.moveTo(x + inset, y + h); ctx.lineTo(x + inset, y + 14);
      ctx.arc(x + w / 2, y + 14, w / 2 - inset, Math.PI, 0);
      ctx.lineTo(x + w - inset, y + h);
    }
    function drawDoor(d) {
      if (!d) return;
      ctx.fillStyle = '#8F81AB'; doorPath(d, -4); ctx.fill();
      ctx.fillStyle = d.open ? '#3A2440' : '#0E0C22'; doorPath(d, 0); ctx.fill();
      if (!d.open) {
        ctx.fillStyle = '#5E5173';
        for (let k = 0; k < 3; k++) ctx.fillRect(d.x + 6 + k * 9, d.y + 6, 3, d.h - 6);
        ctx.fillRect(d.x, d.y + 30, d.w, 3);
      }
    }

    function drawEnemy(e) {
      const cx = e.x + e.w / 2, by = e.y + e.h, f = e.face || -1;
      if (!e.alive) {
        if (e.dead > .6 || e.type === 'G') return;
        ctx.globalAlpha = 1 - e.dead / .6;
        ctx.fillStyle = '#2A2348'; ctx.fillRect(cx - 12, by - 4, 24, 4);
        ctx.globalAlpha = 1; return;
      }
      const wob = reduced ? 0 : Math.sin(clock * 20 + e.ox) * 1.5;
      switch (e.type) {
        case 'B': {
          ctx.strokeStyle = '#120F2A'; ctx.lineWidth = 2; ctx.beginPath();
          for (let k = -1; k <= 1; k++) { ctx.moveTo(cx + k * 7, by - 5); ctx.lineTo(cx + k * 8 + (k % 2 ? wob : -wob), by); }
          ctx.stroke();
          ctx.fillStyle = '#2A2348'; ctx.beginPath(); ctx.ellipse(cx, by - 5, 12, 11, 0, Math.PI, 0); ctx.fill();
          ctx.fillRect(cx - 12, by - 6, 24, 3);
          ctx.fillStyle = '#4D4278'; ctx.beginPath(); ctx.ellipse(cx - f * 3, by - 11, 5, 3, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = '#120F2A'; ctx.fillRect(cx - .75, by - 16, 1.5, 11);
          break;
        }
        case 'K': {
          ctx.fillStyle = '#120F2A'; ctx.fillRect(cx - 9 + wob, by - 4, 4, 4); ctx.fillRect(cx + 5 - wob, by - 4, 4, 4);
          ctx.fillStyle = '#CFC6E8';
          for (let k = -2; k <= 2; k++) {
            const sx = cx + k * 5;
            ctx.beginPath(); ctx.moveTo(sx - 4, by - 10); ctx.lineTo(sx + k, by - 22 + Math.abs(k) * 2); ctx.lineTo(sx + 4, by - 10); ctx.fill();
          }
          ctx.fillStyle = '#3B2F57'; ctx.beginPath(); ctx.ellipse(cx, by - 4, 13, 11, 0, Math.PI, 0); ctx.fill();
          ctx.fillRect(cx - 13, by - 5, 26, 3);
          ctx.fillStyle = '#5A4C7C'; ctx.fillRect(cx + f * 9 - 3, by - 9, 6, 5);
          break;
        }
        case 'F': {
          const flap = reduced ? 0 : Math.sin(clock * 16 + e.ox) * 6;
          const cy = e.y + 7;
          ctx.fillStyle = '#2A2348';
          ctx.beginPath(); ctx.moveTo(cx - 3, cy); ctx.lineTo(cx - 15, cy - 4 + flap); ctx.lineTo(cx - 9, cy + 5); ctx.fill();
          ctx.beginPath(); ctx.moveTo(cx + 3, cy); ctx.lineTo(cx + 15, cy - 4 + flap); ctx.lineTo(cx + 9, cy + 5); ctx.fill();
          ctx.fillStyle = '#3D3458'; ctx.beginPath(); ctx.arc(cx, cy, 6, 0, TAU); ctx.fill();
          ctx.beginPath(); ctx.moveTo(cx - 5, cy - 3); ctx.lineTo(cx - 4, cy - 9); ctx.lineTo(cx - 1, cy - 5);
          ctx.moveTo(cx + 5, cy - 3); ctx.lineTo(cx + 4, cy - 9); ctx.lineTo(cx + 1, cy - 5); ctx.fill();
          break;
        }
        case 'J': {
          const air = !e.ground;
          const sy = air ? 1.15 : 1, sx = air ? .9 : 1;
          ctx.save(); ctx.translate(cx, by); ctx.scale(sx, sy);
          ctx.fillStyle = '#2F5260'; ctx.beginPath(); ctx.ellipse(0, -7, 11, 8, 0, Math.PI, 0); ctx.fill();
          ctx.fillRect(-11, -8, 22, 6);
          ctx.fillStyle = '#6F9AA8'; ctx.fillRect(-7, -4, 14, 3);
          ctx.fillStyle = '#244250'; ctx.fillRect(-12, -3, 6, 3); ctx.fillRect(6, -3, 6, 3);
          ctx.fillStyle = '#D9D0F0'; ctx.beginPath(); ctx.arc(f * 4 - 3, -15, 3.5, 0, TAU); ctx.arc(f * 4 + 4, -15, 3.5, 0, TAU); ctx.fill();
          ctx.fillStyle = '#120F2A'; ctx.fillRect(f * 4 - 3 + f, -16, 2, 2); ctx.fillRect(f * 4 + 4 + f, -16, 2, 2);
          ctx.restore();
          break;
        }
        case 'S': {
          ctx.fillStyle = '#7A3E1C';
          ctx.beginPath(); ctx.moveTo(cx - 11, by); ctx.lineTo(cx + 11, by); ctx.lineTo(cx + 9, by - 16); ctx.lineTo(cx - 9, by - 16); ctx.fill();
          ctx.fillStyle = '#A8621E'; ctx.fillRect(cx - 12, by - 20, 24, 5);
          ctx.fillStyle = '#5A2C14'; ctx.fillRect(cx - 9, by - 10, 18, 2);
          break;
        }
      }
    }

    function drawPlayer(p) {
      if (p.dead) return;
      const f = p.face, bx = p.x + p.w / 2, by = p.y + p.h, fl = LF.flamePos(p);
      ctx.strokeStyle = '#9A6A45'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(bx + f * 3, by - 10); ctx.lineTo(fl.x, fl.y + 3); ctx.stroke();
      ctx.save(); ctx.translate(bx, by); ctx.scale(p.sx, p.sy);
      const ph = p.onGround && Math.abs(p.vx) > 30 ? Math.sin(p.anim * 22) : 0;
      ctx.fillStyle = '#211C3F';
      if (!p.onGround) { ctx.fillRect(-6, -7, 4, 5); ctx.fillRect(2, -6, 4, 5); }
      else { ctx.fillRect(-6, -6 - (ph > 0 ? 2 : 0), 4, 6); ctx.fillRect(2, -6 - (ph < 0 ? 2 : 0), 4, 6); }
      ctx.fillStyle = '#D9D0F0';
      ctx.beginPath(); ctx.moveTo(-9, -5); ctx.lineTo(9, -5); ctx.lineTo(6, -19); ctx.lineTo(-6, -19); ctx.fill();
      ctx.fillStyle = '#A99CC4';
      ctx.beginPath(); ctx.moveTo(-9 * f, -5); ctx.lineTo(-3 * f, -5); ctx.lineTo(-2 * f, -19); ctx.lineTo(-6 * f, -19); ctx.fill();
      ctx.fillStyle = '#F1D7B8'; ctx.beginPath(); ctx.arc(0, -23, 5, 0, TAU); ctx.fill();
      ctx.fillStyle = '#211C3F';
      ctx.fillRect(f * 2 - 1, -24, 2, 2); ctx.fillRect(-7, -28, 14, 2); ctx.fillRect(-5, -37, 10, 9);
      ctx.fillStyle = '#FF6B3D'; ctx.fillRect(-5, -30, 10, 2);
      ctx.restore();
    }

    function drawParticles(W, additive) {
      ctx.globalCompositeOperation = additive ? 'lighter' : 'source-over';
      for (const q of W.particles) {
        if (LF.WARM.includes(q.c) !== additive) continue;
        ctx.globalAlpha = Math.max(0, q.life / q.max);
        ctx.fillStyle = q.c; ctx.fillRect(q.x - q.size / 2, q.y - q.size / 2, q.size, q.size);
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }

    const flick = (seed, amt) => reduced ? 1 : 1 + (Math.sin(clock * 9 + seed) * .6 + Math.sin(clock * 23 + seed * 2) * .4) * amt;

    function lights(W) {
      const out = [], p = W.player;
      if (!p.dead) { const f = LF.flamePos(p); out.push({ x: f.x, y: f.y, r: 150 * flick(0, .03) }); }
      for (const l of W.lanterns) if (l.lit) out.push({ x: l.x, y: l.y, r: (200 + l.pop * 60) * flick(l.f, .04) });
      if (W.door && W.door.glow > 0) out.push({ x: W.door.x + 16, y: W.door.y + 30, r: 130 * W.door.glow });
      for (const b of W.projectiles) out.push({ x: b.x + 5, y: b.y + 5, r: 60 });
      for (const e of W.enemies) if (e.alive && e.type === 'S') out.push({ x: e.x + 12, y: e.y + 2, r: 34 });
      return out;
    }

    function drawDarkness(W, cam) {
      const sc = R.scale(cam);
      dctx.setTransform(1, 0, 0, 1, 0, 0);
      dctx.globalCompositeOperation = 'source-over';
      dctx.clearRect(0, 0, R.W, R.H);
      dctx.fillStyle = `rgba(9,7,24,${W.dark})`;
      dctx.fillRect(0, 0, R.W, R.H);
      dctx.globalCompositeOperation = 'destination-out';
      for (const li of lights(W)) {
        const sx = (li.x - cam.x) * sc, sy = (li.y - cam.y) * sc, r = li.r * sc;
        if (sx + r < 0 || sy + r < 0 || sx - r > R.W || sy - r > R.H) continue;
        const g = dctx.createRadialGradient(sx, sy, 0, sx, sy, r);
        g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(.45, 'rgba(0,0,0,.75)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        dctx.fillStyle = g; dctx.fillRect(sx - r, sy - r, r * 2, r * 2);
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(dark, 0, 0);
    }

    function drawEmissive(W, cam, opts) {
      worldTransform(W, cam, opts);
      ctx.globalCompositeOperation = 'lighter';
      for (const li of lights(W)) {
        if (li.r < 50) continue;
        const g = ctx.createRadialGradient(li.x, li.y, 0, li.x, li.y, li.r * .55);
        g.addColorStop(0, 'rgba(255,160,70,.2)'); g.addColorStop(1, 'rgba(255,160,70,0)');
        ctx.fillStyle = g; ctx.fillRect(li.x - li.r, li.y - li.r, li.r * 2, li.r * 2);
      }
      ctx.globalCompositeOperation = 'source-over';

      for (const l of W.lanterns) {
        if (l.lit) {
          ctx.globalAlpha = Math.min(1, .85 * flick(l.f, .08)); ctx.fillStyle = '#FFB547'; ctx.fillRect(l.x - 5, l.y - 7, 10, 14);
          ctx.globalAlpha = 1; ctx.fillStyle = '#FFF1CF'; ctx.fillRect(l.x - 1.5, l.y - 2, 3, 5);
        } else {
          const pulse = reduced ? .5 : .35 + .25 * Math.sin(clock * 2.5 + l.f);
          ctx.strokeStyle = `rgba(217,208,240,${pulse})`; ctx.lineWidth = 1;
          ctx.strokeRect(l.x - 7.5, l.y - 9.5, 15, 19);
        }
      }
      ctx.globalAlpha = 1;

      for (const e of W.enemies) {
        if (!e.alive) continue;
        const cx = e.x + e.w / 2, by = e.y + e.h, f = e.face || -1;
        ctx.fillStyle = '#FF6B3D';
        if (e.type === 'B') { ctx.fillRect(cx + f * 8 - 1.5, by - 9, 3, 3); ctx.fillRect(cx + f * 4 - 1.5, by - 10, 3, 3); }
        else if (e.type === 'K') { ctx.fillRect(cx + f * 10 - 1, by - 8, 2, 2); }
        else if (e.type === 'F') { ctx.fillRect(cx - 3, e.y + 6, 2, 2); ctx.fillRect(cx + 1, e.y + 6, 2, 2); }
        else if (e.type === 'S') {
          const charge = Math.max(0, 1 - e.cool / 2.3);
          ctx.fillStyle = `rgba(255,181,71,${.45 + charge * .55})`; ctx.fillRect(cx - 9, by - 22, 18, 3);
        } else if (e.type === 'G') {
          const a = .6 * (1 - e.fade * .8);
          const wy = e.y, bob = reduced ? 0 : Math.sin(clock * 3 + e.ox) * 3;
          ctx.fillStyle = `rgba(201,210,240,${a})`;
          ctx.beginPath(); ctx.moveTo(cx - 12, wy + 28 + bob); ctx.lineTo(cx - 12, wy + 12 + bob);
          ctx.arc(cx, wy + 12 + bob, 12, Math.PI, 0);
          for (let k = 0; k <= 4; k++) ctx.lineTo(cx + 12 - k * 6, wy + 28 + bob - (k % 2 ? 5 : 0) + (reduced ? 0 : Math.sin(clock * 6 + k) * 1.5));
          ctx.fill();
          ctx.fillStyle = `rgba(14,12,34,${a + .2})`;
          ctx.beginPath(); ctx.ellipse(cx + f * 3 - 4, wy + 12 + bob, 2.5, 3.5, 0, 0, TAU); ctx.ellipse(cx + f * 3 + 4, wy + 12 + bob, 2.5, 3.5, 0, 0, TAU); ctx.fill();
        }
      }
      for (const b of W.projectiles) {
        ctx.fillStyle = '#FF6B3D'; ctx.beginPath(); ctx.arc(b.x + 5, b.y + 5, 5, 0, TAU); ctx.fill();
        ctx.fillStyle = '#FFE2A8'; ctx.beginPath(); ctx.arc(b.x + 5, b.y + 5, 2.2, 0, TAU); ctx.fill();
      }
      const d = W.door;
      if (d && d.glow > 0) {
        ctx.globalAlpha = d.glow;
        const g = ctx.createLinearGradient(0, d.y, 0, d.y + d.h);
        g.addColorStop(0, '#FFE2A8'); g.addColorStop(1, '#FF6B3D');
        ctx.fillStyle = g; doorPath(d, 3); ctx.fill();
        ctx.globalAlpha = 1;
      }
      const p = W.player;
      if (!p.dead && !opts.hidePlayer) {
        const f = LF.flamePos(p), k = flick(3, .15);
        ctx.fillStyle = '#FF6B3D'; ctx.beginPath(); ctx.ellipse(f.x, f.y, 3.4 * k, 4.8 * k, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#FFE2A8'; ctx.beginPath(); ctx.ellipse(f.x, f.y + 1, 1.6, 2.4, 0, 0, TAU); ctx.fill();
      }
      drawParticles(W, true);
      ctx.font = '600 10px "Martian Mono", ui-monospace, Menlo, monospace';
      ctx.textAlign = 'center';
      for (const fl of W.floaters) {
        ctx.globalAlpha = Math.min(1, fl.life * 2); ctx.fillStyle = fl.c; ctx.fillText(fl.t, fl.x, fl.y);
      }
      ctx.globalAlpha = 1; ctx.textAlign = 'left';
    }

    function drawEditOverlay(W, cam, opts) {
      const { x0, x1, y0, y1 } = visibleRange(W, cam);
      const sc = R.scale(cam);
      ctx.strokeStyle = 'rgba(217,208,240,.09)'; ctx.lineWidth = 1 / sc;
      ctx.beginPath();
      for (let x = x0; x <= x1 + 1; x++) { ctx.moveTo(x * TS, y0 * TS); ctx.lineTo(x * TS, (y1 + 1) * TS); }
      for (let y = y0; y <= y1 + 1; y++) { ctx.moveTo(x0 * TS, y * TS); ctx.lineTo((x1 + 1) * TS, y * TS); }
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,181,71,.7)'; ctx.lineWidth = 2 / sc;
      ctx.strokeRect(0, 0, W.w * TS, W.h * TS);
      if (opts.hover) {
        const { tx, ty } = opts.hover;
        ctx.fillStyle = 'rgba(255,181,71,.18)'; ctx.fillRect(tx * TS, ty * TS, TS, TS);
        ctx.strokeStyle = '#FFB547'; ctx.strokeRect(tx * TS, ty * TS, TS, TS);
      }
    }

    R.render = (W, cam, opts = {}, dt = 0) => {
      clock += dt;
      drawSky(W, cam);
      worldTransform(W, cam, opts);
      if (W.def.signs) {
        ctx.font = '600 9px "Martian Mono", ui-monospace, Menlo, monospace';
        ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(217,208,240,.62)';
        for (const s of W.def.signs) ctx.fillText(s.t, s.x * TS, s.y * TS);
        ctx.textBaseline = 'alphabetic';
      }
      drawTiles(W, cam, opts);
      drawPlats(W);
      drawDoor(W.door);
      for (const l of W.lanterns) drawLantern(l);
      for (const e of W.enemies) drawEnemy(e);
      if (!opts.hidePlayer) drawPlayer(W.player);
      drawParticles(W, false);
      if (opts.edit) {
        drawEmissive(W, cam, opts);
        worldTransform(W, cam, opts);
        drawEditOverlay(W, cam, opts);
      } else {
        drawDarkness(W, cam);
        drawEmissive(W, cam, opts);
      }
    };

    return R;
  };
})();
