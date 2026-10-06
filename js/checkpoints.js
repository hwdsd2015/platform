// Lanternfall: one lantern per level. Lanterns are checkpoints (and the door opens once
// they're lit): a regular level keeps just one, the one nearest halfway between the start
// and the door; the rest go. (Towers get two and the castle three, in bosses.js.) Load
// after the levels-*.js files and before bosses.js.
(() => {
  const LF = window.LF;
  for (const lv of LF.LEVELS) {
    const g = LF.normalize(lv.map).map(row => row.split(''));
    const at = c => { for (let y = 0; y < g.length; y++) { const x = g[y].indexOf(c); if (x >= 0) return { x, y }; } return null; };
    const P = at('P'), D = at('D'), lamps = [];
    g.forEach((row, y) => row.forEach((c, x) => { if (c === 'L') lamps.push({ x, y }); }));
    if (!P || !D || lamps.length < 2) continue;
    // How far from halfway: a lantern equally far from the start and the door scores 0.
    const off = l => { const a = Math.hypot(l.x - P.x, l.y - P.y), b = Math.hypot(l.x - D.x, l.y - D.y); return Math.abs(a - b) / (a + b); };
    const keep = lamps.reduce((best, l) => (off(l) < off(best) ? l : best));
    for (const l of lamps) if (l !== keep) g[l.y][l.x] = g[l.y - 1]?.[l.x] === '~' ? '~' : '.';
    lv.map = g.map(row => row.join(''));
  }
})();
